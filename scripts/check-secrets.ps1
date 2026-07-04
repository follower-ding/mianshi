# Secrets guard — exit 1 if staged files contain likely secrets
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$patterns = @(
  '(?i)(^|[^a-z])sk-[a-zA-Z0-9]{20,}',
  'ghp_[a-zA-Z0-9]{20,}',
  'gho_[a-zA-Z0-9]{20,}',
  'AKIA[0-9A-Z]{16}',
  '(?i)JWT_SECRET\s*=\s*[^\s#]{16,}',
  '(?i)(password|api_key|secret)\s*=\s*[^\s#]{8,}'
)

$blockedPaths = @(
  '\.env$',
  'deploy[/\\]\.env$',
  'deploy[/\\]repo\.env$',
  'deploy_key',
  '\.pem$'
)

$issues = @()

# Block committing env files by path
git diff --cached --name-only 2>$null | ForEach-Object {
  foreach ($bp in $blockedPaths) {
    if ($_ -match $bp) {
      $issues += "Blocked path staged: $_"
    }
  }
}

# Scan staged diff for secret patterns
$diff = git diff --cached -U0 2>$null
if ($diff) {
  foreach ($pat in $patterns) {
    if ($diff -match $pat) {
      $issues += "Possible secret pattern matched: $pat"
    }
  }
}

if ($issues.Count -gt 0) {
  Write-Host 'secrets-guard: FAILED' -ForegroundColor Red
  $issues | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
  exit 1
}

Write-Host 'secrets-guard: ok'
exit 0
