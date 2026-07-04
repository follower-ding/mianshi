#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

USE_IMAGES=false
SKIP_PULL=false
for arg in "$@"; do
  case "$arg" in
    --images) USE_IMAGES=true ;;
    --skip-pull) SKIP_PULL=true ;;
  esac
done

if [ "$SKIP_PULL" = false ]; then
  git pull --ff-only
fi

COMPOSE="docker compose -f docker-compose.prod.yml"
if [ "$USE_IMAGES" = true ]; then
  COMPOSE="$COMPOSE -f docker-compose.images.yml"
  $COMPOSE pull
fi

$COMPOSE up -d --build
$COMPOSE ps

curl -sf "http://127.0.0.1:${API_PORT:-8788}/api/health" && echo " API ok"
