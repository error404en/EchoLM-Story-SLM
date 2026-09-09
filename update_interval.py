import json

with open("c:\\Users\\shrey\\Downloads\\MAJOR\\slm-model-major-project.ipynb", "r", encoding="utf-8") as f:
    nb = json.load(f)

for cell in nb.get("cells", []):
    if cell.get("cell_type") == "code":
        source = cell["source"]
        
        for i, line in enumerate(source):
            if "if step % 20 == 0:" in line:
                source[i] = line.replace("if step % 20 == 0:", "if step % 10 == 0:")

with open("c:\\Users\\shrey\\Downloads\\MAJOR\\slm-model-major-project.ipynb", "w", encoding="utf-8") as f:
    json.dump(nb, f, indent=1)
