# mianshi 推送即发布（CD）

## 前置

1. GitHub 仓库 + Secrets（**详见 [GITHUB-SECRETS.md](./GITHUB-SECRETS.md)**）：
   - `DEPLOY_HOST` / `DEPLOY_USER` / `DEPLOY_SSH_KEY` / `DEPLOY_PATH`
   - `GHCR_READ_TOKEN`（服务器拉镜像）
2. 本地验证：`.\scripts\verify-github-secrets.ps1`（需 `gh auth login`）
3. 服务器：`deploy/.env`（从 `.env.example` 复制）
4. 本地：`deploy/repo.env`（从 `repo.env.example` 复制）

## 流程

```text
push main → GitHub Actions cd.yml
  → build GHCR images (mianshi-api, mianshi-web)
  → SSH → deploy/update.sh --images
```

## 首次部署

```bash
cd /opt/mianshi/deploy
cp .env.example .env   # 编辑密钥
docker compose -f docker-compose.prod.yml up -d --build
curl http://127.0.0.1:8788/api/health
```

## 推送前

```powershell
.\scripts\check-secrets.ps1
```

## 镜像

| 服务 | 镜像 |
|------|------|
| API | `ghcr.io/<owner>/mianshi-api:<sha>` |
| Web | `ghcr.io/<owner>/mianshi-web:<sha>` |

Web 通过 nginx 将 `/api` 反代到 `api:8788`。
