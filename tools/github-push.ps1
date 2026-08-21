# PicView を GitHub のプライベートリポジトリへ push する。
# GithubPush.bat から呼ばれる。cmd は非ASCIIのバッチを正しく解釈できないため、
# 画面に出す文言とロジックはすべてこちら側に置いている。
#
# 使い方:
#   GithubPush.bat                … コミットメッセージを対話で入力する
#   GithubPush.bat "メッセージ"   … メッセージを直接渡す

param([string]$Message = "")

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$RemoteUrl = 'https://github.com/KisaragiIchigo/PicViewer.git'
$Branch = 'main'
# これを超えるファイルがコミットに含まれる場合は、先に知らせて確認する
$LargeFileMB = 1

function Write-Head([string]$text) {
    Write-Host ''
    Write-Host '=========================================='
    Write-Host "  $text"
    Write-Host '=========================================='
    Write-Host ''
}

function Stop-WithMessage([string]$message) {
    Write-Head 'push できませんでした'
    Write-Host "  $message" -ForegroundColor Red
    Write-Host ''
    exit 1
}

# git は終了コードで成否を返すので、毎回それを見る。
#
# git は進捗もエラーも stderr へ書く。Windows PowerShell 5.1 は native コマンドの
# stderr を ErrorRecord に包むため、$ErrorActionPreference = 'Stop' のままだと
# 「リモートが未登録」のような想定内の失敗でスクリプトごと落ちる。
# ここだけ Continue に落として、stderr は捨てずに出力として拾う
# （push の失敗理由は stderr にしか出ないため、捨てると原因が分からなくなる）。
function Invoke-Git {
    param([Parameter(Mandatory = $true)][string[]]$Arguments)

    $previous = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $lines = & git @Arguments 2>&1 | ForEach-Object { "$_" }
        $code = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previous
    }

    return [pscustomobject]@{ Code = $code; Output = ($lines -join "`n") }
}

# 値を読むだけの git 呼び出し。失敗したら空文字を返す
# （未登録のリモートや未設定の config は「失敗＋stderr」で返ってくるため、
#   出力の中身ではなく終了コードで判断する）。
function Get-GitValue {
    param([Parameter(Mandatory = $true)][string[]]$Arguments)
    $result = Invoke-Git $Arguments
    if ($result.Code -ne 0) { return '' }
    return $result.Output.Trim()
}

function Confirm-Step([string]$question) {
    $answer = Read-Host "$question  [y/N]"
    return $answer -match '^(y|yes)$'
}

Write-Head 'PicView - GitHub へ push します'

# --- 前提の確認 -------------------------------------------------------
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Stop-WithMessage 'git が見つかりません。git-scm.com からインストールしてください。'
}

Write-Host ('  ' + (& git --version))
Write-Host "  対象フォルダ : $root"
Write-Host "  リポジトリ   : $RemoteUrl"
Write-Host ''

if (-not (Test-Path (Join-Path $root '.gitignore'))) {
    Stop-WithMessage '.gitignore がありません。node_modules や target がまるごと push されるため中断しました。'
}

# --- リポジトリの初期化 -----------------------------------------------
if (Test-Path (Join-Path $root '.git')) {
    Write-Host '[1/6] このフォルダはすでに git リポジトリです。'
} else {
    Write-Host '[1/6] git リポジトリを初期化しています...'
    if ((Invoke-Git @('init', '-b', $Branch)).Code -ne 0) {
        Stop-WithMessage 'git init に失敗しました。'
    }
}

# 既存リポジトリでブランチ名が違う場合は合わせる
$current = Get-GitValue @('branch', '--show-current')
if ([string]::IsNullOrWhiteSpace($current)) {
    $null = Invoke-Git @('checkout', '-B', $Branch)
} elseif ($current -ne $Branch) {
    Write-Host "      現在のブランチは '$current' です。'$Branch' へ切り替えます。"
    $null = Invoke-Git @('checkout', '-B', $Branch)
}

# --- コミット作者の設定 -----------------------------------------------
$name = Get-GitValue @('config', 'user.name')
$email = Get-GitValue @('config', 'user.email')

if ([string]::IsNullOrWhiteSpace($name) -or [string]::IsNullOrWhiteSpace($email)) {
    Write-Host ''
    Write-Host '  コミットに使う名前とメールアドレスが未設定です。'
    Write-Host '  このリポジトリにだけ設定します（他のプロジェクトには影響しません）。'
    Write-Host ''

    if ([string]::IsNullOrWhiteSpace($name)) {
        $name = Read-Host '  名前（GitHub のユーザー名で構いません）'
        if ([string]::IsNullOrWhiteSpace($name)) { Stop-WithMessage '名前が入力されませんでした。' }
        $null = Invoke-Git @('config', 'user.name', $name)
    }
    if ([string]::IsNullOrWhiteSpace($email)) {
        $email = Read-Host '  メールアドレス'
        if ([string]::IsNullOrWhiteSpace($email)) { Stop-WithMessage 'メールアドレスが入力されませんでした。' }
        $null = Invoke-Git @('config', 'user.email', $email)
    }
    Write-Host ''
}

Write-Host "[2/6] コミット作者 : $name <$email>"

# --- リモートの設定 ---------------------------------------------------
$existing = Get-GitValue @('remote', 'get-url', 'origin')

if ([string]::IsNullOrWhiteSpace($existing)) {
    Write-Host '[3/6] リモート origin を登録しています...'
    if ((Invoke-Git @('remote', 'add', 'origin', $RemoteUrl)).Code -ne 0) {
        Stop-WithMessage 'リモートの登録に失敗しました。'
    }
} elseif ($existing -ne $RemoteUrl) {
    Write-Host '[3/6] 登録済みのリモートが想定と違います。'
    Write-Host "      現在  : $existing"
    Write-Host "      想定  : $RemoteUrl"
    if (-not (Confirm-Step '      想定のURLへ差し替えますか？')) {
        Stop-WithMessage 'リモートの差し替えを中止しました。'
    }
    $null = Invoke-Git @('remote', 'set-url', 'origin', $RemoteUrl)
} else {
    Write-Host '[3/6] リモート origin は設定済みです。'
}

# --- 変更の取り込み ---------------------------------------------------
Write-Host '[4/6] 変更を確認しています...'

if ((Invoke-Git @('add', '-A')).Code -ne 0) {
    Stop-WithMessage 'git add に失敗しました。'
}

$stagedRaw = Get-GitValue @('diff', '--cached', '--name-only')
$staged = @($stagedRaw -split "`n" | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })

if ($staged.Count -eq 0) {
    Write-Host '      コミットする変更はありません。'

    $aheadResult = Invoke-Git @('log', '--oneline', "origin/$Branch..$Branch")

    if ($aheadResult.Code -ne 0) {
        # リモートのブランチをまだ知らない（初回 push）。
        # ローカルにコミットが1つも無ければ、送るものが何も無い。
        if ((Invoke-Git @('rev-parse', 'HEAD')).Code -ne 0) {
            Write-Head 'push するものがありません'
            Write-Host '  コミットが1つもありません。'
            Write-Host ''
            exit 0
        }
        Write-Host '      初回の push です。'
    } else {
        $ahead = @($aheadResult.Output -split "`n" | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
        if ($ahead.Count -eq 0) {
            Write-Head 'すでに最新です'
            Write-Host '  push するものがありませんでした。'
            Write-Host ''
            exit 0
        }
        Write-Host "      未 push のコミットが $($ahead.Count) 件あります。push だけ行います。"
    }
} else {
    Write-Host "      $($staged.Count) 個のファイルに変更があります。"
    $staged | Select-Object -First 20 | ForEach-Object { Write-Host "        $_" }
    if ($staged.Count -gt 20) {
        Write-Host "        … ほか $($staged.Count - 20) 件"
    }

    # 大きなファイルは事故のもとなので、コミット前に知らせる
    $large = @()
    foreach ($path in $staged) {
        $full = Join-Path $root $path
        if (Test-Path $full) {
            $mb = (Get-Item $full).Length / 1MB
            if ($mb -ge $LargeFileMB) {
                $large += [pscustomobject]@{ Path = $path; MB = [math]::Round($mb, 2) }
            }
        }
    }

    if ($large.Count -gt 0) {
        Write-Host ''
        Write-Host '  サイズの大きいファイルが含まれています:' -ForegroundColor Yellow
        $large | ForEach-Object {
            Write-Host ("    {0}  ({1} MB)" -f $_.Path, $_.MB) -ForegroundColor Yellow
        }
        Write-Host '  不要なら .gitignore に足してから、もう一度実行してください。'
        Write-Host ''
        if (-not (Confirm-Step '  このまま続けますか？')) {
            $null = Invoke-Git @('reset')
            Stop-WithMessage '中止しました。ステージした内容は取り消してあります。'
        }
    }

    # --- コミット -----------------------------------------------------
    if ([string]::IsNullOrWhiteSpace($Message)) {
        Write-Host ''
        $Message = Read-Host '  コミットメッセージ（空なら日時を入れます）'
    }
    if ([string]::IsNullOrWhiteSpace($Message)) {
        $Message = '更新 ' + (Get-Date -Format 'yyyy-MM-dd HH:mm')
    }

    Write-Host ''
    Write-Host '[5/6] コミットしています...'
    $commit = Invoke-Git @('commit', '-m', $Message)
    if ($commit.Code -ne 0) {
        Write-Host $commit.Output
        Stop-WithMessage 'git commit に失敗しました。'
    }
    Write-Host "      $Message"
}

# --- push -------------------------------------------------------------
Write-Host ''
Write-Host "[6/6] $RemoteUrl の $Branch へ push します。"
Write-Host '      初回は GitHub のサインイン画面がブラウザで開くことがあります。'
Write-Host ''

if (-not (Confirm-Step '  push しますか？')) {
    Write-Head '中止しました'
    Write-Host '  コミットはローカルに残っています。あとで実行し直せばそのまま push できます。'
    Write-Host ''
    exit 0
}

$push = Invoke-Git @('push', '-u', 'origin', $Branch)
if ($push.Code -eq 0) {
    Write-Head '完了しました'
    Write-Host "  $RemoteUrl" -ForegroundColor Cyan
    Write-Host ''
    exit 0
}

Write-Host $push.Output

# よくある失敗は、原因と次の一手まで書いて返す
if ($push.Output -match 'Repository not found|not found') {
    Stop-WithMessage ('リポジトリが見つかりませんでした。GitHub 上に PicViewer を作成済みか、' +
        'サインインしたアカウントにアクセス権があるかを確認してください。')
}

if ($push.Output -match 'rejected|non-fast-forward|fetch first') {
    Write-Host ''
    Write-Host '  リモート側に、こちらに無いコミットがあります。' -ForegroundColor Yellow
    Write-Host '  （GitHub でリポジトリを作るときに README を追加した場合などに起きます）'
    Write-Host ''

    if (Confirm-Step '  リモートの内容を取り込んでから push し直しますか？') {
        $pull = Invoke-Git @('pull', '--rebase', 'origin', $Branch)
        if ($pull.Code -ne 0) {
            Write-Host $pull.Output
            Stop-WithMessage '取り込みに失敗しました。競合している可能性があります。手動で解決してください。'
        }
        $retry = Invoke-Git @('push', '-u', 'origin', $Branch)
        if ($retry.Code -eq 0) {
            Write-Head '完了しました'
            Write-Host "  $RemoteUrl" -ForegroundColor Cyan
            Write-Host ''
            exit 0
        }
        Write-Host $retry.Output
    }
    Stop-WithMessage 'push できませんでした。'
}

if ($push.Output -match 'Authentication failed|could not read Username|403') {
    Stop-WithMessage ('認証に失敗しました。GitHub のサインインをやり直すか、' +
        'Windows の資格情報マネージャーから github.com の項目を削除して再実行してください。')
}

Stop-WithMessage 'push に失敗しました。上のメッセージを確認してください。'
