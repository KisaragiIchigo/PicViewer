# PicView を exe へビルドし、成果物を release フォルダへ取り出す。
# build.bat から呼ばれる。cmd は非ASCIIのバッチを正しく解釈できないため、
# 画面に出す文言とロジックはすべてこちら側に置いている。

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Write-Head([string]$text) {
    Write-Host ''
    Write-Host '=========================================='
    Write-Host "  $text"
    Write-Host '=========================================='
    Write-Host ''
}

function Fail([string]$message) {
    Write-Head 'ビルドに失敗しました'
    Write-Host "  $message" -ForegroundColor Red
    Write-Host ''
    exit 1
}

Write-Head 'PicView - exe を作ります'

# --- 前提ツールの確認 -------------------------------------------------
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Fail 'Node.js が見つかりません。nodejs.org からインストールしてください。'
}

$cargo = Get-Command cargo -ErrorAction SilentlyContinue
if (-not $cargo) {
    Fail 'Rust (cargo) が見つかりません。rustup.rs からインストールしてください。'
}

Write-Host ('  Node.js  ' + (& node --version))
Write-Host ('  ' + (& cargo --version))
Write-Host ''

# --- 依存の取得 -------------------------------------------------------
if (Test-Path (Join-Path $root 'node_modules')) {
    Write-Host '[1/3] 依存パッケージは取得済みです。'
} else {
    Write-Host '[1/3] 依存パッケージを取得しています。初回は数分かかります...'
    & npm install --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { Fail '依存パッケージの取得に失敗しました。' }
}
Write-Host ''

# --- ビルド -----------------------------------------------------------
Write-Host '[2/3] ビルドしています。初回は 5〜15 分ほどかかります...'
Write-Host ''
& npx tauri build
if ($LASTEXITCODE -ne 0) { Fail 'ビルドに失敗しました。上に出ているエラーを確認してください。' }
Write-Host ''

# --- 成果物の取り出し -------------------------------------------------
Write-Host '[3/3] 成果物を release フォルダへコピーしています...'

$builtExe = Join-Path $root 'src-tauri\target\release\picview.exe'
if (-not (Test-Path $builtExe)) {
    Fail "実行ファイルが見つかりません: $builtExe"
}

$releaseDir = Join-Path $root 'release'
if (-not (Test-Path $releaseDir)) {
    New-Item -ItemType Directory -Path $releaseDir | Out-Null
}

$exeOut = Join-Path $releaseDir 'PicView.exe'
Copy-Item $builtExe $exeOut -Force

$setup = Get-ChildItem (Join-Path $root 'src-tauri\target\release\bundle\nsis') -Filter '*-setup.exe' -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime |
    Select-Object -Last 1

$setupOut = $null
if ($setup) {
    $setupOut = Join-Path $releaseDir $setup.Name
    Copy-Item $setup.FullName $setupOut -Force
}

Write-Head '完成しました'

$exeMb = [math]::Round((Get-Item $exeOut).Length / 1MB, 2)
Write-Host '  単体で動く実行ファイル:'
Write-Host "    $exeOut  ($exeMb MB)" -ForegroundColor Cyan

if ($setupOut) {
    $setupMb = [math]::Round((Get-Item $setupOut).Length / 1MB, 2)
    Write-Host ''
    Write-Host '  インストーラ (画像ファイルの関連付けも登録されます):'
    Write-Host "    $setupOut  ($setupMb MB)" -ForegroundColor Cyan
}

Write-Host ''
Write-Host '  PicView.exe はそのままコピーして持ち運べます。'
Write-Host '  画像をダブルクリックで開けるようにしたい場合はインストーラを使ってください。'
Write-Host ''
exit 0
