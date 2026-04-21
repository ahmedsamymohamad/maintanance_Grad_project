import json

path = r"f:\Grad_project\grad code.ipynb"
with open(path, "r", encoding="utf-8") as f:
    nb = json.load(f)

for cell in nb.get("cells", []):
    if cell.get("cell_type") == "code":
        source = cell.get("source", [])
        for i, line in enumerate(source):
            if "joblib.dump(best_model," in line:
                source[i] = "        joblib.dump(best_model, f\"{branch_name}_{best_name.replace(' ', '_')}_model.pkl\")\n"
            elif "import joblib" in line:
                source[i] = "        import joblib\n"

with open(path, "w", encoding="utf-8") as f:
    json.dump(nb, f, indent=1)
