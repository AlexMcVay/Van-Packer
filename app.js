let container = null,
  items = [],
  cushions = [];

function setContainer() {
  const name = document.getElementById("container-name").value.trim();
  const dims = [
    parseInt(document.getElementById("container-l").value),
    parseInt(document.getElementById("container-w").value),
    parseInt(document.getElementById("container-h").value),
  ];
  const maxw = parseFloat(document.getElementById("container-maxw").value);
  if (!name || dims.some(isNaN) || isNaN(maxw)) {
    alert("Please fill container details correctly.");
    return;
  }
  container = { name: name, dims: dims, max_weight: maxw };
  alert(`Container "${name}" set.`);
  document.getElementById("container-form").style.display = "none";
  document.getElementById("item-form").style.display = "block";
}

function addItem() {
  const name = document.getElementById("item-name").value.trim();
  const dims = [
    parseInt(document.getElementById("item-l").value),
    parseInt(document.getElementById("item-w").value),
    parseInt(document.getElementById("item-h").value),
  ];
  const weight = parseFloat(document.getElementById("item-weight").value);
  const qty = parseInt(document.getElementById("item-qty").value);
  const fragile = document.getElementById("item-fragile").checked;
  const cushion = document.getElementById("item-cushion").checked;

  if (!name || dims.some(isNaN) || isNaN(weight) || isNaN(qty)) {
    alert("Please fill item details correctly.");
    return;
  }
  items.push({ name, dims, weight, qty, fragile, is_cushion: false });
  updateItemsTable();
  // clear fields
  document.getElementById("item-form").reset();
}

function updateItemsTable() {
  const tbody = document.querySelector("#items-table tbody");
  tbody.innerHTML = "";
  items.forEach((i) => {
    tbody.innerHTML += `<tr>
      <td>${i.name}</td>
      <td>${i.dims.join("×")}</td>
      <td>${i.weight.toFixed(2)}</td>
      <td>${i.qty}</td>
      <td>${i.fragile ? "Yes" : "No"}</td>
      <td>${i.is_cushion ? "Yes" : "No"}</td>
    </tr>`;
  });
}

// Simple permutations of dimensions for rotation (excluding fragile which keeps fixed)
function permuteDims([a, b, c]) {
  let perms = [
    [a, b, c],
    [a, c, b],
    [b, a, c],
    [b, c, a],
    [c, a, b],
    [c, b, a],
  ];
  let unique = [];
  let add = (arr) => {
    if (!unique.some((u) => u[0] === arr[0] && u[1] === arr[1] && u[2] === arr[2]))
      unique.push(arr);
  };
  perms.forEach(add);
  return unique;
}

// Add cushions around fragile items
function addCushions() {
  cushions = [];
  // Each fragile item spawns 6 cushions (on sides L, W, H dimensions)
  items.forEach((item) => {
    if (item.fragile) {
      const cushionName = `Cushion_for_${item.name}`;
      const cushionQty = item.qty * 6; // simplistic assumption
      const cushionSize = [1, 1, 1];
      const cushionWeight = 0.5;

      cushions.push({
        name: cushionName,
        dims: cushionSize,
        weight: cushionWeight,
        qty: cushionQty,
        fragile: false,
        is_cushion: true,
      });
    }
  });
}

function pack() {
  if (!container) {
    alert("Set container first.");
    return;
  }

  addCushions();

  // Merge items and cushions
  const allItems = items.concat(cushions);

  // Greedy packing on ground layer (2D)
  const cL = container.dims[0],
    cW = container.dims[1];
  let grid = Array.from({ length: cL }, () => Array(cW).fill(null));
  let placed = 0;
  let used_weight = 0;

  // Sort by volume descending
  const sorted = allItems.slice().sort(
    (a, b) =>
      b.dims[0] * b.dims[1] * b.dims[2] - a.dims[0] * a.dims[1] * a.dims[2]
  );

  let placements = [];

  for (const item of sorted) {
    for (let q = 0; q < item.qty; q++) {
      let orientations = item.fragile ? [item.dims] : permuteDims(item.dims);
      let didPlace = false;

      for (const [L, W, H] of orientations) {
        for (let x = 0; x <= cL - L; x++) {
          for (let y = 0; y <= cW - W; y++) {
            let fits = true;
            for (let dx = 0; dx < L; dx++)
              for (let dy = 0; dy < W; dy++)
                if (grid[x + dx][y + dy]) fits = false;
            if (fits && used_weight + item.weight <= container.max_weight) {
              for (let dx = 0; dx < L; dx++)
                for (let dy = 0; dy < W; dy++) grid[x + dx][y + dy] = item.name;
              used_weight += item.weight;
              placements.push({ item, pos: [x, y, 0], size: [L, W, H] });
              placed++;
              didPlace = true;
              break;
            }
          }
          if (didPlace) break;
        }
        if (didPlace) break;
      }
      if (!didPlace) alert(`Could not place item: ${item.name}`);
    }
  }

  drawLayer(placements);

  alert(`Placed items: ${placed}. Total weight: ${used_weight.toFixed(2)} kg.`);
}

function drawLayer(placements) {
  const can = document.getElementById("van-canvas");
  const ctx = can.getContext("2d");
  ctx.clearRect(0, 0, can.width, can.height);

  let cL = container.dims[0],
    cW = container.dims[1];
  let cell = Math.min(can.width / cL, can.height / cW);

  placements.forEach(({ item, pos, size }) => {
    const [x, y] = pos;
    const [L, W] = size;
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    ctx.fillStyle = item.is_cushion ? "#ffcc99" : "#87ceeb"; // Cushions in orange, others blue
    ctx.fillRect(x * cell, y * cell, L * cell, W * cell);
    ctx.strokeRect(x * cell, y * cell, L * cell, W * cell);
    ctx.fillStyle = "#000";
    ctx.font = "14px Arial";
    ctx.fillText(item.name, x * cell + 4, y * cell + 16);
  });
}

function exportData() {
  if (!container) {
    alert("Set container first.");
    return;
  }
  let data = { container, items };
  let url = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
  let a = document.createElement("a");
  a.href = url;
  a.download = "van_packing.json";
  a.click();
}

function importData(event) {
  let file = event.target.files[0];
  let reader = new FileReader();
  reader.onload = function () {
    let data = JSON.parse(reader.result);
    container = data.container;
    items = data.items;
    // Populate container form fields
    document.getElementById("container-name").value = container.name;
    document.getElementById("container-l").value = container.dims[0];
    document.getElementById("container-w").value = container.dims[1];
    document.getElementById("container-h").value = container.dims[2];
    document.getElementById("container-maxw").value = container.max_weight;
    updateItemsTable();
    alert("Data imported");
  };
  reader.readAsText(file);
}
