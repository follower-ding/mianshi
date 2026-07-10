# 一键配置 GitHub Actions CD Secrets（推送即发布）
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  Write-Host '请先安装 GitHub CLI: https://cli.github.com/' -ForegroundColor Red
  exit 1
}

$repo = gh repo view --json nameWithOwner -q .nameWithOwner 2>$null
if (-not $repo) { $repo = 'follower-ding/mianshi' }

$hostIp = Read-Host '服务器 IP [49.235.172.214]'
if ([string]::IsNullOrWhiteSpace($hostIp)) { $hostIp = '49.235.172.214' }

$user = Read-Host 'SSH 用户 [ubuntu]'
if ([string]::IsNullOrWhiteSpace($user)) { $user = 'ubuntu' }

$port = Read-Host 'SSH 端口 [2222]'
if ([string]::IsNullOrWhiteSpace($port)) { $port = '2222' }

$deployPath = Read-Host 'deploy 目录 [/opt/mianshi/deploy]'
if ([string]::IsNullOrWhiteSpace($deployPath)) { $deployPath = '/opt/mianshi/deploy' }

$keyPath = Join-Path $env:USERPROFILE '.ssh\mianshi_github_cd'
if (-not (Test-Path $keyPath)) {
  Write-Host "生成部署密钥: $keyPath"
  ssh-keygen -t ed25519 -f $keyPath -N '""' -C 'github-actions-mianshi'
}

$privKey = Get-Content $keyPath -Raw
$pubKey = Get-Content "$keyPath.pub" -Raw

$ghToken = gh auth token

Write-Host "写入 GitHub Secrets ($repo) ..."
gh secret set DEPLOY_HOST --body $hostIp --repo $repo
gh secret set DEPLOY_USER --body $user --repo $repo
gh secret set DEPLOY_SSH_PORT --body $port --repo $repo
gh secret set DEPLOY_PATH --body $deployPath --repo $repo
gh secret set DEPLOY_SSH_KEY --body $privKey --repo $repo
gh secret set GHCR_READ_TOKEN --body $ghToken --repo $repo

Write-Host ''
Write-Host 'GitHub Secrets 已配置。' -ForegroundColor Green
Write-Host ''
Write-Host '=== 还需在服务器执行一次（OrcaTerm 粘贴）===' -ForegroundColor Yellow
Write-Host "mkdir -p ~/.ssh && chmod 700 ~/.ssh"
Write-Host "grep -qF '$($pubKey.Trim())' ~/.ssh/authorized_keys 2>/dev/null || echo '$($pubKey.Trim())' >> ~/.ssh/authorized_keys"
Write-Host "chmod 600 ~/.ssh/authorized_keys"
Write-Host ''
Write-Host '或: cd /opt/mianshi/deploy && bash setup-cd-server.sh ''PASTE_PUBKEY'''
Write-Host ''
Write-Host '完成后: git push origin main 即自动构建并部署到服务器。'
