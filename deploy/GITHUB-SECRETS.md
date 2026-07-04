# GitHub Secrets 配置（CD 必需）

推送 `main` 后，`.github/workflows/cd.yml` 会构建 GHCR 镜像并通过 SSH 部署。以下 Secrets **必须在 GitHub 仓库中配置**，否则 deploy 阶段会跳过并告警。

## 配置入口

GitHub 仓库 → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

或使用 CLI（需 `gh auth login`）：

```powershell
gh secret set DEPLOY_HOST --body "203.0.113.10"
gh secret set DEPLOY_USER --body "ubuntu"
gh secret set DEPLOY_PATH --body "/opt/mianshi/deploy"
gh secret set DEPLOY_SSH_KEY < C:\Users\you\.ssh\mianshi_deploy
gh secret set GHCR_READ_TOKEN --body "ghp_xxxxxxxx"
```

## 必需 Secrets

| Secret | 说明 | 示例 |
|--------|------|------|
| `DEPLOY_HOST` | 服务器 IP 或域名 | `203.0.113.10` |
| `DEPLOY_USER` | SSH 用户名 | `ubuntu` |
| `DEPLOY_SSH_KEY` | 部署用私钥全文（OpenSSH 格式） | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `DEPLOY_PATH` | 服务器上 deploy 目录绝对路径 | `/opt/mianshi/deploy` |
| `GHCR_READ_TOKEN` | 服务器拉 GHCR 镜像的 PAT | `ghp_...` 或 Fine-grained token |

> `GITHUB_TOKEN` 由 Actions 自动注入，用于 push 镜像到 GHCR，**无需手动配置**。

## GHCR_READ_TOKEN 权限

Classic PAT 勾选：`read:packages`

Fine-grained token：Repository access 选本仓库，Packages 选 **Read**

若镜像为 private package，服务器必须能 `docker login ghcr.io` 成功。

## 服务器端（非 GitHub Secret）

在服务器 `deploy/.env` 配置应用密钥（**不要**提交到 Git）：

```bash
cp deploy/.env.example deploy/.env
# 编辑 POSTGRES_PASSWORD、JWT_SECRET、LLM_API_KEY、CORS_ORIGIN
```

详见 [AUTO-DEPLOY.md](./AUTO-DEPLOY.md)。

## 验证

本地（需 [GitHub CLI](https://cli.github.com/)）：

```powershell
.\scripts\verify-github-secrets.ps1
```

推送前密钥扫描：

```powershell
.\scripts\check-secrets.ps1
```

## Deploy 跳过 vs 失败

| 情况 | 行为 |
|------|------|
| Secrets 未配置 | `validate-secrets` 输出警告，**跳过 SSH 部署**；镜像仍会 push 到 GHCR |
| Secrets 已配置但 SSH 失败 | deploy job **失败**，需在 Actions 日志排查 |
| 仅想构建镜像 | Actions → CD → **Run workflow**（无 Secrets 时只完成 publish） |

## 首次服务器准备

```bash
sudo mkdir -p /opt/mianshi
sudo chown $USER:$USER /opt/mianshi
git clone https://github.com/YOUR_USER/mianshi.git /opt/mianshi
cd /opt/mianshi/deploy
cp .env.example .env   # 编辑
docker compose -f docker-compose.prod.yml up -d --build
curl -sf http://127.0.0.1:8788/api/health
```

之后每次 `git push origin main` 将自动更新镜像并 SSH 执行 `./update.sh --images --skip-pull`。
