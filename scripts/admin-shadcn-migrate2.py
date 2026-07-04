#!/usr/bin/env python3
"""Second pass: Link+AdminButton, colors, alerts, broken tags."""
import re
import os
import glob

ADMIN = r"d:\cursor_project\mianshi\mianshi-frontend\src\pages\admin"

LINK_BTN = re.compile(
    r"<Link\s+([^>]*?)>\s*<AdminButton([^>]*)>(.*?)</AdminButton>\s*</Link>",
    re.DOTALL,
)

for path in glob.glob(os.path.join(ADMIN, "*.tsx")):
    with open(path, encoding="utf-8") as f:
        c = f.read()
    orig = c

    def repl(m):
        attrs, btn_attrs, inner = m.group(1), m.group(2), m.group(3).strip()
        to = re.search(r'to="([^"]*)"', attrs)
        target = re.search(r'target="([^"]*)"', attrs)
        parts = []
        if to:
            parts.append(f'to="{to.group(1)}"')
        if target:
            parts.append(f'target="{target.group(1)}"')
        return f"<AdminButtonLink {' '.join(parts)}{btn_attrs}>{inner}</AdminButtonLink>"

    c = LINK_BTN.sub(repl, c)

    # Fix mangled Button tags from partial replace
    c = c.replace("<Button>", "<AdminButton>")
    c = c.replace("<Button ", "<AdminButton ")
    c = re.sub(r"<Link to=\"/admin/users\"><Button>返回列表</AdminButton></Link>",
               '<AdminButtonLink to="/admin/users">返回列表</AdminButtonLink>', c)

    # Remove obsolete AdminPageHeader variant prop
    c = re.sub(r"\s+variant=\"elevated\"\s*\n\s*title=", "\n        title=", c)
    c = re.sub(r"<AdminPageHeader\s+variant=\"elevated\"\s+", "<AdminPageHeader ", c)

    # Dark avatar pills
    c = c.replace("bg-amber-100 text-amber-700", "bg-admin-surface-alt text-admin-text ring-1 ring-admin-border")
    c = c.replace("text-amber-600", "text-admin-muted")

    if c != orig:
        with open(path, "w", encoding="utf-8", newline="\n") as f:
            f.write(c)
        print("fixed", os.path.basename(path))
