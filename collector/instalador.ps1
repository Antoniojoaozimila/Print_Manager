# Executar como Administrador: instala dependências e registra o serviço Windows (node-windows).
$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $here

if (-not (Test-Path ".\config.json")) {
  Copy-Item ".\config.example.json" ".\config.json"
  Write-Host "Edite config.json com apiBaseUrl e collectorToken antes de continuar."
  exit 1
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "Node.js 18+ é necessário no PATH."
  exit 1
}

npm install --omit=dev
node scripts/install-service.js
