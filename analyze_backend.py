import glob
import re
import os

files = glob.glob('source_gas/*.js')

print("--- ANALYZING SOURCE FILES ---")
for fpath in files:
    with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    base = os.path.basename(fpath)
    # Search for HOJAS or tables
    hojas = re.findall(r'HOJA_[A-Z0-9_]+\s*:\s*["\']([^"\']+)["\']', content)
    if hojas:
        print(f"{base} -> HOJAS: {hojas}")

# Let's inspect GS_330_MOD_MaterialsPrices.js and GS_340_MOD_CashSales.js
for mod in ['GS_310_MOD_Providers.js', 'GS_330_MOD_MaterialsPrices.js', 'GS_340_MOD_CashSales.js', 'GS_020_CFG_Environment.js', 'GS_040_CORE_Data.js']:
    p = os.path.join('source_gas', mod)
    if os.path.exists(p):
        with open(p, 'r', encoding='utf-8', errors='ignore') as f:
            c = f.read()
        print(f"\n--- {mod} ---")
        headers = re.findall(r'CABECERAS_[A-Z0-9_]+\s*=\s*Object\.freeze\(\{([^}]+)\}\)', c)
        if headers:
            print("Headers found:", headers)
        tables = re.findall(r'([A-Z0-9_]{3,35})\s*:\s*Object\.freeze\(\[([^\]]+)\]\)', c)
        for t, cols in tables:
            print(f"Table {t} cols: {cols.strip()[:150]}")
