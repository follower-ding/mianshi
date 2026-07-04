# mianshi 服务器部署操作手册

> **版本**：2026-07-04 · **稳航** 维护  
> **适用**：自有 Linux 服务器 + Docker + PostgreSQL + GitHub Actions 自动发布  
> **读者**：项目负责人、运维、首次部署操作者

---

## 1. 部署全景

### 1.1 最终长什么样

```
开发者 push 代码到 GitHub main
        │
        ▼
GitHub Actions（CI 测试 → CD 构建镜像）
        │
        ├── 构建镜像 push 到 GHCR（GitHub 容器仓库）
        │
        └── SSH 登录你的服务器 → 执行 deploy/update.sh → 拉新镜像 → 重启容器
                │
                ▼
        ┌───────────────────────────────────────┐
        │  你的服务器 /opt/mianshi/deploy        │
        │  ┌─────────┐  ┌─────────┐  ┌──────┐ │
        │  │  web    │  │   api   │  │ postgres│
        │  │ :8080   │→ │ :8788   │→│ :5432 │ │
        │  │ Nginx   │  │ Hono    │  │  DB   │ │
        │  └─────────┘  └─────────┘  └──────┘ │
        └───────────────────────────────────────┘
                │
                ▼
        用户浏览器访问 http://你的域名或IP:8080
```

### 1.2 三个配置位置（别搞混）

| 位置 | 文件/入口 | 谁用 | 提交 Git？ |
|------|-----------|------|------------|
| **GitHub Secrets** | 仓库 Settings → Secrets | GitHub Actions 自动部署 | ❌ 永不提交 |
| **服务器 `.env`** | `/opt/mianshi/deploy/.env` | Docker 容器运行时 | ❌ 永不提交 |
| **代码仓库** | 业务代码 + Dockerfile + CI/CD | 构建镜像 | ✅ 正常提交 |

---

## 2. 你需要准备什么（总清单）

按角色分三类：**基础设施**、**GitHub 侧**、**服务器侧**。

| 类别 | 数量 | 一句话 |
|------|------|--------|
| 基础设施 | 1 台 VPS + 可选域名 | 跑 Docker 的机器 |
| GitHub Secrets | 5 个 | 让 Actions 能 SSH 上去更新 |
| 服务器 `.env` | 8+ 个变量 | 让应用能连库、鉴权、调 LLM |

---

## 3. 基础设施

### 3.1 Linux 服务器（VPS）

| 项 | 说明 |
|----|------|
| **给什么** | 一台可 SSH 的 Linux 服务器 |
| **怎么获取** | 阿里云 / 腾讯云 / 华为云 / Vultr 等购买 ECS；系统选 **Ubuntu 22.04** 或 **Debian 12** |
| **意义/作用** | 运行 PostgreSQL、API、前端三个 Docker 容器；用户通过这台机器访问网站 |
| **最低配置建议** | 2 核 CPU · 4 GB 内存 · 40 GB 磁盘 · 开放端口 **22（SSH）**、**8080（Web）**；若仅内网测可暂不开 8080 公网 |

**获取后你要记录：**

- 公网 IP（例：`203.0.113.10`）
- SSH 用户名（Ubuntu 默认 `ubuntu`，部分镜像为 `root`）

---

### 3.2 Docker + Docker Compose

| 项 | 说明 |
|----|------|
| **给什么** | 服务器上已安装 Docker Engine 和 Docker Compose 插件 |
| **怎么获取** | 服务器 SSH 登录后执行官方安装脚本，或云厂商「应用镜像」选带 Docker 的 |
| **意义/作用** | 一键启动 postgres + api + web，隔离环境，方便升级回滚 |

```bash
# Ubuntu 示例（官方文档为准）
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# 重新登录 SSH 后验证
docker --version
docker compose version
```

---

### 3.3 域名（可选但推荐）

| 项 | 说明 |
|----|------|
| **给什么** | 一个指向服务器 IP 的域名，如 `mianshi.example.com` |
| **怎么获取** | 域名注册商购买 → DNS 添加 **A 记录** 指向服务器 IP |
| **意义/作用** | 用户友好访问；`CORS_ORIGIN` 填域名；后续可挂 HTTPS 证书 |
| **不绑域名时** | `CORS_ORIGIN` 填 `http://203.0.113.10:8080`（IP + 端口） |

---

### 3.4 GitHub 代码仓库

| 项 | 说明 |
|----|------|
| **给什么** | 一个 GitHub 仓库，代码 push 到 `main` 分支 |
| **怎么获取** | GitHub 新建仓库 → 本地 `git remote add origin ...` → push |
| **意义/作用** | 触发 CI 测试与 CD 自动构建/部署；镜像托管在 GHCR |

---

## 4. GitHub Secrets（5 个）

> **配置入口**：GitHub 仓库 → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

这些 Secret **只给 GitHub Actions 用**，用于「构建完镜像后 SSH 到你的服务器执行更新」。  
**不要**写进代码、**不要**放进 `deploy/.env`。

---

### 4.1 `DEPLOY_HOST`

| 项 | 内容 |
|----|------|
| **给什么** | 服务器公网 IP 或域名 |
| **怎么获取** | 云控制台「实例详情」→ 公网 IP；或域名 A 记录指向的 host |
| **意义/作用** | Actions 通过 SSH 连接的目标地址 |
| **示例** | `203.0.113.10` 或 `mianshi.example.com` |

```powershell
gh secret set DEPLOY_HOST --body "203.0.113.10"
```

---

### 4.2 `DEPLOY_USER`

| 项 | 内容 |
|----|------|
| **给什么** | SSH 登录用户名 |
| **怎么获取** | 创建 VPS 时系统指定；Ubuntu 云镜像多为 `ubuntu` |
| **意义/作用** | SSH 认证身份，与私钥配对 |
| **示例** | `ubuntu` |

```powershell
gh secret set DEPLOY_USER --body "ubuntu"
```

---

### 4.3 `DEPLOY_SSH_KEY`

| 项 | 内容 |
|----|------|
| **给什么** | **部署专用** SSH 私钥全文（OpenSSH 格式） |
| **怎么获取** | 见下方「生成 SSH 密钥对」 |
| **意义/作用** | GitHub Actions 用私钥登录服务器；公钥需预先写入服务器 `~/.ssh/authorized_keys` |
| **注意** | 私钥只放 GitHub Secret，**绝不提交仓库** |

**生成 SSH 密钥对（本地 PowerShell）：**

```powershell
ssh-keygen -t ed25519 -C "mianshi-deploy" -f $env:USERPROFILE\.ssh\mianshi_deploy
# 不设置 passphrase（Actions 无法交互输入）直接回车
```

**把公钥装到服务器：**

```powershell
type $env:USERPROFILE\.ssh\mianshi_deploy.pub
# 复制输出内容，SSH 登录服务器后：
# echo "粘贴公钥内容" >> ~/.ssh/authorized_keys
```

**把私钥写入 GitHub Secret：**

```powershell
gh secret set DEPLOY_SSH_KEY < $env:USERPROFILE\.ssh\mianshi_deploy
```

**验证本地能否登录：**

```powershell
ssh -i $env:USERPROFILE\.ssh\mianshi_deploy ubuntu@203.0.113.10
```

---

### 4.4 `DEPLOY_PATH`

| 项 | 内容 |
|----|------|
| **给什么** | 服务器上 **deploy 目录的绝对路径** |
| **怎么获取** | 首次 clone 仓库后确定，推荐 `/opt/mianshi/deploy` |
| **意义/作用** | Actions SSH 进去后 `cd` 到此目录执行 `./update.sh` |
| **示例** | `/opt/mianshi/deploy` |

```powershell
gh secret set DEPLOY_PATH --body "/opt/mianshi/deploy"
```

**前提**：该目录下已有 `update.sh`、`docker-compose.prod.yml`、`.env`（见 §6 首次部署）。

---

### 4.5 `GHCR_READ_TOKEN`

| 项 | 内容 |
|----|------|
| **给什么** | GitHub Personal Access Token（PAT），用于服务器 `docker login ghcr.io` 拉私有镜像 |
| **怎么获取** | GitHub → **Settings** → **Developer settings** → **Personal access tokens** |
| **意义/作用** | CD 构建的镜像在 GHCR；服务器更新时需拉取新镜像 |
| **权限** | Classic PAT 勾选 **`read:packages`**；Fine-grained 选 Packages **Read** |

**创建步骤（Classic PAT）：**

1. GitHub 头像 → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token → 勾选 `read:packages`
3. 复制 token（只显示一次）

```powershell
gh secret set GHCR_READ_TOKEN --body "ghp_xxxxxxxxxxxxxxxx"
```

**服务器侧也会用到**：`update.sh` 执行时 CD 流水线会把 token 通过 SSH 传给 `docker login ghcr.io`。

---

### 4.6 不需要你配的：`GITHUB_TOKEN`

| 项 | 内容 |
|----|------|
| **说明** | Actions 自动注入，用于 **push 镜像到 GHCR** |
| **意义/作用** | 构建阶段上传 `mianshi-api`、`mianshi-web` 镜像 |

---

### 4.7 验证 GitHub Secrets 是否齐全

```powershell
cd d:\cursor_project\mianshi
gh auth login   # 若未登录
.\scripts\verify-github-secrets.ps1
```

输出 `ok (all CD secrets present)` 即通过。

---

## 5. 服务器 `.env`（应用运行时配置）

> **位置**：服务器 `/opt/mianshi/deploy/.env`  
> **来源模板**：仓库 `deploy/.env.example`  
> **填表示例**：[`deploy/.env.sample`](../../deploy/.env.sample)（含示例值与「请替换」标注，可复制后改）  
> **原则**：复制后改值，**永不 commit 到 Git**

```bash
cd /opt/mianshi/deploy
cp .env.example .env
nano .env   # 或 vim
```

---

### 5.1 `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB`

| 变量 | 给什么 | 怎么获取 | 意义/作用 |
|------|--------|----------|-----------|
| `POSTGRES_USER` | 数据库用户名 | 自定义，默认 `mianshi` 即可 | PostgreSQL 容器初始化账号 |
| `POSTGRES_PASSWORD` | 数据库密码 | **自己生成强密码**（16+ 位随机） | 保护数据库；compose 注入 postgres 与 api |
| `POSTGRES_DB` | 库名 | 默认 `mianshi` | 应用连接的数据库名 |

**生成强密码示例：**

```bash
openssl rand -base64 24
```

**作用链**：`docker-compose.prod.yml` 用这些值启动 postgres 容器，并拼成 `DATABASE_URL` 传给 API。

---

### 5.2 `JWT_SECRET`

| 项 | 内容 |
|----|------|
| **给什么** | ≥32 字符的随机字符串 |
| **怎么获取** | `openssl rand -base64 48` 或 Node：`node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"` |
| **意义/作用** | 签发/校验用户登录 Token；泄露则攻击者可伪造任意用户身份 |
| **注意** | 上线后不要随意更换，否则所有用户需重新登录 |

---

### 5.3 `ADMIN_EMAIL` / `ADMIN_PASSWORD`

| 变量 | 给什么 | 怎么获取 | 意义/作用 |
|------|--------|----------|-----------|
| `ADMIN_EMAIL` | 管理员登录邮箱 | 你指定的邮箱 | 首次启动自动创建 admin 账号 |
| `ADMIN_PASSWORD` | 管理员密码 | **强密码，生产必填** | 登录 `/admin` 运营后台；未设置则 API **拒绝启动** |

**作用**：API 启动时 `ensureAdminUser()` 在 PostgreSQL 中创建管理员，用于题库审核、智能导入等。

---

### 5.4 `CORS_ORIGIN`

| 项 | 内容 |
|----|------|
| **给什么** | 前端访问来源 URL（协议 + 域名/IP + 端口） |
| **怎么获取** | 用户实际打开网站的地址 |
| **意义/作用** | 浏览器跨域安全；API 只接受来自该源的请求 |
| **示例** | `https://mianshi.example.com` 或 `http://203.0.113.10:8080` |
| **多个** | 逗号分隔：`https://mianshi.example.com,http://localhost:5174` |

**常见错误**：填了 `https://域名` 但用户访问 `http://IP:8080` → 浏览器报 CORS 错误。

---

### 5.5 `LLM_API_KEY` / `LLM_BASE_URL` / `LLM_MODEL`

| 变量 | 给什么 | 怎么获取 | 意义/作用 |
|------|--------|----------|-----------|
| `LLM_API_KEY` | 大模型 API Key | [DeepSeek 开放平台](https://platform.deepseek.com) 注册申请 | 模拟面试、简历优化、智能导入等 AI 能力 |
| `LLM_BASE_URL` | API 地址 | DeepSeek 默认 `https://api.deepseek.com/v1` | OpenAI 兼容接口根路径 |
| `LLM_MODEL` | 模型名 | 如 `deepseek-chat` | 指定调用哪个模型 |

**不填 Key 时**：自动 **Demo 降级**（假数据演示），可访问但 AI 非真实推理。

---

### 5.6 `API_PORT` / `WEB_PORT`

| 变量 | 默认 | 意义/作用 |
|------|------|-----------|
| `API_PORT` | `8788` | API 映射到宿主机的端口（一般仅内网/调试） |
| `WEB_PORT` | `8080` | **用户访问网站的端口**；Nginx 反代 `/api` 到 api 容器 |

---

### 5.7 可选项

| 变量 | 意义/作用 | 何时需要 |
|------|-----------|----------|
| `TTS_API_KEY` | 豆包语音合成 | 需要服务端 TTS 时 |
| `WORKER_INTERNAL_KEY` | Worker 与 API 内部通信密钥 | 部署 Boss 智能投递 Worker 时 |

---

## 6. 完整操作流程

### 阶段 A：本地准备（一次性）

| 步骤 | 操作 | 目的 |
|------|------|------|
| A1 | 代码 push 到 GitHub `main` | 建立 CD 源 |
| A2 | 配置 5 个 GitHub Secrets（§4） | Actions 能 SSH 部署 |
| A3 | `.\scripts\check-secrets.ps1` | 确认没有把密钥 commit 进仓库 |

---

### 阶段 B：服务器首次部署（一次性）

```bash
# B1 安装 Docker（§3.2）

# B2 创建目录并 clone
sudo mkdir -p /opt/mianshi
sudo chown $USER:$USER /opt/mianshi
git clone https://github.com/YOUR_USER/mianshi.git /opt/mianshi

# B3 配置 .env
cd /opt/mianshi/deploy
cp .env.example .env
nano .env    # 按 §5 填写所有必配项

# B4 首次启动（本地构建镜像）
docker compose -f docker-compose.prod.yml up -d --build

# B5 验收
curl -sf http://127.0.0.1:8788/api/health && echo " API OK"
curl -sf -o /dev/null -w "%{http_code}" http://127.0.0.1:8080/ && echo " Web OK"
```

| 步骤 | 给什么 / 做什么 | 结果 |
|------|-----------------|------|
| B4 | compose 读取 `.env` 启动 3 容器 | postgres 建库 + API 迁移种子数据 + Web 提供前端 |
| B5 | 健康检查 | 确认 API/Web 正常 |

**浏览器访问**：`http://服务器IP:8080`

**管理员登录**：`ADMIN_EMAIL` + `ADMIN_PASSWORD` → `/admin`

---

### 阶段 C：开启自动部署（之后每次发版）

| 步骤 | 操作 | 结果 |
|------|------|------|
| C1 | 本地改代码 → `git push origin main` | 触发 `.github/workflows/ci.yml` 测试 |
| C2 | CI 通过后 `cd.yml` 构建镜像 push GHCR | 服务器无需手动 build |
| C3 | Actions SSH → `deploy/update.sh --images --skip-pull` | 拉新镜像、重启容器、curl 健康检查 |

**你日常只需**：改代码 → push → 等 Actions 绿 → 刷新网站验证。

---

## 7. 发布后验收清单

| # | 检查项 | 怎么验 | 通过标准 |
|---|--------|--------|----------|
| 1 | API 健康 | `curl http://IP:8788/api/health` | 返回 JSON，`ok` 或 200 |
| 2 | LLM 状态 | `curl "http://IP:8788/api/info?probe=1"` | 有 `llm` / `llmProbe` 字段 |
| 3 | 前端首页 | 浏览器打开 `:8080` | 页面正常，无白屏 |
| 4 | 用户注册 | `/register` 注册 → `/login` 登录 | 成功进入站内 |
| 5 | 管理后台 | `/admin` 用 ADMIN 账号登录 | 进入运营后台 |
| 6 | 模拟面试 | 开始一场面试 | 能对话（Demo 或真实 LLM） |
| 7 | 简历 | 创建 → 编辑 → 导出 | 主链路可用 |
| 8 | CD 自动更新 | push 小改动 → 看 Actions | CD job 绿，网站版本更新 |

---

## 8. 常见问题

### Q1：CD 构建了镜像但没部署到服务器

**原因**：5 个 GitHub Secret 未配全。  
**现象**：Actions 日志 `CD deploy skipped — missing GitHub Secrets`。  
**处理**：补全 §4 五个 Secret → 重新 push 或手动 Run workflow。

---

### Q2：浏览器报 CORS 错误

**原因**：`CORS_ORIGIN` 与用户实际访问 URL 不一致。  
**处理**：修改服务器 `deploy/.env` 中 `CORS_ORIGIN` → `docker compose -f docker-compose.prod.yml up -d` 重启 api。

---

### Q3：API 启动失败 `ADMIN_PASSWORD is required`

**原因**：生产环境未设置管理员密码。  
**处理**：在 `.env` 设置 `ADMIN_PASSWORD=强密码` → 重启 api 容器。

---

### Q4：SSH 部署失败 Permission denied

**排查**：

1. 本地 `ssh -i 私钥 用户@HOST` 能否登录
2. 服务器 `~/.ssh/authorized_keys` 是否含对应公钥
3. `DEPLOY_USER` / `DEPLOY_HOST` 是否写错

---

### Q5：docker pull GHCR 失败 unauthorized

**原因**：`GHCR_READ_TOKEN` 无效或权限不足。  
**处理**：重新生成 PAT，确保有 `read:packages` → 更新 GitHub Secret。

---

### Q6：端口 8080 外网访问不了

**排查**：

1. 云厂商安全组是否放行 **8080/TCP**
2. 服务器 `ufw` / `firewalld` 是否放行
3. 容器是否运行：`docker compose -f docker-compose.prod.yml ps`

---

## 9. 配置对照速查表

### GitHub Secrets → 作用

| Secret | 作用一句话 |
|--------|------------|
| `DEPLOY_HOST` | 告诉 Actions 连哪台机器 |
| `DEPLOY_USER` | SSH 用哪个用户登录 |
| `DEPLOY_SSH_KEY` | SSH 私钥，证明 Actions 有权限 |
| `DEPLOY_PATH` | 到服务器哪个目录执行更新脚本 |
| `GHCR_READ_TOKEN` | 服务器拉 Docker 镜像的凭证 |

### 服务器 `.env` → 作用

| 变量 | 作用一句话 |
|------|------------|
| `POSTGRES_*` | 数据库账号库名密码 |
| `JWT_SECRET` | 用户登录 Token 签名 |
| `ADMIN_*` | 运营后台管理员账号 |
| `CORS_ORIGIN` | 允许哪个前端域名调 API |
| `LLM_*` | AI 面试/简历能力 |
| `*_PORT` | 对外暴露端口 |

---

## 10. 相关文档

| 文档 | 用途 |
|------|------|
| [LAUNCH-CHECKLIST.md](./LAUNCH-CHECKLIST.md) | 上线门禁与进度 |
| [deploy/GITHUB-SECRETS.md](../../deploy/GITHUB-SECRETS.md) | Secrets 精简版 |
| [deploy/AUTO-DEPLOY.md](../../deploy/AUTO-DEPLOY.md) | CD 流程说明 |
| [POSTGRESQL_GUIDE.md](../POSTGRESQL_GUIDE.md) | 数据库本地调试 |

---

## 11. 交给稳航的最小信息包

若请人代部署，请一次性提供：

```
1. 服务器 IP：
2. SSH 用户名：
3. 域名（如有）：
4. GitHub 仓库 URL：
5. 是否已有 Docker：
6. LLM API Key（如有）：
7. 期望管理员邮箱：
```

其余（JWT、DB 密码、SSH 部署密钥）可由运维按本文 §4–§5 生成，**通过安全渠道单独传递，不要发在公开聊天里**。
