#!/usr/bin/env bash
# mianshi 服务器一键部署（与同机其他项目共存，默认 8080 端口）
# 在服务器 Web 终端执行：
#   curl -fsSL https://raw.githubusercontent.com/follower-ding/mianshi/main/deploy/first-boot.sh | bash
set -euo pipefail

REPO="${MIANSHI_REPO:-https://github.com/follower-ding/mianshi.git}"
DIR="${MIANSHI_DIR:-/opt/mianshi}"
PUBLIC_IP="${MIANSHI_PUBLIC_IP:-49.235.172.214}"
WEB_PORT="${MIANSHI_WEB_PORT:-8080}"
API_PORT="${MIANSHI_API_PORT:-8789}"

echo "==> mianshi first-boot → $DIR (web :${WEB_PORT}, api :${API_PORT})"
echo "==> 若 :80 已被 super-ai-agent 占用，mianshi 使用独立端口 ${WEB_PORT}"

if ! command -v docker >/dev/null 2>&1; then
  echo "==> Installing Docker..."
  curl -fsSL https://get.docker.com | sh
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "ERROR: docker compose plugin missing" >&2
  exit 1
fi

sudo mkdir -p "$(dirname "$DIR")"
sudo chown "$USER:$USER" "$(dirname "$DIR")" 2>/dev/null || true

clone_repo() {
  if [ -d "$DIR/.git" ]; then
    git -C "$DIR" pull --ff-only && return 0
  fi
  rm -rf "$DIR"

  echo "==> git clone (shallow)..."
  if git clone --depth 1 "$REPO" "$DIR" 2>/dev/null; then return 0; fi

  echo "==> GitHub 直连失败，尝试镜像 clone..."
  if git clone --depth 1 "https://gitclone.com/github.com/follower-ding/mianshi.git" "$DIR" 2>/dev/null; then return 0; fi

  echo "==> 尝试下载 tarball..."
  TMP=$(mktemp -d)
  if curl -fsSL --connect-timeout 60 "https://ghproxy.net/${REPO}/archive/refs/heads/main.tar.gz" -o "$TMP/mianshi.tar.gz"; then
    tar -xzf "$TMP/mianshi.tar.gz" -C "$TMP"
    mv "$TMP/mianshi-main" "$DIR"
    rm -rf "$TMP"
    return 0
  fi
  rm -rf "$TMP"
  echo "ERROR: 无法从 GitHub 拉取代码，请检查服务器网络或手动 scp 上传" >&2
  exit 1
}

clone_repo

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
CORS_ORIGIN=http://${PUBLIC_IP}:${WEB_PORT}
API_PORT=${API_PORT}
WEB_PORT=${WEB_PORT}
TTS_API_KEY=
WORKER_INTERNAL_KEY=wk_mianshi_internal_7f3a9c2e1b8d4f6a
EOF
  echo "==> Created deploy/.env"
else
  echo "==> deploy/.env exists, skip"
fi

cd "$DIR/deploy"
docker compose -f docker-compose.prod.yml up -d --build

echo "==> Waiting for services..."
for i in $(seq 1 40); do
  if curl -sf "http://127.0.0.1:${API_PORT}/api/health" >/dev/null 2>&1; then
    break
  fi
  sleep 3
done

curl -sf "http://127.0.0.1:${API_PORT}/api/health" && echo " API ok" || echo " API pending..."
curl -sf -o /dev/null -w "Web HTTP %{http_code}\n" "http://127.0.0.1:${WEB_PORT}/" || true

echo ""
echo "=========================================="
echo "  mianshi 已启动（与 super-ai-agent 共存）"
echo "  mianshi:  http://${PUBLIC_IP}:${WEB_PORT}"
echo "  后台:     http://${PUBLIC_IP}:${WEB_PORT}/admin"
echo "  管理员:   admin@mianshi.local / admin123456"
echo "  (原 :80  super-ai-agent 不受影响)"
echo "=========================================="
