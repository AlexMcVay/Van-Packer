import tkinter as tk
from tkinter import ttk, filedialog, messagebox
import json
import itertools

# Item class with cushions flagging fragile neighbors
class Item:
    def __init__(self, name, dims, weight, qty, fragile):
        self.name = name
        self.dims = dims  # (L, W, H)
        self.weight = weight
        self.qty = qty
        self.fragile = fragile
        self.is_cushion = False  # To mark if item is a cushion added for fragile protection

    def orientations(self):
        return [self.dims] if self.fragile else list(set(itertools.permutations(self.dims, 3)))

class Container:
    def __init__(self, name, dims, max_weight):
        self.name = name
        self.dims = dims  # (L, W, H)
        self.max_weight = max_weight

class PackingPlanner:
    def __init__(self):
        self.items = []
        self.container = None
        self.placements = []
        self.layer_grid = []

    def set_container(self, name, dims, max_weight):
        self.container = Container(name, dims, max_weight)

    def add_item(self, name, dims, weight, qty, fragile):
        self.items.append(Item(name, dims, weight, qty, fragile))

    def export_json(self, filename):
        if self.container is None:
            messagebox.showerror("Export Error", "No container defined. Please set the container before exporting.")
            return
        data = {
            'container': {
                'name': self.container.name,
                'dims': self.container.dims,
                'max_weight': self.container.max_weight
            },
            'items': [{
                'name': i.name,
                'dims': i.dims,
                'weight': i.weight,
                'qty': i.qty,
                'fragile': i.fragile,
                'is_cushion': i.is_cushion
            } for i in self.items]
        }
        with open(filename, 'w') as f:
            json.dump(data, f, indent=4)
        messagebox.showinfo("Export Complete", f"Data exported to {filename}")

    def import_json(self, filename):
        with open(filename, 'r') as f:
            data = json.load(f)
        c = data['container']
        self.set_container(c['name'], tuple(c['dims']), c['max_weight'])
        self.items = []
        for i in data['items']:
            it = Item(i['name'], tuple(i['dims']), i['weight'], i['qty'], i['fragile'])
            it.is_cushion = i.get('is_cushion', False)
            self.items.append(it)
        messagebox.showinfo("Import Complete", f"Data imported from {filename}")

    def pack_items(self):
        if not self.container:
            return False, "No container defined."
        cL, cW, cH = self.container.dims
        self.placements.clear()
        self.layer_grid = [[None for _ in range(cW)] for _ in range(cL)]

        # Automatically add cushions around fragile items
        cushions = []
        cushion_size = (1, 1, 1)
        cushion_weight = 0.5  # light weight

        # For each fragile item, add cushions around it
        for item in self.items:
            if item.fragile:
                # Add cushion items named like cushion_for_ItemName
                cushion_name = f"Cushion_for_{item.name}"
                cushions.append(Item(cushion_name, cushion_size, cushion_weight, item.qty * 6, False))

        all_items = self.items + cushions

        items_sorted = sorted(all_items, key=lambda i: i.dims[0]*i.dims[1]*i.dims[2], reverse=True)
        used_weight = 0

        space = [[[False for _ in range(int(cH))] for _ in range(int(cW))] for _ in range(int(cL))]

        def can_place(space, x, y, z, L, W, H):
            for i in range(L):
                for j in range(W):
                    for k in range(H):
                        if space[x+i][y+j][z+k]:
                            return False
            return True

        def place(space, x, y, z, L, W, H):
            for i in range(L):
                for j in range(W):
                    for k in range(H):
                        space[x+i][y+j][z+k] = True

        for item in items_sorted:
            for _ in range(item.qty):
                placed = False
                for orientation in item.orientations():
                    L, W, H = map(int, orientation)
                    for x in range(cL - L + 1):
                        for y in range(cW - W + 1):
                            for z in range(cH - H + 1):
                                if can_place(space, x, y, z, L, W, H):
                                    if used_weight + item.weight <= self.container.max_weight:
                                        place(space, x, y, z, L, W, H)
                                        self.placements.append({
                                            "item": item.name,
                                            "position": (x, y, z),
                                            "size": (L, W, H),
                                            "is_cushion": item.is_cushion,
                                            "fragile": item.fragile
                                        })
                                        used_weight += item.weight
                                        placed = True
                                        break
                            if placed:
                                break
                        if placed:
                            break
                    if placed:
                        break
                if not placed:
                    messagebox.showwarning("Packing Warning", f"Could not place item: {item.name}")
        return True, f"Packed {len(self.placements)} items. Total weight: {used_weight:.2f}kg"

class VanPackingGUI:
    def __init__(self, root):
        self.root = root
        self.planner = PackingPlanner()
        self.style = ttk.Style()
        self.style.theme_use("clam")
        self.setup_gui()

    def setup_gui(self):
        self.root.title("Van Packing Optimizer with Cushions")
        self.root.geometry("1000x500")
        self.root.configure(bg="#f0f4f8")
        frm = ttk.Frame(self.root, padding=10)
        frm.pack(side=tk.LEFT, fill=tk.Y)

        # Container properties
        ttk.Label(frm, text="Container Name:").grid(row=0, column=0, sticky="w")
        self.container_name = ttk.Entry(frm)
        self.container_name.grid(row=0, column=1, pady=2)
        ttk.Label(frm, text="Dimensions (L W H):").grid(row=1, column=0, sticky="w")
        self.container_dims = [ttk.Entry(frm, width=5) for _ in range(3)]
        for i, e in enumerate(self.container_dims):
            e.grid(row=1, column=i+1, pady=2)
        ttk.Label(frm, text="Max Weight (kg):").grid(row=2, column=0, sticky="w")
        self.container_weight = ttk.Entry(frm)
        self.container_weight.grid(row=2, column=1, pady=2)
        ttk.Button(frm, text="Set Container", command=self.set_container).grid(row=3, column=0, columnspan=4, pady=6)

        # Item properties
        ttk.Separator(frm).grid(row=4, column=0, columnspan=4, sticky="ew", pady=8)
        ttk.Label(frm, text="Item Name:").grid(row=5, column=0, sticky="w")
        self.item_name = ttk.Entry(frm)
        self.item_name.grid(row=5, column=1, pady=2)
        ttk.Label(frm, text="Dimensions (L W H):").grid(row=6, column=0, sticky="w")
        self.item_dims = [ttk.Entry(frm, width=5) for _ in range(3)]
        for i, e in enumerate(self.item_dims):
            e.grid(row=6, column=i+1, pady=2)
        ttk.Label(frm, text="Weight (kg):").grid(row=7, column=0, sticky="w")
        self.item_weight = ttk.Entry(frm, width=7)
        self.item_weight.grid(row=7, column=1, pady=2)
        ttk.Label(frm, text="Quantity:").grid(row=8, column=0, sticky="w")
        self.item_qty = ttk.Entry(frm, width=7)
        self.item_qty.grid(row=8, column=1, pady=2)
        self.item_fragile_var = tk.IntVar()
        ttk.Checkbutton(frm, text="Fragile", variable=self.item_fragile_var).grid(row=9, column=0, columnspan=2, sticky="w")
        ttk.Button(frm, text="Add Item", command=self.add_item).grid(row=10, column=0, columnspan=4, pady=6)

        # Packing actions
        ttk.Separator(frm).grid(row=11, column=0, columnspan=4, sticky="ew", pady=8)
        ttk.Button(frm, text="Pack Items", command=self.pack_items).grid(row=12, column=0, columnspan=4, pady=6)
        ttk.Button(frm, text="Export JSON", command=self.export_json).grid(row=13, column=0, columnspan=4, pady=6)
        ttk.Button(frm, text="Import JSON", command=self.import_json).grid(row=14, column=0, columnspan=4, pady=6)

        # Item List
        self.item_tree = ttk.Treeview(frm, columns=("Name", "Dims", "Weight", "Qty", "Fragile", "Cushion"), show="headings", height=8)
        for col in self.item_tree["columns"]:
            self.item_tree.heading(col, text=col)
            self.item_tree.column(col, anchor=tk.CENTER, width=80)
        self.item_tree.grid(row=15, column=0, columnspan=4, pady=10)

        # Visualization canvas
        self.canvas = tk.Canvas(self.root, width=600, height=450, bg="white", highlightthickness=1, highlightbackground="#666")
        self.canvas.pack(side=tk.RIGHT, padx=15, pady=15)

    def set_container(self):
        try:
            name = self.container_name.get()
            dims = tuple(int(e.get()) for e in self.container_dims)
            max_weight = float(self.container_weight.get())
            self.planner.set_container(name, dims, max_weight)
            messagebox.showinfo("Container Set", f"Container '{name}' set with size {dims} and max weight {max_weight} kg")
        except Exception as e:
            messagebox.showerror("Error", f"Invalid container data: {e}")

    def add_item(self):
        try:
            name = self.item_name.get()
            dims = tuple(int(e.get()) for e in self.item_dims)
            weight = float(self.item_weight.get())
            qty = int(self.item_qty.get())
            fragile = bool(self.item_fragile_var.get())
            self.planner.add_item(name, dims, weight, qty, fragile)
            self.item_tree.insert("", "end", values=(name, dims, weight, qty, fragile, "No"))
        except Exception as e:
            messagebox.showerror("Error", f"Invalid item data: {e}")

    def export_json(self):
        fname = filedialog.asksaveasfilename(defaultextension=".json", filetypes=[("JSON files","*.json")])
        if fname:
            self.planner.export_json(fname)

    def import_json(self):
        fname = filedialog.askopenfilename(defaultextension=".json", filetypes=[("JSON files","*.json")])
        if fname:
            self.planner.import_json(fname)
            # Refresh item list
            self.item_tree.delete(*self.item_tree.get_children())
            for item in self.planner.items:
                cushion_text = "Yes" if item.is_cushion else "No"
                self.item_tree.insert("", "end", values=(item.name, item.dims, item.weight, item.qty, item.fragile, cushion_text))

    def pack_items(self):
        success, msg = self.planner.pack_items()
        messagebox.showinfo("Packing Result", msg)
        self.draw_layers()

    def draw_layers(self):
        self.canvas.delete("all")
        if not self.planner.container:
            return
        cL = self.planner.container.dims[0]
        cW = self.planner.container.dims[1]
        cH = self.planner.container.dims[2]
        cell_size = min(self.canvas.winfo_width()//cL, self.canvas.winfo_height()//cW)
        # Draw ground layer slice z=0
        placements = [p for p in self.planner.placements if p["position"][2] == 0]
        for p in placements:
            x0 = p["position"][0] * cell_size
            y0 = p["position"][1] * cell_size
            L, W, _ = p["size"]
            color = "#87ceeb" if not p.get("is_cushion", False) else "#ffddcc"
            outline = "#ff4500" if p.get("fragile", False) else "#000000"
            self.canvas.create_rectangle(x0, y0, x0+L*cell_size, y0+W*cell_size, fill=color, outline=outline, width=2)
            label = p["item"]
            self.canvas.create_text(x0 + (L*cell_size)/2, y0 + (W*cell_size)/2, text=label, fill="black", font=("Arial", 10, "bold"))

if __name__ == "__main__":
    root = tk.Tk()
    app = VanPackingGUI(root)
    root.mainloop()

