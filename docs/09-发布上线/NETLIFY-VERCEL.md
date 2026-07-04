# Netlify + Vercel 免费部署指南

> **稳航** · 2026-07-04  
> **架构**：Netlify 托管前端 · Vercel 托管 API · Neon 免费 PostgreSQL

---

## 架构图

```
用户浏览器
    │
    ▼
Netlify（React SPA）          Vercel（Hono Serverless）
https://xxx.netlify.app  ──►  https://xxx.vercel.app/api/*
                                        │
                                        ▼
                               Neon PostgreSQL（免费）
                               + DeepSeek LLM API Key
```

| 组件 | 平台 | 免费额度 |
|------|------|----------|
| 前端 | **Netlify** | 100 GB 带宽/月 |
| API | **Vercel** | Hobby：Serverless 函数 |
| 数据库 | **Neon** | 0.5 GB 存储，无需信用卡 |

---

## 不支持的功能（Serverless 限制）

| 功能 | 状态 | 说明 |
|------|------|------|
| Boss 智能投递 Worker | ❌ | 需 Playwright 长驻进程，首版跳过 |
| 服务端 PDF 导出 | ❌ | Vercel 无 Chromium，用浏览器端导出 |
| JSON 文件降级模式 | ❌ | 必须配置 `DATABASE_URL` |
| Boss 定时抓取 | ❌ | 无 cron 长驻，可后续用 Vercel Cron |

核心链路（面试 / 题库 / 简历 / 后台）均可正常使用。

---

## 第一步：Neon 数据库（5 分钟）

1. 打开 [neon.tech](https://neon.tech) 注册
2. 创建 Project → 复制 **Connection string**（带 `?sslmode=require`）
3. 保存为 `DATABASE_URL`，形如：
   ```
   postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
   ```

---

## 第二步：Vercel 部署 API

### 方式 A — Git 连接（推荐）

1. 将代码 push 到 GitHub
2. [vercel.com/new](https://vercel.com/new) → Import 仓库
3. **Root Directory** 设为 `mianshi-api`
4. Framework Preset 选 **Hono**（或 Other，Vercel 会自动识别 `export default app`）
5. 配置 **Environment Variables**：

| 变量 | 值 | 说明 |
|------|-----|------|
| `DATABASE_URL` | Neon 连接串 | **必填** |
| `JWT_SECRET` | 随机 48+ 字符 | `node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"` |
| `ADMIN_EMAIL` | 你的邮箱 | 管理员账号 |
| `ADMIN_PASSWORD` | 强密码 | **生产必填** |
| `LLM_API_KEY` | DeepSeek Key | 可选，无则 Demo 模式 |
| `LLM_BASE_URL` | `https://api.deepseek.com/v1` | |
| `LLM_MODEL` | `deepseek-chat` | |
| `CORS_ORIGIN` | `https://你的站点.netlify.app` | 部署 Netlify 后回填；多个用逗号分隔 |
| `ALLOW_NETLIFY_PREVIEWS` | `1` | 可选，允许 `*.netlify.app` 预览域 |

6. Deploy → 记下 API 地址，如 `https://mianshi-api.vercel.app`

### 方式 B — CLI

```powershell
cd d:\cursor_project\mianshi\mianshi-api
npm i -g vercel
vercel login
vercel link
vercel env add DATABASE_URL
vercel env add JWT_SECRET
vercel env add ADMIN_PASSWORD
vercel env add CORS_ORIGIN
vercel --prod
```

### 验收

```powershell
curl https://你的-api.vercel.app/api/health
curl "https://你的-api.vercel.app/api/info?probe=1"
```

---

## 第三步：Netlify 部署前端

1. [app.netlify.com/start](https://app.netlify.com/start) → Import Git 仓库
2. 配置：

| 项 | 值 |
|----|-----|
| **Base directory** | `mianshi-frontend` |
| **Build command** | `npm ci && npm run build` |
| **Publish directory** | `mianshi-frontend/dist` |

3. **Environment variables**：

| 变量 | 值 |
|------|-----|
| `VITE_API_BASE` | `https://你的-api.vercel.app/api` |

4. Deploy → 得到 `https://xxx.netlify.app`

5. **回到 Vercel**，更新 `CORS_ORIGIN` 为 Netlify 域名，Redeploy API

---

## 第四步：首次使用验收

| 检查 | 操作 |
|------|------|
| 首页加载 | 打开 Netlify URL |
| 注册/登录 | `/register` → `/login` |
| 管理员 | `ADMIN_EMAIL` + `ADMIN_PASSWORD` → `/admin` |
| 模拟面试 | 开始一场 demo 面试 |
| 简历 | 创建 → 编辑 → 浏览器端导出 PDF |

---

## 环境变量速查

### Vercel（mianshi-api）

```env
DATABASE_URL=postgresql://...
JWT_SECRET=...
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=强密码
CORS_ORIGIN=https://mianshi.netlify.app,http://localhost:5174
ALLOW_NETLIFY_PREVIEWS=1
LLM_API_KEY=sk-...
LLM_BASE_URL=https://api.deepseek.com/v1
LLM_MODEL=deepseek-chat
```

### Netlify（mianshi-frontend）

```env
VITE_API_BASE=https://mianshi-api.vercel.app/api
```

---

## 常见问题

**CORS 报错**  
→ 确认 Vercel 的 `CORS_ORIGIN` 包含 Netlify 域名（含 `https://`，无尾部 `/`）

**API 500：DATABASE_URL required**  
→ Vercel 未配 Neon 连接串

**API 启动失败：ADMIN_PASSWORD required**  
→ Vercel 生产环境必须设置强密码

**登录后 401**  
→ 检查 `JWT_SECRET` 是否已配置且未变更

**LLM 不可用**  
→ 未配 `LLM_API_KEY` 时会自动 Demo 降级，功能可演示但非真实 AI

---

## 与 Docker CD 的关系

| 方式 | 文档 |
|------|------|
| 免费 Serverless | 本文 |
| 自有 VPS + Docker | [LAUNCH-CHECKLIST.md](./LAUNCH-CHECKLIST.md) + [deploy/AUTO-DEPLOY.md](../../deploy/AUTO-DEPLOY.md) |

两种方式二选一，无需同时配置。
