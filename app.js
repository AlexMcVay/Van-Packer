// Utility selector
const $ = s => document.querySelector(s);
const threeContainer = $("#three-container");

let container = null,
    items = [],
    cushions = [];

function showSection(selector, show) {
  $(selector).style.display = show ? "" : "none";
}

$("#btnSetContainer").onclick = () => {
  const name = $("#container-name").value.trim();
  const dims = [
    +$("#container-l").value,
    +$("#container-w").value,
    +$("#container-h").value,
  ];
  const maxWeight = +$("#container-maxw").value;

  console.log(name, dims, maxWeight);

  showSection("#containerSection", false);
  showSection("#itemSection", true);
  showSection("#packingSection", true);

  if (!name || dims.some(d => isNaN(d) || d < 1) || isNaN(maxWeight) || maxWeight < 1) {
    alert("Please fill container details correctly.");
    return;
  }
  container = { name, dims, maxWeight };
  showSection("#containerSection", false);
  showSection("#itemSection", true);
  showSection("#packingSection", false);
  $("#packingStatus").textContent = "";
};

$("#btnAddItem").onclick = () => {
  const shape = $("#item-shape").value;
  const name = $("#item-name").value.trim();
  const dims = [
    +$("#item-l").value,
    +$("#item-w").value,
    +$("#item-h").value,
  ];
  const weight = +$("#item-weight").value;
  const qty = +$("#item-qty").value;
  const fragile = $("#item-fragile").checked;
  const isCushion = $("#item-cushion").checked;

  if (!name || dims.some(d => isNaN(d) || d < 1) || isNaN(weight) || isNaN(qty) || weight < 0 || qty < 1) {
    alert("Please fill item details correctly.");
    return;
  }

  items.push({ name, shape, dims, weight, qty, fragile, isCushion });
  updateItemsTable();
  $("#item-form").reset();
};

function updateItemsTable() {
  const tbody = $("#items-table tbody");
  tbody.innerHTML = "";
  items.forEach(i => {
    tbody.innerHTML += `<tr>
      <td>${i.name}</td>
      <td>${i.shape}</td>
      <td>${i.dims.join("×")}</td>
      <td>${i.weight.toFixed(2)}</td>
      <td>${i.qty}</td>
      <td>${i.fragile ? "Yes" : "No"}</td>
      <td>${i.isCushion ? "Yes" : "No"}</td>
    </tr>`;
  });
}

// Auto-add cushions around fragile items
function addAutoCushions(packItems) {
  let autoCushions = [];
  packItems.forEach(item => {
    if (item.fragile && !item.isCushion) {
      const qty = item.qty * 6; // naive surround count
      autoCushions.push({
        name: `Cushion_for_${item.name}`,
        shape: "box",
        dims: [1,1,1],
        weight: 0.5,
        qty,
        fragile: false,
        isCushion: true
      });
    }
  });
  return autoCushions;
}

// Simple volume sort and greedy placement from back-bottom-left to front-top-right
function packItems(allItems, container) {
  const cL = container.dims[0], cW = container.dims[1], cH = container.dims[2];
  // 3D occupancy grid
  const grid = Array.from({ length: cL }, () =>
    Array.from({ length: cW }, () =>
      Array(cH).fill(null)
    )
  );

  const placed = [];
  let usedWeight = 0;

  let sorted = allItems.slice().sort((a,b) =>
    (b.dims[0] * b.dims[1] * b.dims[2]) - (a.dims[0] * a.dims[1] * a.dims[2])
  );

  for (const item of sorted) {
    for (let q = 0; q < item.qty; q++) {
      let placedOne = false;

      // No rotation of odd-shaped items for simplicity
      let positions =
        item.shape === "box" || item.isCushion
          ? getPermutedPositionsForBox(item, cL, cW, cH)
          : getPositionsForOddShape(item, cL, cW, cH);

      for (const {x,y,z,L,W,H} of positions) {
        if (canPlace(grid, x, y, z, L, W, H)) {
          if (usedWeight + item.weight > container.maxWeight) break;
          place(grid, x, y, z, L, W, H, item.name);
          placed.push({ item, pos: [x, y, z], size: [L,W,H] });
          usedWeight += item.weight;
          placedOne = true;
          break;
        }
      }
      if (!placedOne) {
        $("#packingStatus").textContent += `Could not place ${item.name}. `;
      }
    }
  }
  return placed;
}

function getPermutedPositionsForBox(item, cL, cW, cH) {
  // Generate all dimension permutations and all positions
  let dimsPerm = permuteDims(item.dims);
  const positions = [];
  for (const [L,W,H] of dimsPerm) {
    for (let z=0; z<=cH-H; z++)
    for (let x=0; x<=cL-L; x++)
    for (let y=0; y<=cW-W; y++) {
      positions.push({x,y,z,L,W,H});
    }
  }
  return positions;
}

function getPositionsForOddShape(item, cL, cW, cH) {
  const [L,W,H] = item.dims;
  const positions = [];
  for(let z=0; z<=cH-H; z++)
  for(let x=0; x<=cL-L; x++)
  for(let y=0; y<=cW-W; y++) {
    positions.push({x,y,z,L:Math.ceil(L),W:Math.ceil(W),H:Math.ceil(H)});
  }
  return positions;
}

function permuteDims([a,b,c]) {
  let perms = [
    [a,b,c],[a,c,b],[b,a,c],[b,c,a],[c,a,b],[c,b,a]
  ];
  let unique = [];
  let add = arr => {
    if (!unique.some(u=>u[0] === arr[0] && u[1] === arr[1] && u[2] === arr[2])) unique.push(arr);
  };
  perms.forEach(add);
  return unique;
}

function canPlace(grid, x, y, z, L, W, H) {
  for(let i=0; i<L; i++)
  for(let j=0; j<W; j++)
  for(let k=0; k<H; k++) {
    if (grid[x+i][y+j][z+k]) return false;
  }
  return true;
}

function place(grid, x, y, z, L, W, H, name) {
  for(let i=0; i<L; i++)
  for(let j=0; j<W; j++)
  for(let k=0; k<H; k++) {
    grid[x+i][y+j][z+k] = name;
  }
}

// Colors per item characteristic
function colorForItem(p) {
  if (p.item.isCushion) return 0xffc285;
  if (p.item.fragile) return 0xee6666;
  if (p.item.shape === "sofa") return 0xb48ddb;
  if (p.item.shape === "chair") return 0xf7a47a;
  if (p.item.shape === "table") return 0x8debf7;
  return 0x87ceeb; // box
}

// Generate three.js mesh for shapes
function generateMesh(item) {
  const color = colorForItem({item});
  let geometry;
  if (item.shape === "box" || item.isCushion) {
    geometry = new THREE.BoxGeometry(item.dims[0], item.dims[2], item.dims[1]); // re-arranged dims for correct 3D orientation
  } else {
    // Approximated geometry for odd shapes
    switch(item.shape) {
      case "sofa":
        geometry = new THREE.ShapeGeometry(createLShape(item.dims));
        break;
      case "table":
        geometry = new THREE.ShapeGeometry(createOctagon(item.dims));
        break;
      case "chair":
        geometry = new THREE.ShapeGeometry(createHexagon(item.dims));
        break;
      default:
        geometry = new THREE.BoxGeometry(item.dims[0], item.dims[2], item.dims[1]);
    }
  }
  let material = new THREE.MeshPhongMaterial({ color, shininess: 80 });
  let mesh = new THREE.Mesh(geometry, material);
  // Adjust rotation and position for odd shape floor shape (shape geometries are 2D, so raise the mesh to height)
  if (geometry.type === "ShapeGeometry") {
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = item.dims[2] / 2;
  } else {
    // Box geometry placed centered around y
    mesh.position.y = item.dims[2] / 2;
  }
  return mesh;
}

function createLShape(dims) {
  const [L, W] = dims;
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(L*0.7, 0);
  shape.lineTo(L*0.7, W*0.5);
  shape.lineTo(L, W*0.5);
  shape.lineTo(L, W);
  shape.lineTo(0, W);
  shape.lineTo(0, 0);
  return shape;
}

function createOctagon(dims) {
  const [L, W] = dims;
  const shape = new THREE.Shape();
  shape.moveTo(L*0.1, 0);
  shape.lineTo(L*0.9, 0);
  shape.lineTo(L, W*0.2);
  shape.lineTo(L, W*0.8);
  shape.lineTo(L*0.9, W);
  shape.lineTo(L*0.1, W);
  shape.lineTo(0, W*0.8);
  shape.lineTo(0, W*0.2);
  shape.lineTo(L*0.1, 0);
  return shape;
}

function createHexagon(dims) {
  const [L, W] = dims;
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(L * 0.6, 0);
  shape.lineTo(L, W * 0.6);
  shape.lineTo(L, W);
  shape.lineTo(L * 0.4, W);
  shape.lineTo(0, W * 0.6);
  shape.lineTo(0, 0);
  return shape;
}

// Main visualization setup

function clearThree(container) {
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
}

let scene, camera, renderer, controls;

function initThree(container, width, height) {
  clearThree(container);
  scene = new THREE.Scene();

  // Camera
  const aspect = width / height;
  const d = 20;
  camera = new THREE.OrthographicCamera(
    -d * aspect, d * aspect,
    d, -d,
    0.1, 1000
  );

  // Isometric-like camera position and rotation
  camera.position.set(30, 30, 30);
  camera.lookAt(0, 0, 0);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  container.appendChild(renderer.domElement);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0x888888);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(30, 40, 10);
  scene.add(directionalLight);

  // Axes helper
  // scene.add(new THREE.AxesHelper(10));
}

function drawContainer(containerDims) {
  const [L, W, H] = containerDims;
  const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(L, H, W));
  const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x153a5b, linewidth: 2 }));
  line.position.set(L / 2, H / 2, W / 2);
  scene.add(line);
}

function drawPacked(placements) {
  placements.forEach(p => {
    for (let i = 0; i < p.size[0]; ++i) {
      for (let j = 0; j < p.size[1]; ++j) {
        for (let k = 0; k < p.size[2]; ++k) {
          // We render one mesh per item (skip subdividing smaller cubes for performance)
          // We'll create 1 mesh per item placed at position (pos)
          if (i === 0 && j === 0 && k === 0) {
            const mesh = generateMesh(p.item);
            // Position: x, y, z corrected for Three.js y-axis up
            mesh.position.set(p.pos[0] + p.size[0]/2, p.pos[2] + p.size[2]/2, p.pos[1] + p.size[1]/2);
            scene.add(mesh);
          }
        }
      }
    }
  });
}

function render() {
  requestAnimationFrame(render);
  renderer.render(scene, camera);
}

// Pack button click event
$("#btnPack").onclick = () => {
  if (!container) { alert("Please set container first."); return; }
  cushions = addAutoCushions(items.filter(i => !i.isCushion));
  const allItems = items.concat(cushions);
  const placements = packItems(allItems, container);

  showSection("#packingSection", true);

  initThree(threeContainer, 900, 400);
  drawContainer(container.dims);
  drawPacked(placements);

  render();

  $("#packingStatus").textContent = `Packed ${placements.length} items.`;
};

// Export/import
$("#btnExport").onclick = () => {
  if (!container) { alert("Set container first."); return; }
  let data = { container, items };
  let url = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
  let a = document.createElement("a");
  a.href = url;
  a.download = "van_packing.json";
  a.click();
};

$("#import-file").onchange = event => {
  const reader = new FileReader();
  reader.onload = e => {
    const data = JSON.parse(e.target.result);
    container = data.container;
    items = data.items;
    $("#container-name").value = container.name;
    $("#container-l").value = container.dims[0];
    $("#container-w").value = container.dims[1];
    $("#container-h").value = container.dims[2];
    $("#container-maxw").value = container.maxWeight;
    updateItemsTable();

    showSection("#containerSection", false);
    showSection("#itemSection", true);
    showSection("#packingSection", false);
    $("#packingStatus").textContent = "Imported JSON successfully.";
  };
  reader.readAsText(event.target.files[0]);
};

// Initial UI state
showSection("#itemSection", false);
showSection("#packingSection", false);
