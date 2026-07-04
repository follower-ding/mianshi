# 同时启动前后端
$root = Split-Path -Parent $PSScriptRoot

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\mianshi-api'; npm run dev"
Start-Sleep -Seconds 2
Set-Location "$root\mianshi-frontend"
npm run dev
