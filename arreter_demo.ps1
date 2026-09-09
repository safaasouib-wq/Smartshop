# Arrete proprement tous les process de la demo SmartShop (backend, Vite, tunnel).
$ErrorActionPreference = 'Continue'
Write-Host '== Arret de la demo SmartShop ==' -ForegroundColor Cyan

# Backend uvicorn
Get-CimInstance Win32_Process -Filter "Name='python.exe'" |
    Where-Object { $_.CommandLine -match 'uvicorn' } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue; "backend $($_.ProcessId) arrete" }

# Tunnel cloudflared
Get-Process cloudflared -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue; "cloudflared $($_.Id) arrete" }

# Frontend Vite (process qui ecoute sur 5173)
$p5173 = (Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue).OwningProcess
if ($p5173) { $p5173 | Sort-Object -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue; "vite $_ arrete" } }

Write-Host 'Tout est arrete.' -ForegroundColor Green
