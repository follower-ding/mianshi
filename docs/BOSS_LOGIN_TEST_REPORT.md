# Boss 登录绑定 — 测试报告与落地方案

**日期**: 2026-06-12  
**环境**: Windows, `login.zhipin.com`, Playwright Chromium 无头模式  
**结论**: ✅ 演示绑定可用；✅ 登录页预览 2–4 秒内加载；⚠️ Boss 反自动化导致真机扫码需「粘贴 Cookie」

---

## 1. 根因分析

| 现象 | 根因 |
|------|------|
| 弹出空白浏览器窗口 | Playwright 可见模式 + `launchPersistentContext` 在 Windows 上不稳定 |
| 点击「APP扫码」后整页白屏 | `activateQrTab` 点击文字标签触发 Boss 前端异常导航 |
| 弹窗二维码一直 loading | 50s 超时 `closeBrowser()` 与慢速 `networkidle` 竞态，截图时浏览器已关闭 |
| 书签绑定失败 | `document.cookie` 不含 HttpOnly 字段 `wt2` |

---

## 2. 最终落地方案（已实现）

### 路径 A — 演示绑定（本地 / 测试，**推荐**）

1. 智能投递页 → **登录 Boss**
2. 点击 **「一键演示绑定」**
3. 约 1 秒内完成，可使用抓取、消息托管等功能（演示数据）

### 路径 B — 真实 Boss 账号：粘贴 Cookie

1. 用日常 Chrome 打开 https://login.zhipin.com 并完成登录
2. F12 → Network → 任意请求 → 复制 **Cookie** 整行
3. 绑定弹窗 → **方式二：粘贴 Cookie** → 确认绑定

### 路径 C — 扫码（尽力支持）

1. 点 **登录 Boss**，等待 **登录页预览图** 出现（约 2–4 秒）
2. 若预览中含二维码则用 Boss App 扫描
3. 若仅为验证码登录页，改用路径 B 或 A

**不再默认弹出空白浏览器窗口**（除非设置 `BOSS_CONNECT_VISIBLE=true`）。

---

## 3. 自动化测试结果

### 3.1 登录页预览抓取

```
playwright available: true
poll 0  waiting_scan  qr=false
poll 1  waiting_scan  qr=false
poll 2  waiting_scan  qr=true   (base64 length ≈ 224950)
```

**结论**: 后台无头浏览器可在约 **4 秒**内将登录页截图推送到前端弹窗。

### 3.2 演示绑定 API

```
POST /api/boss/session  cookie=demo-boss-session=1; wt2=demo
→ ok=true, GET /boss/session → bound=true
```

**结论**: 演示绑定链路 **通过**。

### 3.3 Boss 登录页诊断

- `https://login.zhipin.com` → HTTP 200，默认展示 **验证码登录**（非二维码）
- 点击「APP扫码」文字 → **页面变白**（已移除该点击逻辑）
- `www.zhipin.com/web/user` → `ERR_ABORTED`（已弃用该 URL）

---

## 4. 环境变量

| 变量 | 默认 | 说明 |
|------|------|------|
| `BOSS_CONNECT_VISIBLE` | 未设置 | `true` 时弹出可见 Chrome（仅调试） |
| `BOSS_CONNECT_CHANNEL` | chrome | 可见模式浏览器通道 |

---

## 5. 相关文件

| 文件 | 职责 |
|------|------|
| `mianshi-api/src/services/boss-playwright-login.ts` | 无头预览抓取、Cookie 轮询 |
| `mianshi-frontend/src/components/jobs/BossBindWizard.tsx` | 演示绑定 + 粘贴 Cookie + 预览 |
| `mianshi-api/scripts/test-boss-qr.ts` | 登录页诊断 |
| `mianshi-api/scripts/test-connect-flow.ts` | 连接流程压测 |

---

## 6. 使用说明（给用户）

1. **重启 API**（若刚更新代码）: `cd mianshi-api && npm run dev`
2. 刷新 http://localhost:5174/jobs
3. 点 **登录 Boss** → **一键演示绑定**（最快验证全流程）
4. 真实 Boss：登录后 **粘贴 Cookie**

---

## 7. 后续可选增强（非必须）

- Chrome 扩展导出完整 Cookie（含 HttpOnly）
- 服务端 DrissionPage Worker（与参考项目一致）
- 配置 `FIRECRAWL_API_KEY` 抓取真实岗位
