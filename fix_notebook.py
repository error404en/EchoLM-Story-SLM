import json

with open("c:\\Users\\shrey\\Downloads\\MAJOR\\slm-model-major-project.ipynb", "r", encoding="utf-8") as f:
    nb = json.load(f)

for cell in nb.get("cells", []):
    if cell.get("cell_type") == "code":
        source = cell["source"]
        
        # Fix bfloat16 check
        for i, line in enumerate(source):
            if line == 'if DEVICE == "cuda" and torch.cuda.is_bf16_supported():\n':
                source[i] = 'if DEVICE == "cuda" and torch.cuda.is_bf16_supported() and torch.cuda.get_device_capability()[0] >= 8:\n'
        
        # Fix torch.compile check
        for i, line in enumerate(source):
            if line == 'if DEVICE == "cuda":\n' and any('torch.compile' in l for l in source):
                # Make sure it's the right cell
                source[i] = 'if DEVICE == "cuda" and torch.cuda.get_device_capability()[0] >= 7:\n'
                
                # add elif for clarity
                new_source = []
                for l in source:
                    new_source.append(l)
                    if l == '        print("torch.compile not used:", e)\n':
                        new_source.append('elif DEVICE == "cuda":\n')
                        new_source.append('    print("torch.compile disabled (requires CUDA capability >= 7.0)")\n')
                cell["source"] = new_source

    if cell.get("cell_type") == "markdown":
        source = cell["source"]
        for i, line in enumerate(source):
            if "(T4 x2 or P100)" in line:
                source[i] = line.replace("(T4 x2 or P100)", "(T4 x2 is recommended, P100 is slower)")
            if "T4 x2 or P100" in line:
                source[i] = line.replace("T4 x2 or P100", "T4 x2 is recommended")

# Ensure outputs are cleared so it's a fresh notebook
for cell in nb.get("cells", []):
    if "outputs" in cell:
        cell["outputs"] = []
    if "execution_count" in cell:
        cell["execution_count"] = None

with open("c:\\Users\\shrey\\Downloads\\MAJOR\\slm-model-major-project.ipynb", "w", encoding="utf-8") as f:
    json.dump(nb, f, indent=1)
