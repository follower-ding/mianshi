# Resume 页面覆盖 — 简历工作台

> 覆盖 MASTER。用户端 `/resume/**` 必读本文件。  
> **布局真源：** `src/components/resume/resumeLayout.ts`  
> **模块路由：** `src/components/resume/resumeSections.ts`

**Surface:** 沉浸模式 — `/resume/**` 隐藏全站 Header，仅保留 `ResumeShellHeader`。

---

## 设计意图

**One-liner：** 文档编辑器式三栏工作台 — 暗色 chrome + 白纸 A4 预览，功能清晰、不抢纸面内容。

**Do NOT：**

- 工具栏 / 弹层写死 `slate-*`、`bg-white`（除 A4 纸面内）
- 简历区叠加全站 Header（双层顶栏）
- 原生 `alert` / `confirm` 打断流程
- 预览区外使用「老鱼」全浅色 UI 岛

---

## 布局架构

```
┌─────────────────────────────────────────────────────────────┐
│ ResumeShellHeader                                           │
│  Row1: 图标 + 面包屑/切换器/标题  │  分享 · 导出 · 保存      │
│  Row2: Tab — 我的简历 │ 快速生成 │ 导入优化 │ 排版编辑 │ …   │
├──────────┬─────────────────────┬────────────────────────────┤
│ 模块侧栏  │ 内容编辑             │ 预览 Studio + A4 纸面       │
│ 220px    │ flex-1              │ min 480px                  │
└──────────┴─────────────────────┴────────────────────────────┘
```

| 视图 | 布局 |
|------|------|
| `/resume/mine` | 卡片网格向导 |
| `/resume/generate` | 单栏居中 wizard `max-w-xl` |
| `/resume/optimize` | 单栏 + 步骤 |
| `/resume/edit` | 三栏；`< lg` 底栏 Tab 切换编辑/预览 |
| `/resume/templates` | 模板画廊 |
| `/resume/help` | 文档 scroll |

**高度：** `h-dvh`（沉浸全屏，无全站 Header）

---

## Token — Resume Studio

定义于 `src/index.css`（`:root` / `[data-theme]`）：

| Token | 用途 | dark-tech 参考 |
|-------|------|----------------|
| `--resume-canvas` | 预览区灰底（纸外） | `#1e1e28` |
| `--resume-paper` | A4 白纸 | `#ffffff` |
| `--resume-toolbar` | Studio 工具栏底 | `var(--ds-elevated)` |
| `--resume-toolbar-border` | 工具栏边 | `var(--ds-border)` |

Tailwind 映射（`@theme`）：

- `bg-resume-canvas` / `bg-resume-paper` / `bg-resume-toolbar`
- `border-resume-toolbar`

**规则：**

- **Chrome**（工具栏、Popover、下拉）：`bg-elevated` / `bg-panel` / `border-border` / `text-text`
- **Canvas**（纸外背景）：`bg-resume-canvas`
- **Paper**（`#resume-print-root`）：`bg-resume-paper` + 打印阴影 — 仅预览 DOM 内

---

## 组件（必用）

| 组件 | 用途 |
|------|------|
| `ResumeShellHeader` | 双行顶栏 |
| `ResumeModuleNav` | Tab 底边导航 |
| `ResumePreviewStudio` | 预览 + 排版工具栏 |
| `ResumeEditor` + `ResumeFormField` | 结构化编辑 |
| `ResumeSectionSidebar` | 模块开关 |
| `Modal` / `ConfirmDialog` | 确认与裁剪 |
| `EmptyState` | 空列表 |
| `Input` / `Select` / `FormField` | 表单（`components/ui`） |

### Studio 工具栏按钮

```tsx
// 统一 secondary sm，禁止 !bg-white !text-slate-*
<Button variant="secondary" size="sm" className="!h-8" />
```

### ToolbarSelect

使用 `components/ui/Select` 或共享 class：

```
h-8 rounded-lg border border-border bg-panel px-2 text-xs text-text
```

### Popover / 导出菜单

- Portal + `fixed`，`z-[200]`
- `bg-panel border-border shadow-xl`

---

## 排版层级

| 级别 | 字号 | 用途 |
|------|------|------|
| Page title | `text-xl font-semibold` | 生成/优化 wizard 标题 |
| Section | `text-sm font-medium` | 编辑区段标题 |
| Meta | `text-[11px] text-muted` | 提示、A4 标注 |
| Tab | `text-sm font-medium` | ModuleNav |

圆角：面板 `rounded-xl`，纸面 `rounded-sm`，按钮 `rounded-lg`（跟全站 Button）。

---

## 交互与反馈

| 场景 | 方式 |
|------|------|
| 保存/导出成功 | ShellHeader Toast 或 `useToast` success |
| 错误 | `useToast` error |
| 删除/覆盖 | `ConfirmDialog` |
| 自动保存 | `AutoSaveIndicator` |
| 移动端编辑 | 底部固定 Tab：内容编辑 \| 预览 |

**禁止：** `window.alert` / `window.confirm`（简历模块内）

---

## 完成度展示

编辑页进度条保留；文案优先具体项：

- 低完成度：「待完善：姓名、工作经历…」
- 避免单独展示 `0%` 打击新用户（可显示「刚开始」）

---

## 公开页 `/r/:token`

- 背景 `bg-resume-canvas`
- 品牌 footer 用 `BRAND.displayName`

---

## 与全站关系

- 全站 Header **不渲染**于 `/resume/**`
- Shell 左侧 **返回首页** NavLink（Home 图标）
- 主题切换：全站用户菜单；简历 chrome 随 `data-theme` 变化

---

## 检查清单（PR）

- [ ] 无 `#eef1f6` / `slate-200` 于 Studio chrome
- [ ] Popover 不被 preview 工具栏遮挡（Portal）
- [ ] 移动端可切换预览并导出
- [ ] 确认框非原生 dialog
- [ ] 纸面外区域在 dark-tech 下仍为暗色 chrome
