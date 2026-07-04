# Verify GitHub Actions secrets required for CD deploy
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$required = @(
  'DEPLOY_HOST',
  'DEPLOY_USER',
  'DEPLOY_SSH_KEY',
  'DEPLOY_PATH',
  'GHCR_READ_TOKEN'
)

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  Write-Host 'verify-github-secrets: gh CLI not found' -ForegroundColor Red
  Write-Host 'Install: https://cli.github.com/  then run: gh auth login'
  Write-Host 'Or configure secrets manually — see deploy/GITHUB-SECRETS.md'
  exit 1
}

$authStatus = gh auth status 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Host 'verify-github-secrets: not logged in to GitHub' -ForegroundColor Red
  Write-Host 'Run: gh auth login'
  exit 1
}

try {
  $repo = gh repo view --json nameWithOwner -q .nameWithOwner 2>$null
} catch {
  $repo = $null
}

if (-not $repo) {
  Write-Host 'verify-github-secrets: not inside a GitHub repo (or no remote)' -ForegroundColor Yellow
  Write-Host 'Required secrets (configure at GitHub → Settings → Secrets → Actions):'
  $required | ForEach-Object { Write-Host "  - $_" }
  exit 1
}

Write-Host "Checking secrets for $repo ..."

$listed = gh secret list --repo $repo 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Host 'verify-github-secrets: cannot list secrets (need repo admin?)' -ForegroundColor Red
  exit 1
}

$names = @()
foreach ($line in ($listed -split "`n")) {
  if ($line -match '^(\S+)') { $names += $Matches[1] }
}

$missing = @()
foreach ($s in $required) {
  if ($names -notcontains $s) { $missing += $s }
}

if ($missing.Count -gt 0) {
  Write-Host 'verify-github-secrets: MISSING' -ForegroundColor Red
  $missing | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
  Write-Host ''
  Write-Host 'See deploy/GITHUB-SECRETS.md for setup steps.'
  Write-Host 'Quick set: gh secret set DEPLOY_HOST --body "your-host"'
  exit 1
}

Write-Host 'verify-github-secrets: ok (all CD secrets present)' -ForegroundColor Green
exit 0
