import os
import re

print("Starting replication build process...")

# 1. Ensure target directories
os.makedirs("supabase", exist_ok=True)
os.makedirs("css", exist_ok=True)
os.makedirs("js", exist_ok=True)
os.makedirs("js/modules", exist_ok=True)
os.makedirs(".github/workflows", exist_ok=True)

# Helper to read source file
def read_src(filename):
    p = os.path.join("source_gas", filename)
    if os.path.exists(p):
        with open(p, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()
    return ""

def strip_tags(content, tag):
    # Strip <style> ... </style> or <script> ... </script>
    pattern = rf"<{tag}[^>]*>(.*?)</{tag}>"
    matches = re.findall(pattern, content, flags=re.DOTALL | re.IGNORECASE)
    if matches:
        return "\n\n".join(matches).strip()
    return content.strip()

# 2. Extract CSS files
css_app = strip_tags(read_src("HTML_120_APP_Styles.html"), "style")
css_prov = strip_tags(read_src("HTML_125_PROV_Styles.html"), "style")

with open("css/app-styles.css", "w", encoding="utf-8") as f:
    f.write(css_app)
print("Created css/app-styles.css")

with open("css/prov-styles.css", "w", encoding="utf-8") as f:
    f.write(css_prov)
print("Created css/prov-styles.css")

# 3. Extract JS modules (strip <script> tags)
js_core = strip_tags(read_src("HTML_140_APP_Scripts.html"), "script")
js_adm = strip_tags(read_src("HTML_310_ADM_Scripts.html"), "script")
js_prov = strip_tags(read_src("HTML_330_PROV_Scripts.html"), "script")
js_mp = strip_tags(read_src("HTML_350_MP_Scripts.html"), "script")
js_sales = strip_tags(read_src("HTML_370_SALES_Scripts.html"), "script")
js_dyn = strip_tags(read_src("HTML_410_MOD_Scripts.html"), "script")

# Adapt google.script.run in js_core to use our window.apiAdapter or mock adapter
# Replace google.script.run calls with our universal bridge
js_core_adapted = js_core.replace(
    "google.script.run\n        .withSuccessHandler(resolve)\n        .withFailureHandler(function(error) {",
    "window.apiAdapter.executeRpc(operation, argumentsList, moduleCode)\n        .then(resolve)\n        .catch(function(error) {"
)
# If slightly different formatting:
js_core_adapted = re.sub(
    r'google\.script\.run\s*\.withSuccessHandler\(resolve\)\s*\.withFailureHandler\(function\(error\)\s*\{',
    'window.apiAdapter.executeRpc(operation, argumentsList, moduleCode)\n        .then(resolve)\n        .catch(function(error) {',
    js_core_adapted
)

# Also in checkSession / google.script.run elsewhere in js_core:
js_core_adapted = re.sub(
    r'google\.script\.run\s*\.withSuccessHandler\(([^\)]+)\)\s*\.withFailureHandler\(([^\)]+)\)\s*\.([a-zA-Z0-9_]+)\(([^\)]*)\)',
    r'window.apiAdapter.directCall("\3", [\4]).then(\1).catch(\2)',
    js_core_adapted
)

with open("js/app-core.js", "w", encoding="utf-8") as f:
    f.write(js_core_adapted)
print("Created js/app-core.js (adapted from Apps Script)")

with open("js/modules/admin.js", "w", encoding="utf-8") as f:
    f.write(js_adm)
print("Created js/modules/admin.js")

with open("js/modules/providers.js", "w", encoding="utf-8") as f:
    f.write(js_prov)
print("Created js/modules/providers.js")

with open("js/modules/materials-prices.js", "w", encoding="utf-8") as f:
    f.write(js_mp)
print("Created js/modules/materials-prices.js")

with open("js/modules/sales.js", "w", encoding="utf-8") as f:
    f.write(js_sales)
print("Created js/modules/sales.js")

with open("js/modules/dynamic.js", "w", encoding="utf-8") as f:
    f.write(js_dyn)
print("Created js/modules/dynamic.js")

print("All JS modules extracted successfully!")
