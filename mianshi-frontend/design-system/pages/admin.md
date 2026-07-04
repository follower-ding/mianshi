# Admin 页面覆盖 — Offer僧

> 覆盖 MASTER。后台 **默认 Elevated Pro**（2026-06-12 定稿）。  
> **大换样风格参考：** `design-system/admin-style-references.md`（2026-06-23，Agent 必读）

**Surface:** `data-surface="admin"`（与用户端 theme 切换无关）

**Skill 真源：** `~/.cursor/skills/project-design-system/admin-dashboard.md`

**Active Admin Variant（待定）：** `Studio Neutral` | `Slate Console` | `Data Dense Pro` — 见 style-references.md

**风格对比页：** `/design/admin` — 三风格并排预览，选用后写入 localStorage

---

## 默认规范：Elevated Pro

**参考页：** `/admin/manage`（题库管理）

### 页面模板

```
space-y-5
├── AdminPageHeader variant="elevated"
├── AdminFilterCard
│   ├── AdminToolbar variant="elevated" + AdminSelect
│   └── AdminFilterPills variant="tabs"
└── AdminTable variant="elevated"
    └── AdminBadges（方向/难度/状态/质量）
```

### 布局

- AdminLayout：全宽，`px-5 py-5 lg:px-6 lg:py-6`
- 侧栏：`w-52`
- 区块间距：`space-y-5`

### 组件（必用）

| 组件 | 用途 |
|------|------|
| `AdminFilterCard` | 筛选白卡片 |
| `AdminTable variant="elevated"` | 表格卡片 + 阴影 |
| `AdminBadges` | 药丸标签 |
| `AdminIconButton` | 操作 icon（preview/edit/danger） |

### Token

- 卡片：`adminCx.surfaceElevated`
- 表头：`bg-admin-thead`
- 行 hover：`bg-admin-row-hover`
- 主色：`text-admin-brand`（`#0d9488`）

### 禁止

- `max-w-[1200px]` 套壳
- 列表页 `AdminTable` 不用 elevated（compact 仅用于看板类页）
- plain text 状态/质量（必须用 `AdminQualityPill` 等）
- `#1677ff` 硬编码

### Compact 变体

仅用于 `/admin` 看板、系统监控等非主列表页。新建 CRUD/列表页 **一律 Elevated Pro**。

---

## 进化日志

见 `~/.cursor/skills/project-design-system/EVOLUTION.md`
