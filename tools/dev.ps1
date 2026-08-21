# PicView を開発モードで起動する。dev.bat から呼ばれる。

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host ''
Write-Host 'PicView を開発モードで起動します。ソースを保存すると自動で反映されます。'
Write-Host '終了するには、このウィンドウで Ctrl+C を押してください。'
Write-Host ''

if (-not (Test-Path (Join-Path $root 'node_modules'))) {
    Write-Host '依存パッケージを取得しています。初回は数分かかります...'
    & npm install --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) {
        Write-Host '依存パッケージの取得に失敗しました。' -ForegroundColor Red
        exit 1
    }
}

& npx tauri dev
exit $LASTEXITCODE
