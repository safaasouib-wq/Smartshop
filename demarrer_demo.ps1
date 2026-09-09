# ============================================================================
#  SmartShop - Demarrage de la demo (soutenance PC-only) en UNE commande.
#
#  Lance dans l'ordre :
#    1. Nettoyage des anciens process (evite les process fantomes sur :8000)
#    2. Backend  FastAPI              -> http://127.0.0.1:8000
#    3. Frontend Vite (vitrine+admin) -> http://localhost:5173
#    4. Tunnel cloudflared -> backend  (necessaire UNIQUEMENT pour le bot Telegram)
#    5. setWebhook Telegram automatique sur la nouvelle URL du tunnel
#
#  Usage (dans un terminal PowerShell, depuis n'importe ou) :
#     powershell -ExecutionPolicy Bypass -File D:\Projets\smartshop\demarrer_demo.ps1
#
#  Pour tout arreter : .\arreter_demo.ps1
#
#  NOTE : fichier volontairement en ASCII pur (pas d'accents) pour eviter les
#  erreurs de parsing de Windows PowerShell 5.1 quand le .ps1 n'a pas de BOM.
# ============================================================================
$ErrorActionPreference = 'Continue'
$root     = Split-Path -Parent $MyInvocation.MyCommand.Path
$backend  = Join-Path $root 'backend'
$frontend = Join-Path $root 'frontend'
$py       = Join-Path $backend '.venv\Scripts\python.exe'
$logDir   = Join-Path $env:TEMP 'smartshop-demo'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

# Resolution de cloudflared (PATH, sinon emplacement d'installation par defaut)
$cf = (Get-Command cloudflared -ErrorAction SilentlyContinue).Source
if (-not $cf) { $cf = 'C:\Program Files (x86)\cloudflared\cloudflared.exe' }

function Titre($t) { Write-Host "`n== $t ==" -ForegroundColor Cyan }

# ---------------------------------------------------------------- 1. Nettoyage
Titre 'Nettoyage des anciens process'
Get-CimInstance Win32_Process -Filter "Name='python.exe'" |
    Where-Object { $_.CommandLine -match 'uvicorn' } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
$p5173 = (Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue).OwningProcess
if ($p5173) { $p5173 | Sort-Object -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue } }
Start-Sleep 1
Write-Host 'OK' -ForegroundColor Green

# ---------------------------------------------------------------- 2. Backend
Titre 'Backend FastAPI (:8000)'
$env:PYTHONUTF8 = '1'; $env:PYTHONUNBUFFERED = '1'   # herite par le process enfant
Start-Process -FilePath $py `
    -ArgumentList '-m','uvicorn','app.main:app','--port','8000','--host','127.0.0.1' `
    -WorkingDirectory $backend -WindowStyle Minimized
$ok = $false
for ($i=0; $i -lt 20; $i++) {
    try { Invoke-RestMethod 'http://127.0.0.1:8000/' -TimeoutSec 3 | Out-Null; $ok = $true; break } catch { Start-Sleep 1 }
}
if ($ok) { Write-Host 'Backend pret' -ForegroundColor Green } else { Write-Host 'Backend NON demarre (voir la fenetre minimisee)' -ForegroundColor Red }

# ---------------------------------------------------------------- 3. Frontend
Titre 'Frontend Vite (vitrine + dashboard)'
Start-Process -FilePath 'cmd.exe' -ArgumentList '/c','npm run dev' `
    -WorkingDirectory $frontend -WindowStyle Minimized
Write-Host 'Vitrine   : http://localhost:5173' -ForegroundColor Green
Write-Host 'Dashboard : http://localhost:5173/admin' -ForegroundColor Green

# ---------------------------------------------------------------- 4. Tunnel (Telegram)
Titre 'Tunnel cloudflared -> backend (pour le bot Telegram)'
$cfOut = Join-Path $logDir 'cloudflared.out'
$cfErr = Join-Path $logDir 'cloudflared.err'
Remove-Item $cfOut,$cfErr -ErrorAction SilentlyContinue
Start-Process -FilePath $cf -ArgumentList 'tunnel','--url','http://127.0.0.1:8000' `
    -RedirectStandardOutput $cfOut -RedirectStandardError $cfErr -WindowStyle Minimized

$url = $null
for ($i=0; $i -lt 30; $i++) {
    Start-Sleep 1
    $txt = (Get-Content $cfOut,$cfErr -ErrorAction SilentlyContinue) -join "`n"
    $m = [regex]::Match($txt, 'https://[a-z0-9-]+\.trycloudflare\.com')
    if ($m.Success) { $url = $m.Value; break }
}

# ---------------------------------------------------------------- 5. setWebhook
if ($url) {
    Write-Host "Tunnel : $url" -ForegroundColor Green
    Titre 'Configuration du webhook Telegram'
    $line  = Select-String -Path (Join-Path $backend '.env') -Pattern '^TELEGRAM_BOT_TOKEN=(.+)$'
    $token = if ($line) { $line.Matches.Groups[1].Value.Trim() } else { '' }
    if ($token) {
        $hook = "$url/webhook/telegram"
        Start-Sleep 5   # laisse le tunnel etablir ses connexions avant que Telegram le valide
        $done = $false
        for ($t=1; $t -le 3 -and -not $done; $t++) {
            try {
                $r = Invoke-RestMethod "https://api.telegram.org/bot$token/setWebhook?url=$hook&drop_pending_updates=true" -TimeoutSec 30
                if ($r.ok) { Write-Host "Webhook OK -> $hook" -ForegroundColor Green; $done = $true }
                else { Write-Host "setWebhook a echoue: $($r.description)" -ForegroundColor Red; break }
            } catch { Write-Host "Tentative $t/3 echouee (reseau lent)..." -ForegroundColor Yellow; Start-Sleep 4 }
        }
        if (-not $done) { Write-Host 'setWebhook non confirme - relance le script ou refais-le a la main.' -ForegroundColor Red }
    } else { Write-Host 'TELEGRAM_BOT_TOKEN absent de backend\.env' -ForegroundColor Red }
} else {
    Write-Host 'Tunnel non obtenu - le bot Telegram ne fonctionnera pas.' -ForegroundColor Yellow
    Write-Host 'La demo LOCALE (vitrine + dashboard + panneau Test) marche quand meme.' -ForegroundColor Yellow
}

# ---------------------------------------------------------------- Recapitulatif
Write-Host "`n============================================================" -ForegroundColor Magenta
Write-Host ' DEMO PRETE' -ForegroundColor Magenta
Write-Host '------------------------------------------------------------'
Write-Host ' Vitrine        : http://localhost:5173'
Write-Host ' Dashboard      : http://localhost:5173/admin   (admin@smartshop.ma / admin123)'
Write-Host ' Chatbot local  : Dashboard > Conversations > panneau Test  (sans tunnel ; Internet requis pour IA)'
Write-Host ' Bot Telegram   : @cyber_reponse_bot            (bonus, via le tunnel)'
Write-Host '============================================================' -ForegroundColor Magenta
Write-Host 'Pour tout arreter : .\arreter_demo.ps1'
