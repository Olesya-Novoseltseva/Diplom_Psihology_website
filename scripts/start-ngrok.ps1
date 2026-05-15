param(
  [int]$Port = 8090
)

$ErrorActionPreference = "Stop"

function Test-Command([string]$CommandName) {
  return [bool](Get-Command $CommandName -ErrorAction SilentlyContinue)
}

Write-Host "== Start ngrok tunnel ==" -ForegroundColor Cyan
Write-Host "Port: $Port"

if (-not (Test-Command "ngrok")) {
  Write-Host ""
  Write-Error "ngrok is not installed or not in PATH. Install with: winget install ngrok.ngrok"
}

Write-Host ""
Write-Host "Checking local app health: http://127.0.0.1:$Port/api/health"

try {
  $health = Invoke-RestMethod -Method Get -Uri "http://127.0.0.1:$Port/api/health" -TimeoutSec 8
  Write-Host "Local health OK: $($health.status), provider=$($health.sentimentProvider)" -ForegroundColor Green
}
catch {
  Write-Host ""
  Write-Error "Local app is not reachable on port $Port. Start Docker stack first: docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build"
}

Write-Host ""
Write-Host "Starting ngrok..."
Write-Host "After startup, copy HTTPS URL from the Forwarding line."
Write-Host "Stop tunnel with Ctrl+C."
Write-Host ""

ngrok http $Port
