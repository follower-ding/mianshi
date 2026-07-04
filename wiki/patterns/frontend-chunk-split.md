# Frontend Chunk Split

> 通过路由 lazy + Vite manualChunks + CI bundle 预算，将 SPA 入口从 1MB+ 降至 65 KB 量级。

## Problem Context

- mianshi-frontend 40+ 页面、html2canvas 导出、lucide 图标库
- 初期单 bundle **1072 KB**，移动端首屏 >3s
- 无 CI 门禁时，新依赖易再次撑爆首包

## Solution

### 1. 路由级 Lazy Loading

`src/routes/lazyPages.ts`：

```typescript
export const QuickInterviewPage = lazyNamed(
  () => import('../pages/QuickInterviewPage'),
  'QuickInterviewPage',
)
// 40+ 页均 lazy，App.tsx 仅 Home 直出
```

### 2. Vite manualChunks

`vite.config.ts`：

```typescript
manualChunks(id) {
  if (!id.includes('node_modules')) return
  if (react / react-dom / react-router) return 'vendor-react'
  if (lucide-react) return 'vendor-icons'
  if (html2canvas) return 'vendor-canvas'
}
```

大依赖按需加载，不进入入口 chunk。

### 3. CI Bundle 预算

- `check-bundle-size.mjs`：入口 chunk ≤ **350 KB**（实际 ~65 KB）
- `ci.yml` frontend job：`build` → `check:bundles`

### 4. 效果

| 指标 | 优化前 | 优化后 |
|------|--------|--------|
| 入口 chunk | 1072 KB | 65 KB |
| 路由 | 全量 | 40+ lazy |
| CI 门禁 | 无 | check:bundles |

## Trade-offs

| 得 | 失 |
|----|-----|
| 首屏显著加速 | 路由切换有短暂 loading |
| 大页独立 chunk | manualChunks 需随依赖演进维护 |
| CI 防回归 | 预算阈值需 periodic 校准 |

## Related Pages

- [[concepts/ai-job-prep-platform]]

## Sources

- `mianshi-frontend/src/routes/lazyPages.ts`
- `mianshi-frontend/vite.config.ts`
- `mianshi-frontend/scripts/check-bundle-size.mjs`
- `docs/PROJECT-STATUS-REPORT.md`: P3 chunk 拆分、前端性能 ~90%
