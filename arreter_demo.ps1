# Arrête proprement tous les process de la démo SmartShop (backend, Vite, tunnel).
$ErrorActionPreference = 'Continue'
Write-Host '== Arrêt de la démo SmartShop ==' -ForegroundColor Cyan

# Backend uvicorn
Get-CimInstance Win32_Process -Filter "Name='python.exe'" |
    Where-Object { $_.CommandLine -match 'uvicorn' } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue; "backend $($_.ProcessId) arrêté" }

# Tunnel cloudflared
Get-Process cloudflared -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue; "cloudflared $($_.Id) arrêté" }

# Frontend Vite (process qui écoute sur 5173)
$p5173 = (Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue).OwningProcess
if ($p5173) { $p5173 | Sort-Object -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue; "vite $_ arrêté" } }

Write-Host 'Tout est arrêté.' -ForegroundColor Green
