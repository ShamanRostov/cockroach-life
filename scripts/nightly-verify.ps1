# Nightly local verification — run via Task Scheduler if laptop stays on
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

$logDir = Join-Path $root "logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$logFile = Join-Path $logDir ("verify-{0:yyyy-MM-dd-HHmm}.log" -f (Get-Date))

function Log($msg) {
    $line = "[{0:yyyy-MM-dd HH:mm:ss}] {1}" -f (Get-Date), $msg
    Write-Host $line
    Add-Content -Path $logFile -Value $line
}

Log "=== Cockroach Life nightly verify ==="

try {
    Log "npm run build..."
    npm run build 2>&1 | Tee-Object -FilePath $logFile -Append
    if ($LASTEXITCODE -ne 0) { throw "build failed" }

    Log "npm run build:yandex..."
    npm run build:yandex 2>&1 | Tee-Object -FilePath $logFile -Append
    if ($LASTEXITCODE -ne 0) { throw "build:yandex failed" }

    Log "All builds OK"
    exit 0
} catch {
    Log "FAILED: $_"
    exit 1
}
