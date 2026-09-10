import re

with open('source_gas/GS_140_AUTH_SecureRpc.js', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

handlers = re.findall(r'(\w+):\s*Object\.freeze\(\{\s*handler:\s*["\'](\w+)["\']', text)
print(f"Total RPC handlers in GS_140: {len(handlers)}")
for k, h in handlers:
    print(f"  {k} -> {h}")
