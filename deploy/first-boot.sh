#!/usr/bin/env bash
# mianshi 服务器一键首次部署（在服务器 Web 终端 / SSH 中执行）
# 推送 GitHub 后执行：
#   curl -fsSL https://raw.githubusercontent.com/follower-ding/mianshi/main/deploy/first-boot.sh | bash
set -euo pipefail

REPO="${MIANSHI_REPO:-https://github.com/follower-ding/mianshi.git}"
DIR="${MIANSHI_DIR:-/opt/mianshi}"
PUBLIC_IP="${MIANSHI_PUBLIC_IP:-49.235.172.214}"

echo "==> mianshi first-boot → $DIR"

if ! command -v docker >/dev/null 2>&1; then
  echo "==> Installing Docker..."
  curl -fsSL https://get.docker.com | sh
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "ERROR: docker compose plugin missing" >&2
  exit 1
fi

sudo mkdir -p "$DIR"
sudo chown "$USER:$USER" "$DIR" 2>/dev/null || true

if [ ! -d "$DIR/.git" ]; then
  git clone "$REPO" "$DIR"
else
  git -C "$DIR" pull --ff-only
fi

if [ ! -f "$DIR/deploy/.env" ]; then
  JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n')
  PG_PASS=$(openssl rand -base64 24 | tr -d '\n')
  cat > "$DIR/deploy/.env" <<EOF
POSTGRES_USER=mianshi
POSTGRES_PASSWORD=${PG_PASS}
POSTGRES_DB=mianshi
JWT_SECRET=${JWT_SECRET}
ADMIN_EMAIL=admin@mianshi.local
ADMIN_PASSWORD=admin123456
LLM_API_KEY=
LLM_BASE_URL=https://api.deepseek.com/v1
LLM_MODEL=deepseek-chat
CORS_ORIGIN=http://${PUBLIC_IP}
API_PORT=8788
WEB_PORT=80
TTS_API_KEY=
WORKER_INTERNAL_KEY=wk_mianshi_internal_7f3a9c2e1b8d4f6a
EOF
  echo "==> Created deploy/.env (admin: admin@mianshi.local / admin123456)"
else
  echo "==> deploy/.env exists, skip"
fi

cd "$DIR/deploy"
docker compose -f docker-compose.prod.yml up -d --build

echo "==> Waiting for services..."
for i in $(seq 1 30); do
  if curl -sf "http://127.0.0.1:8788/api/health" >/dev/null 2>&1; then
    break
  fi
  sleep 3
done

curl -sf "http://127.0.0.1:8788/api/health" && echo " API ok"
curl -sf -o /dev/null -w "Web HTTP %{http_code}\n" "http://127.0.0.1:80/" || true

echo ""
echo "=========================================="
echo "  mianshi 已启动"
echo "  访问: http://${PUBLIC_IP}"
echo "  管理员: admin@mianshi.local / admin123456"
echo "  后台:   http://${PUBLIC_IP}/admin"
echo "=========================================="
