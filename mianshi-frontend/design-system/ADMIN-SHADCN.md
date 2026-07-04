# Admin 后台设计规范 — Shadcn Admin

真源参考：[Shadcn Admin 模板](https://www.shadcn.io/template/satnaing-shadcn-admin) · [Live Demo](https://shadcn-admin.netlify.app/)

本项目后台 **统一采用此套视觉与布局**，不再混用浅色卡片 / 渐变 KPI / 原生 select 默认样式。

## 布局

```
┌──────────────┬────────────────────────────────────┐
│ Sidebar 240  │ Header (h-14, search, actions)     │
│ Team switch  ├────────────────────────────────────┤
│ Nav groups   │ Page title + actions               │
│ User footer  │ Tabs (optional)                    │
│              │ Cards / Table / Forms              │
└──────────────┴────────────────────────────────────┘
```

- 侧栏与内容区 **同暗色底**（zinc-950 `#09090b`）
- 卡片：**仅 border**，无彩色渐变、无重阴影
- 主按钮：白底深字（`--color-admin-brand` + `--color-admin-on-brand`）

## Token（`adminVariants.ts` → `shadcn-admin`）

| Token | 值 | 用途 |
|-------|-----|------|
| page / surface | `#09090b` | 页面与卡片底 |
| surface-alt | `#18181b` | 输入框、Tab 轨道、表头 |
| border | `#27272a` | 所有分隔 |
| text | `#fafafa` | 标题 |
| muted | `#71717a` | 辅助文案 |
| brand | `#fafafa` | 主按钮背景 |

## 组件清单

| 组件 | 文件 | 说明 |
|------|------|------|
| 侧栏 | `AdminSidebar.tsx` | Team + 分组导航 + 用户区 |
| 顶栏 | `AdminHeader.tsx` | 搜索 ⌘K、设置、头像 |
| 按钮 | `AdminButton.tsx` | 后台专用，勿用用户端 `Button` |
| Tab | `AdminTabs.tsx` | 状态筛选 / 子视图 |
| KPI | `AdminCharts` → `AdminKpiTile` | 右上小图标 + 大数字 |
| 徽章 | `AdminBadges.tsx` | outline 风格，禁 pastel 浅底 |
| 表格 | `AdminCard.tsx` | 细 border，muted 表头 |

## 禁止项

- 不在后台页使用 `components/ui/Button`（会用用户端 teal 品牌色）
- 不用 KPI 彩色渐变底
- 不用 `rounded-2xl` 大圆角卡片堆叠
- 不用浅色 `bg-violet-50` 类 badge（暗色下刺眼）

## 风格切换

`/design/admin` 仍可预览历史 variant，**默认且推荐仅 `shadcn-admin`**。
