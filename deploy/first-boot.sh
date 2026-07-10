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

# 清理旧目录（可能由 root/其他用户创建，需 sudo）
if [ -e "$DIR" ]; then
  echo "==> 清理旧目录 $DIR ..."
  sudo rm -rf "$DIR"
fi
sudo mkdir -p "$DIR"
sudo chown "$USER:$USER" "$DIR"

verify_repo() {
  if [ -f "$DIR/deploy/docker-compose.prod.yml" ]; then
    return 0
  fi
  echo "ERROR: 代码不完整，缺少 deploy/docker-compose.prod.yml" >&2
  ls -la "$DIR" 2>/dev/null || true
  return 1
}

download_tarball() {
  local url="$1"
  local tmp
  tmp=$(mktemp -d)
  echo "    → $url"
  if curl -fsSL --connect-timeout 30 --max-time 300 "$url" -o "$tmp/mianshi.tar.gz"; then
    tar -xzf "$tmp/mianshi.tar.gz" -C "$tmp"
    sudo rm -rf "$DIR"
    sudo mv "$tmp"/mianshi-main "$DIR"
    sudo chown -R "$USER:$USER" "$DIR"
    rm -rf "$tmp"
    return 0
  fi
  rm -rf "$tmp"
  return 1
}

clone_repo() {
  if [ -d "$DIR/.git" ] && verify_repo; then
    echo "==> 已有代码，git pull..."
    git -C "$DIR" pull --ff-only && return 0
  fi
  sudo rm -rf "$DIR"
  sudo mkdir -p "$DIR"
  sudo chown "$USER:$USER" "$DIR"

  echo "==> git clone (shallow)..."
  if git clone --depth 1 "$REPO" "$DIR" 2>/dev/null && verify_repo; then return 0; fi
  sudo rm -rf "$DIR"
  sudo mkdir -p "$DIR" && sudo chown "$USER:$USER" "$DIR"

  echo "==> GitHub 直连失败，尝试 gitclone 镜像..."
  if git clone --depth 1 "https://gitclone.com/github.com/follower-ding/mianshi.git" "$DIR" 2>/dev/null && verify_repo; then return 0; fi
  sudo rm -rf "$DIR"
  sudo mkdir -p "$DIR" && sudo chown "$USER:$USER" "$DIR"

  echo "==> 尝试下载 tarball（多镜像）..."
  download_tarball "https://ghproxy.net/https://github.com/follower-ding/mianshi/archive/refs/heads/main.tar.gz" && verify_repo && return 0
  sudo rm -rf "$DIR"
  download_tarball "https://mirror.ghproxy.com/https://github.com/follower-ding/mianshi/archive/refs/heads/main.tar.gz" && verify_repo && return 0
  sudo rm -rf "$DIR"
  download_tarball "https://ghfast.top/https://github.com/follower-ding/mianshi/archive/refs/heads/main.tar.gz" && verify_repo && return 0

  sudo rm -rf "$DIR"
  echo "ERROR: 无法从 GitHub 拉取代码。请用下方「整段粘贴」命令，或从本机 scp 上传。" >&2
  exit 1
}

clone_repo
mkdir -p "$DIR/deploy"

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
