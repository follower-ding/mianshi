# mianshi 上线清单

> **更新**：2026-07-04  
> **推荐路径**：自有服务器 + Docker + PostgreSQL  
> **详细操作手册**：[SERVER-DEPLOY-GUIDE.md](./SERVER-DEPLOY-GUIDE.md)（给什么 · 怎么获取 · 意义作用）  
> 备选：[NETLIFY-VERCEL.md](./NETLIFY-VERCEL.md)（无服务器时）

---

## 服务器部署（PostgreSQL + Docker）

| # | 项 | 负责 | 状态 |
|---|-----|------|------|
| 1 | P1 安全：生产强制 `ADMIN_PASSWORD` | 码匠 | ✅ |
| 2 | P1 安全：JWT 角色与 DB 同步 | 码匠 | ✅ |
| 3 | P1 安全：PDF 导出阻断外网 + 大小限制 | 码匠 | ✅ |
| 4 | P1 安全：公开简历页 `publicSafe` 纯文本 | 码匠 | ✅（已有） |
| 5 | nginx 安全响应头 | 码匠 | ✅ |
| 6 | CI 集成 `test:resume-all` | 码匠 | ✅ |
| 7 | 本地/CI 回归全绿 | 明镜 | 待跑 |
| 8 | E2E 全绿 | 明镜 | 待跑 |

---

## 2. GitHub Secrets（稳航 · 必配）

仓库 → **Settings → Secrets → Actions**

| Secret | 说明 |
|--------|------|
| `DEPLOY_HOST` | 服务器 IP 或域名 |
| `DEPLOY_USER` | SSH 用户名 |
| `DEPLOY_SSH_KEY` | 部署私钥全文 |
| `DEPLOY_PATH` | 如 `/opt/mianshi/deploy` |
| `GHCR_READ_TOKEN` | PAT，`read:packages` |

验证：

```powershell
cd d:\cursor_project\mianshi
.\scripts\verify-github-secrets.ps1
.\scripts\check-secrets.ps1
```

详见 [deploy/GITHUB-SECRETS.md](../../deploy/GITHUB-SECRETS.md)

---

## 3. 服务器 deploy/.env（稳航 · 必配）

```bash
cp deploy/.env.example deploy/.env
```

| 变量 | 要求 |
|------|------|
| `POSTGRES_PASSWORD` | 强密码，非默认值 |
| `JWT_SECRET` | ≥32 字符随机串 |
| `ADMIN_EMAIL` | 管理员邮箱 |
| `ADMIN_PASSWORD` | **强密码，生产必填**（未设则 API 拒绝启动） |
| `CORS_ORIGIN` | 生产域名，如 `https://mianshi.example.com` |
| `LLM_API_KEY` | 可选；无则 Demo 降级 |

---

## 4. 首次部署步骤（稳航）

```bash
# 服务器
sudo mkdir -p /opt/mianshi && sudo chown $USER:$USER /opt/mianshi
git clone https://github.com/YOUR_USER/mianshi.git /opt/mianshi
cd /opt/mianshi/deploy
cp .env.example .env   # 编辑必配项
docker compose -f docker-compose.prod.yml up -d --build
curl -sf http://127.0.0.1:8788/api/health
curl -sf http://127.0.0.1:8080/
```

---

## 5. 发布后验收（明镜 + 稳航）

| 检查 | 命令/路径 |
|------|-----------|
| API 健康 | `GET /api/health` → 200 |
| LLM 探测 | `GET /api/info?probe=1` |
| 用户注册登录 | 前端 `/register` → `/login` |
| 管理员登录 | `ADMIN_EMAIL` + `ADMIN_PASSWORD` → `/admin` |
| 简历导入导出 | 导入 PDF → 导出 PDF |
| 公开分享 | 生成分享链接 → 访客 `/r/:token` |
| CD 自动更新 | push `main` → Actions CD 绿 → 健康检查 |

---

## 6. 已知非阻塞项（上线后可迭代）

| 项 | 优先级 | 说明 |
|----|--------|------|
| Boss Worker 未纳入 prod compose | P2 | 智能投递需单独部署 worker |
| AdminSidebar `/api/metrics` 直链 401 | P2 | 改用 fetch + JWT |
| `/api/info` 信息泄露 | P2 | 生产可降级响应 |
| PostgreSQL 实机联调 | P2 | 阶段 7 仅在 JSON 模式跑回归 |

---

## 7. 发布命令（用户确认后）

```powershell
# 1. 明镜验收通过后
# 2. 稳航确认 Secrets + 服务器 .env
# 3. 首次需 init git + push（当前仓库尚无 commit）
git add .
git commit -m "chore: launch readiness — P1 security fixes + CI resume-all"
git push -u origin main
```

push 后 CD 自动：构建 GHCR 镜像 → SSH 部署 → 健康检查。
