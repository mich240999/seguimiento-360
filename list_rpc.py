import re

with open('source_gas/GS_140_AUTH_SecureRpc.js', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

ops = re.findall(r'case\s+[\'"]([^\'"]+)[\'"]\s*:', text)
print(f'RPC operations in GS_140 ({len(ops)}):')
for o in sorted(ops):
    print(" -", o)
