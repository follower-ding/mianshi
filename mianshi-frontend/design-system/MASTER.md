# Design System Master — iume (mianshi)

> **Active Variant:** `dark-tech`（暗色科技 — 2026-06-12 全局启用）
> **Compare UI:** `/design/mianshi`（选定前参考三风格）

**LOGIC:** 先读 `design-system/pages/[page].md`；**`/admin/**` 必读 `pages/admin.md`**；**`/resume/**` 必读 `pages/resume.md`**；无则读本文件。

---

## Variant 路由

| 场景 | Variant | 文件 |
|------|---------|------|
| **当前全站默认** | **dark-tech** | `variants/dark-tech.md` |
| **简历工作台（/resume）** | **dark-tech + resume.md** | `pages/resume.md` |
| **管理后台（/admin）** | **elevated-pro** | `pages/admin.md` + skill `admin-dashboard.md` |
| 报告详情、经验故事（可选） | literary | `variants/literary.md` |

---

## Design Intent

**One-liner:** 专业可信的面试练习平台；全站暗色科技 — 夜间专注、cyan 点睛、无 AI 模板紫渐变。

**Do NOT:** indigo Hero · emoji 图标 · Unlock 文案 · 四列 rainbow feature 卡

---

## Tokens（dark-tech active）

- Tailwind `@theme`: `src/index.css`
- CSS variables: `src/assets/styles/tokens.css`
- Theme map: `src/pages/design-showcase/mianshi-compare/themes.ts`

| Token | Value |
|-------|-------|
| page | `#0A0A0F` |
| elevated | `#12121A` |
| panel | `#1A1A24` |
| brand/accent | `#22D3EE` |
| text | `#F1F5F9` |

---

## 新建项目复用流程

见 `~/.cursor/skills/project-design-system/SKILL.md` → Step 1d 三风格对比

```bash
python ~/.cursor/skills/project-design-system/scripts/scaffold-three-variants.py ...
```
