#!/usr/bin/env bash
# 服务器一次性 CD 准备：把 GitHub Actions 部署公钥加入 authorized_keys
# 用法：在 OrcaTerm 粘贴 DEPLOY_PUBKEY 后执行
set -euo pipefail

DEPLOY_PUBKEY="${1:-}"

if [ -z "$DEPLOY_PUBKEY" ]; then
  echo "用法: bash setup-cd-server.sh 'ssh-ed25519 AAAA... github-actions-mianshi'"
  echo "公钥由本机 scripts/setup-github-cd.ps1 生成并打印"
  exit 1
fi

mkdir -p ~/.ssh
chmod 700 ~/.ssh
AUTH=~/.ssh/authorized_keys
touch "$AUTH"
chmod 600 "$AUTH"

if grep -qF "$DEPLOY_PUBKEY" "$AUTH" 2>/dev/null; then
  echo "公钥已存在，跳过"
else
  echo "$DEPLOY_PUBKEY" >> "$AUTH"
  echo "已写入 authorized_keys"
fi

# 确保 deploy 目录与 git 可用
if [ ! -d /opt/mianshi/.git ]; then
  echo "ERROR: /opt/mianshi 不存在，请先 git clone"
  exit 1
fi

cd /opt/mianshi/deploy
chmod +x update.sh setup-cd-server.sh 2>/dev/null || true

echo ""
echo "CD 服务器准备完成。之后 push main 将自动部署。"
echo "验证 SSH（在本机）: ssh -p 2222 -i ~/.ssh/mianshi_github_cd ubuntu@49.235.172.214 'cd /opt/mianshi/deploy && ./update.sh --images'"
