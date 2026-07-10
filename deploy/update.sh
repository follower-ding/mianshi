#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

USE_IMAGES=false
SKIP_PULL=false
for arg in "$@"; do
  case "$arg" in
    --images) USE_IMAGES=true ;;
    --skip-pull) SKIP_PULL=true ;;
  esac
done

if [ "$SKIP_PULL" = false ]; then
  git -C .. pull --ff-only
fi

COMPOSE="docker compose -f docker-compose.prod.yml"
if [ "$USE_IMAGES" = true ]; then
  COMPOSE="$COMPOSE -f docker-compose.images.yml"
  $COMPOSE pull
  $COMPOSE up -d --no-build --remove-orphans
else
  $COMPOSE up -d --build --remove-orphans
fi

$COMPOSE ps

API_PORT="${API_PORT:-8789}"
WEB_PORT="${WEB_PORT:-8090}"
curl -sf "http://127.0.0.1:${API_PORT}/api/health" && echo " API ok"
curl -sf -o /dev/null -w "Web HTTP %{http_code}\n" "http://127.0.0.1:${WEB_PORT}/"
