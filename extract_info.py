import json
import os

path = r'c:\Users\agente.calidda\Desktop\Transferencia_Final_Operaciones_Hogar\Transferencia_Final_Operaciones_Hogar\Documentos\Codigo\Calidda360\Calidda 360 (16).json'
with open(path, 'r', encoding='utf-8') as f:
    data = json.load(f)

if isinstance(data, dict):
    print("Dict keys:", list(data.keys()))
    if 'files' in data:
        print("Files count:", len(data['files']))
        for item in data['files']:
            print(f" - {item.get('name')} ({item.get('type')}) - size: {len(item.get('source', ''))}")
elif isinstance(data, list):
    print("List of length:", len(data))
    if len(data) > 0 and isinstance(data[0], dict):
        print("First item keys:", list(data[0].keys()))
