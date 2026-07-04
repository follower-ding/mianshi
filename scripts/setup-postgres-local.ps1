# Windows 本机 PostgreSQL 一键配置（Offer通 项目）
# 用法：& d:\cursor_project\mianshi\scripts\setup-postgres-local.ps1
# 可选参数：-PostgresPassword postgres  （超级用户 postgres 的密码）

param(
  [string]$PostgresPassword = 'postgres',
  [string]$AppUser = 'mianshi',
  [string]$AppPassword = 'mianshi',
  [string]$DbName = 'mianshi'
)

$ErrorActionPreference = 'Stop'
$psql = 'C:\Program Files\PostgreSQL\16\bin\psql.exe'

if (-not (Test-Path $psql)) {
  Write-Host '未找到 PostgreSQL 16，请先安装：' -ForegroundColor Yellow
  Write-Host '  winget install -e --id PostgreSQL.PostgreSQL.16' -ForegroundColor Cyan
  exit 1
}

$svc = Get-Service -Name 'postgresql-x64-16' -ErrorAction SilentlyContinue
if ($svc -and $svc.Status -ne 'Running') {
  Start-Service postgresql-x64-16
  Write-Host '已启动 PostgreSQL 服务' -ForegroundColor Green
}

$env:PGPASSWORD = $PostgresPassword

& $psql -U postgres -h localhost -c @"
DO `$`$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '$AppUser') THEN
    CREATE USER $AppUser WITH PASSWORD '$AppPassword';
  END IF;
END `$`$;
"@ | Out-Null

$dbExists = & $psql -U postgres -h localhost -tc "SELECT 1 FROM pg_database WHERE datname = '$DbName'"
if ($dbExists.Trim() -ne '1') {
  & $psql -U postgres -h localhost -c "CREATE DATABASE $DbName OWNER $AppUser;" | Out-Null
}

& $psql -U postgres -h localhost -c "GRANT ALL PRIVILEGES ON DATABASE $DbName TO $AppUser;" | Out-Null

$env:PGPASSWORD = $AppPassword
& $psql -U $AppUser -h localhost -d $DbName -c 'SELECT current_database(), current_user;' | Out-Null

$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root 'mianshi-api\.env'
$databaseUrl = "postgresql://${AppUser}:${AppPassword}@localhost:5432/${DbName}"

if (Test-Path $envFile) {
  $content = Get-Content $envFile -Raw
  if ($content -match '(?m)^DATABASE_URL=') {
    $content = $content -replace '(?m)^DATABASE_URL=.*', "DATABASE_URL=$databaseUrl"
  } else {
    $content += "`nDATABASE_URL=$databaseUrl`n"
  }
  if ($content -notmatch '(?m)^JWT_SECRET=') { $content += "JWT_SECRET=mianshi-local-dev-secret`n" }
  if ($content -notmatch '(?m)^ADMIN_EMAIL=') { $content += "ADMIN_EMAIL=admin@mianshi.local`n" }
  if ($content -notmatch '(?m)^ADMIN_PASSWORD=') { $content += "ADMIN_PASSWORD=admin123456`n" }
  Set-Content $envFile $content -NoNewline
} else {
  Copy-Item (Join-Path $root 'mianshi-api\.env.example') $envFile
  Write-Host '已从 .env.example 复制，请补充 LLM_API_KEY 等配置' -ForegroundColor Yellow
}

Write-Host ''
Write-Host 'PostgreSQL 配置完成！' -ForegroundColor Green
Write-Host "  连接串: $databaseUrl"
Write-Host '  管理员: admin@mianshi.local / admin123456'
Write-Host '  下一步: cd mianshi-api; npm run dev'
Write-Host '  看到 [DB] PostgreSQL ready 即成功'
