$ErrorActionPreference = 'Stop'

$root = $PSScriptRoot
$localUrl = 'http://127.0.0.1:4173/'
$serverProcess = $null
$serverStarted = $false

function Test-LocalSite {
  try {
    $response = Invoke-WebRequest -Uri $localUrl -UseBasicParsing -TimeoutSec 2
    return $response.StatusCode -eq 200
  } catch {
    return $false
  }
}

if (-not (Test-LocalSite)) {
  $serverLog = Join-Path $env:TEMP 'english-ipa-server.log'
  $serverError = Join-Path $env:TEMP 'english-ipa-server.err'
  $serverProcess = Start-Process -FilePath 'node' -ArgumentList 'server.js' -WorkingDirectory $root -WindowStyle Hidden -PassThru -RedirectStandardOutput $serverLog -RedirectStandardError $serverError
  $serverStarted = $true

  for ($attempt = 0; $attempt -lt 20 -and -not (Test-LocalSite); $attempt++) {
    Start-Sleep -Milliseconds 300
  }
}

if (-not (Test-LocalSite)) {
  throw '本地服务器启动失败，请先执行 node server.js 检查错误。'
}

Write-Host '本地地址：http://localhost:4173' -ForegroundColor Green
Write-Host '正在创建临时公网地址，请等待 URL 出现……' -ForegroundColor Cyan
Write-Host '关闭此窗口或按 Ctrl+C 会停止公网分享。' -ForegroundColor DarkGray

try {
  & ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=30 -o ExitOnForwardFailure=yes -R 80:127.0.0.1:4173 serveo.net
} finally {
  if ($serverStarted -and $serverProcess -and -not $serverProcess.HasExited) {
    Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue
  }
}
