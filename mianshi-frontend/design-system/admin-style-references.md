# Admin 风格参考库 — Offer僧后台

> **用途：** Agent 写/改 `/admin/**` 前必读。与 `pages/admin.md` + skill `admin-dashboard.md` 配合使用。  
> **更新：** 2026-06-23 — 全站后台大换样调研

---

## 当前问题（为何要大换样）

| 问题 | 现状 | 目标 |
|------|------|------|
| Token 漂移 | `index.css` 同时存在 indigo 与 cyan 两套 admin token | 单一 token 真源 |
| 侧栏 AI 味 | 紫 indigo 渐变 + inline style | 克制 B 端侧栏（参考 Linear / shadcn neutral） |
| 规范 vs 实现 | 文档写 Mint `#0d9488`，代码用 `#4f46e5` | 对齐并桥接用户端 dark-tech cyan |
| 看板硬编码 | Dashboard 页 inline hex、emoji 错误态 | 全用 `admin-*` token + Admin 组件族 |
| 信息层级 | KPI 卡 rainbow 渐变 | 1 主色 + 语义色，数据优先 |

---

## 风格参考矩阵（调研结论）

### Tier A — 首选参考（结构 + 审美）

| 参考 | URL | 学什么 | 适用场景 |
|------|-----|--------|----------|
| **Linear** | https://linear.app | 窄侧栏、neutral 灰阶、细 border、零渐变 Hero、紧凑 typographic hierarchy | 侧栏 + 顶栏结构 |
| **Studio Admin (shadcn)** | https://github.com/arhamkhnz/next-shadcn-admin-dashboard | shadcn neutral 主题、可折叠侧栏、多 dashboard 预设、TanStack Table | 组件模式 + 布局壳 |
| **Vercel Dashboard** | https://vercel.com/templates/next.js/next-js-and-shadcn-ui-admin-dashboard | colocation 结构、theme preset 系统 | 架构组织 |
| **shadcn-admin-kit** | https://github.com/marmelab/shadcn-admin-kit | CRUD List/Show/Edit、DataTable、Sidebar、Lucide | 与本项目 React + Lucide 栈一致 |

### Tier B — 组件与密度

| 参考 | URL | 学什么 |
|------|-----|--------|
| **ReUI** | https://reui.io | 1000+ dashboard blocks、Data Grid、Filter bar |
| **Tweakcn presets** | https://tweakcn.com | shadcn 主题 preset（Neutral / Tangerine / Soft Pop） |
| **Retool admin** | https://retool.com | CRUD 密度、右侧面板编辑、表格列配置 |

### Tier C — 数据与监控页

| 参考 | 学什么 |
|------|--------|
| **Data-Dense Dashboard** (ui-ux-pro-max) | KPI 行 + 12 列 grid、表头 sticky、12–14px 数据字 |
| **Real-Time Monitoring** | 系统监控页 pulse 指示、状态色语义 |
| **Supabase Dashboard** | 开发者工具感、深色可选、清晰 status pill |

---

## 三套视觉方向（待用户选定 Active Admin Variant）

### Variant 1 — **Studio Neutral**（推荐默认）

**关键词：** shadcn neutral · Linear-like · 浅灰底 · 白卡片 · 细 border · 无渐变侧栏

| Token | 值 |
|-------|-----|
| page | `#FAFAFA` (neutral-50) |
| surface | `#FFFFFF` |
| sidebar | `#FAFAFA` + border-r，或 `#FFFFFF` |
| brand | `#0F766E` (teal-700，桥接用户端 cyan 家族) |
| accent | `#14B8A6` (teal-500) |
| text | `#171717` / secondary `#525252` |
| border | `#E5E5E5` |

**侧栏：** 白/浅灰底 + 左侧 2px brand indicator 表选中，不用深色渐变。  
**字体：** Inter 或 Geist Sans（Minimal Swiss）— 数据页可读性优先。  
**适合：** 内容 CRUD 为主（题库、审核、用户管理）。

### Variant 2 — **Slate Console**（与用户端 dark-tech 呼应）

**关键词：** slate-900 侧栏 · cyan 点睛 · 内容区仍 light elevated

| Token | 值 |
|-------|-----|
| sidebar | `#0F172A` → `#1E293B` 纯色（非紫渐变） |
| page | `#F1F5F9` |
| brand | `#22D3EE`（与用户端 accent 一致） |
| sidebar-text | `#94A3B8` / active `#F8FAFC` |

**适合：** 希望后台与用户端品牌强一致；侧栏深色、主内容保持 Elevated Pro 白卡片。

### Variant 3 — **Data Dense Pro**

**关键词：** 更高信息密度 · 更小 padding · Fira Sans + Fira Code（ID/数据列）

| 差异 | 值 |
|------|-----|
| card padding | `p-3` vs `p-5` |
| table row | `py-3` vs `py-4` |
| sidebar width | `200px` |
| font | Fira Sans body，Fira Code 用于 ID/统计 |

**适合：** 审核队列、系统监控等高频操作页；列表页仍可用 elevated 卡片。

---

## 布局壳规范（三 variant 共用）

```
┌─────────────────────────────────────────────────────────┐
│ [Logo] Offer通 Admin          [Search?] [User] [Theme?] │  ← AdminTopBar（新增）
├──────────┬──────────────────────────────────────────────┤
│ Sidebar  │  Breadcrumb（可选）                           │
│ 220px    │  AdminPageHeader variant="elevated"          │
│ collapsible│  AdminFilterCard + AdminTable              │
│          │  （全宽，禁止 max-w 套壳）                     │
└──────────┴──────────────────────────────────────────────┘
```

**新增/强化组件：**
- `AdminTopBar` — 全局搜索入口、用户菜单、通知（可选）
- `AdminSidebar` — 可折叠、`admin-*` token、去除 inline gradient
- `AdminBreadcrumb` — 3 层以上深链页面
- `AdminCommandPalette` — ⌘K 快捷跳转（Phase 2）

---

## 反 AI 味清单（Admin 专用）

- ❌ 紫 indigo 渐变侧栏 + 渐变 logo 块
- ❌ KPI 卡四色 rainbow 渐变 icon 背景
- ❌ emoji 作错误/状态图标
- ❌ `hover:-translate-y-0.5` 大面积卡片浮动（仅 stat 卡可保留 1 处）
- ❌ 硬编码 `#4f46e5` / `#7c3aed` / `#e8eaef`
- ✅ Lucide 24px 统一 stroke 1.75
- ✅ 药丸标签低饱和（已有 AdminBadges）
- ✅ 表格独立白卡片 + 行 hover（Elevated Pro）

---

## 实现优先级（大换样分期）

### Phase 1 — Token + 壳（最高 ROI）
1. 统一 `index.css` admin token（删除重复定义）
2. 重写 `AdminSidebar` + `AdminLayout` + 新增 `AdminTopBar`
3. 更新 `adminTheme.ts` 去除 indigo 硬编码

### Phase 2 — 看板 + 列表页
4. `AdminDashboardPage` → AdminStatCard 组件化，去 inline style
5. 所有 admin 页统一 `space-y-5` + elevated 模板

### Phase 3 — 体验增强
6. 侧栏折叠、面包屑、空状态统一
7. Command palette（可选）

---

## Agent 强制引用

写 admin UI 时回复须含：

```markdown
## Design System Compliance
- Style refs: design-system/admin-style-references.md
- Active Admin Variant: [Studio Neutral | Slate Console | Data Dense Pro]
- MASTER/pages: pages/admin.md + Elevated Pro
- Tokens: admin-* from index.css（无硬编码 hex）
```

---

## 外部链接速查

- [arhamkhnz/next-shadcn-admin-dashboard](https://github.com/arhamkhnz/next-shadcn-admin-dashboard)
- [marmelab/shadcn-admin-kit](https://github.com/marmelab/shadcn-admin-kit)
- [Kiranism/next-shadcn-dashboard-starter](https://github.com/Kiranism/next-shadcn-dashboard-starter)
- [ReUI Components](https://reui.io)
- [Tweakcn Theme Presets](https://tweakcn.com)
- [Linear](https://linear.app) — 侧栏与信息层级审美
