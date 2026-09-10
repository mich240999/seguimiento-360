import json
import os

path = r'c:\Users\agente.calidda\Desktop\Transferencia_Final_Operaciones_Hogar\Transferencia_Final_Operaciones_Hogar\Documentos\Codigo\Calidda360\Calidda 360 (16).json'
with open(path, 'r', encoding='utf-8') as f:
    data = json.load(f)

# Create a source_gas directory to extract original files
gas_dir = os.path.join(os.getcwd(), 'source_gas')
os.makedirs(gas_dir, exist_ok=True)

for item in data['files']:
    name = item.get('name')
    ftype = item.get('type')
    ext = '.json' if ftype == 'json' else ('.html' if ftype == 'html' else '.js')
    fname = f"{name}{ext}"
    fpath = os.path.join(gas_dir, fname)
    with open(fpath, 'w', encoding='utf-8') as out:
        out.write(item.get('source', ''))
    print(f"Extracted {fname} ({len(item.get('source', ''))} bytes)")

print("All files extracted to source_gas/")
