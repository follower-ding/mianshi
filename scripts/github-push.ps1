# Initialize remote and push (reads deploy/repo.env)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

& "$PSScriptRoot\check-secrets.ps1"
if ($LASTEXITCODE -ne 0) { exit 1 }

if (Get-Command gh -ErrorAction SilentlyContinue) {
  & "$PSScriptRoot\verify-github-secrets.ps1"
  if ($LASTEXITCODE -ne 0) {
    Write-Host 'CD secrets missing — push will build images but skip deploy. See deploy/GITHUB-SECRETS.md' -ForegroundColor Yellow
  }
}

$repoEnv = Join-Path $root 'deploy\repo.env'
if (-not (Test-Path $repoEnv)) {
  Write-Host 'Missing deploy/repo.env — copy from deploy/repo.env.example' -ForegroundColor Red
  exit 1
}

Get-Content $repoEnv | ForEach-Object {
  if ($_ -match '^\s*GITHUB_REPO_URL=(.+)$') {
    $script:repoUrl = $Matches[1].Trim().Trim('"')
  }
}

if (-not $repoUrl) {
  Write-Host 'GITHUB_REPO_URL not set in deploy/repo.env' -ForegroundColor Red
  exit 1
}

if (-not (Test-Path (Join-Path $root '.git'))) {
  git init -b main
}

$remote = git remote get-url origin 2>$null
if ($LASTEXITCODE -ne 0) {
  git remote add origin $repoUrl
} elseif ($remote -ne $repoUrl) {
  Write-Host "Remote origin is $remote — update deploy/repo.env if needed"
}

git add -A
git status
Write-Host 'Review above. Run: git commit -m "..." ; git push -u origin main'
