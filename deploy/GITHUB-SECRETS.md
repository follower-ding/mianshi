# GitHub Secrets 配置（CD 必需）

推送 `main` 后，`.github/workflows/cd.yml` 会构建 GHCR 镜像并通过 SSH 部署。以下 Secrets **必须在 GitHub 仓库中配置**，否则 deploy 阶段会跳过并告警。

## 配置入口

GitHub 仓库 → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

或使用 CLI（需 `gh auth login`）：

```powershell
# 推荐：一键配置（生成密钥 + 写入 Secrets）
.\scripts\setup-github-cd.ps1

# 或手动
gh secret set DEPLOY_HOST --body "49.235.172.214"
gh secret set DEPLOY_USER --body "ubuntu"
gh secret set DEPLOY_SSH_PORT --body "2222"
gh secret set DEPLOY_PATH --body "/opt/mianshi/deploy"
gh secret set DEPLOY_SSH_KEY < C:\Users\you\.ssh\mianshi_github_cd
gh secret set GHCR_READ_TOKEN --body "$(gh auth token)"
```

## 必需 Secrets

| Secret | 说明 | 示例 |
|--------|------|------|
| `DEPLOY_HOST` | 服务器 IP 或域名 | `49.235.172.214` |
| `DEPLOY_USER` | SSH 用户名 | `ubuntu` |
| `DEPLOY_SSH_PORT` | SSH 端口 | `2222`（本机 22 关闭时用 2222） |
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
# 1. 本机运行 setup-github-cd.ps1 后，把打印的公钥加入服务器：
grep -qF 'github-actions-mianshi' ~/.ssh/authorized_keys || echo 'ssh-ed25519 AAAA... github-actions-mianshi' >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# 2. 确保项目已 clone 且 .env 已配置（WEB_PORT=8090）
cd /opt/mianshi/deploy
docker compose -f docker-compose.prod.yml ps
```

之后每次 **`git push origin main`** → Actions 自动构建 GHCR 镜像 → SSH 执行 `update.sh --images`。
