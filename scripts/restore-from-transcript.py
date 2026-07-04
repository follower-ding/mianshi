#!/usr/bin/env python3
"""Replay Write/StrReplace ops from agent transcript for specific files."""
import json
import os
import sys

TRANSCRIPT = r"C:\Users\iume\.cursor\projects\d-cursor-project-mianshi\agent-transcripts\98eff939-1766-4377-9dc9-4519b4b94b98\98eff939-1766-4377-9dc9-4519b4b94b98.jsonl"
BASE = r"d:\cursor_project\mianshi\mianshi-frontend\src\pages\admin"


def replay(targets: list[str]) -> None:
    files: dict[str, str | None] = {t: None for t in targets}
    with open(TRANSCRIPT, encoding="utf-8") as f:
        for line in f:
            try:
                obj = json.loads(line)
            except json.JSONDecodeError:
                continue
            msg = obj.get("message", {}).get("content", [])
            if not isinstance(msg, list):
                continue
            for item in msg:
                if item.get("type") != "tool_use":
                    continue
                inp = item.get("input", {})
                p = inp.get("path", "").replace("\\\\", "/").replace("\\", "/")
                fname = os.path.basename(p)
                if fname not in targets:
                    continue
                if item.get("name") == "Write":
                    files[fname] = inp.get("contents", "")
                elif item.get("name") == "StrReplace" and files[fname] is not None:
                    old = inp.get("old_string", "")
                    new = inp.get("new_string", "")
                    if old not in files[fname]:
                        continue
                    if inp.get("replace_all"):
                        files[fname] = files[fname].replace(old, new)
                    else:
                        files[fname] = files[fname].replace(old, new, 1)

    for fname, content in files.items():
        if not content:
            print(f"SKIP {fname} (no content)")
            continue
        out = os.path.join(BASE, fname)
        with open(out, "w", encoding="utf-8", newline="\n") as wf:
            wf.write(content)
        print(f"OK {fname} ({len(content)} bytes)")


if __name__ == "__main__":
    replay(sys.argv[1:] if len(sys.argv) > 1 else ["AdminQuestionManagePage.tsx", "AdminLayout.tsx"])
