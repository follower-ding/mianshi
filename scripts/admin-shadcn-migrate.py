import re
import os
import glob

ADMIN = r"d:\cursor_project\mianshi\mianshi-frontend\src\pages\admin"
SKIP = {"AdminLayout.tsx", "AdminDashboardPage.tsx"}

for path in glob.glob(os.path.join(ADMIN, "*.tsx")):
    name = os.path.basename(path)
    if name in SKIP:
        continue
    with open(path, encoding="utf-8") as f:
        c = f.read()
    orig = c
    c = c.replace(
        "import { Button } from '../../components/ui/Button'",
        "import { AdminButton, AdminButtonLink } from '../../components/admin/AdminButton'",
    )
    c = re.sub(r"<Button(\s)", r"<AdminButton\1", c)
    c = c.replace("</Button>", "</AdminButton>")
    c = re.sub(r'\s+accent="[^"]*"', "", c)
    c = c.replace("space-y-6", "space-y-4")
    c = c.replace("gap-5", "gap-4")
    c = c.replace("rounded-2xl", "rounded-lg")
    c = c.replace("rounded-xl", "rounded-lg")
    if c != orig:
        with open(path, "w", encoding="utf-8", newline="\n") as f:
            f.write(c)
        print("updated", name)
