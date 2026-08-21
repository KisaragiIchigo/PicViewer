# PicView

Tauri v2 (Rust) + React + TypeScript で作った、**起動が速い・UIの消える**画像ビューアです。ダブルクリックした瞬間に画像が出て、手を止めればUIが引っ込みます。

---

## 機能ハイライト

- ⚡ **展開処理ゼロの起動** — ネイティブ実行体が argv を確定してから WebView を起こします。ランタイムの展開も解凍もインタプリタの初期化もありません。
- 🖤 **ちらつかない初回描画** — ウィンドウは非表示で生成し、1枚目を描き終えた時点で初めて可視化します。白い枠が一瞬映ることも、空の枠が先に出ることもありません。
- 📐 **画像がバーに隠れない** — 上下のバーは 30px と細く、画像はその内側に収まります。バーが出入りしても画像の大きさは変わりません。
- 🗂 **走査を待たない表示** — まず対象の1枚を表示し、そのあとで同じフォルダの画像を列挙します。数万枚のフォルダでも1枚目は即座に出ます。
- 🔀 **先読み** — 前後2枚を裏で読み込み、デコード結果を保持したままにします。送り／戻しの待ち時間が実質ゼロになります。
- 🔢 **自然順ソート** — `2.png` が `10.png` より前に来ます。
- 🎞 **フィルムストリップ** — 中心が常に現在の画像になるリールです。前後 24 枚だけを描画するため、枚数が増えても軽いままです。
- 🔲 **サムネイル一覧** — フォルダ全体をグリッドで見渡せます。画面に入る行だけを描くので、数万枚のフォルダでも DOM の数は一定のままです。サムネイルの大きさは 3 段階から選べます。
- 👁 **段階表示** — 本体のデコードに時間がかかる巨大画像では、先にサムネイルを出しておいて、本体が読み終わった時点で静かに差し替えます。待たされている感じがしません。
- 🔄 **フォルダの自動追従** — エクスプローラー側で画像を増減させると、一覧が自動で更新されます。表示中の画像が消えた場合は、元の位置にいちばん近い画像へ寄せます。
- 🔍 **カーソル基準のズームとパン** — Ctrl + ホイールで拡大縮小、ドラッグで平行移動、ダブルクリックでフィットと等倍を往復します。
- 🗑 **取り消せる削除** — Delete でゴミ箱へ送ったあと、Ctrl+Z またはトーストの「元に戻す」で復元できます。
- 📋 **クリップボードとエクスプローラー連携** — 画像そのもの、ファイルパス、エクスプローラーでの表示に対応しています。
- 🧩 **幅広い形式** — WebView が扱える形式はそのまま、TIFF / TGA / DDS / QOI / PNM / HDR は Rust 側で変換して表示します。
- 🪟 **単一インスタンス** — 2枚目以降は既存ウィンドウへ引き渡され、前面に出ます。ドラッグ&ドロップでも開けます。

---

## アーキテクチャ概要

```text
ピクチャービューワー/
├── build.bat                    … ダブルクリックで exe とインストーラを作る（ASCIIのランチャ）
├── dev.bat                      … ダブルクリックで開発モード起動（ASCIIのランチャ）
├── GithubPush.bat               … ダブルクリックで GitHub へ push（ASCIIのランチャ）
├── .gitattributes               … 改行コードの扱い（bat/ps1 は CRLF・他は LF）
├── project_style.json           … 配色・フォント・質感の単一情報源（UI作業時は必読）
├── changelogs.json              … 変更履歴（作業前に参照・作業後に追記）
├── index.html                   … WebView が読む唯一のHTML。先出しの黒塗りを含む
├── tailwind.config.js           … project_style.json のトークンをTailwindへ写像
├── tools/
│   ├── build.ps1                … ビルドの本体（UTF-8 BOM付き・必須）
│   ├── dev.ps1                  … 開発起動の本体（UTF-8 BOM付き・必須）
│   ├── github-push.ps1          … push の本体（UTF-8 BOM付き・必須）
│   ├── check-layout.ts          … 画像がバーに隠れないことの回帰チェック
│   ├── make_icon.py             … アプリアイコンの生成スクリプト
│   └── icon-source.png          … 生成済みアイコン元画像（1024px）
│
├── src/                         … Renderer（WebView 側・UI と操作）
│   ├── main.tsx                 … エントリ。StrictMode は使わない（起動時間と二重実行の回避）
│   ├── App.tsx                  … 骨格。フックを宣言順に起動しレイヤーを重ねるだけ
│   ├── styles.css               … Tailwind 基盤とグローバル質感（スクロールバー・選択色）
│   │
│   ├── lib/                     … 共有ドメイン層（UIに依存しない）
│   │   ├── types.ts             … 全域で使う型定義
│   │   ├── ipc.ts               … Rust コマンドの型付きラッパとイベント名
│   │   ├── source.ts            … picv:// のURL生成
│   │   ├── format.ts            … 容量・日時・倍率の表示整形
│   │   └── cx.ts                … 条件付きクラス名の連結
│   │
│   ├── store/
│   │   ├── viewer.ts            … 状態と、ライブラリ／トーストの操作
│   │   └── view-actions.ts      … フィット・等倍・ズーム・パンの適用
│   │
│   ├── hooks/                   … 副作用を持つロジック
│   │   ├── useBoot.ts           … 起動シーケンス
│   │   ├── useOpenRequests.ts   … 別インスタンス／ドロップからの要求の受け口
│   │   ├── useFolderWatch.ts    … フォルダ変更通知を受けて一覧を追従
│   │   ├── useChromeVisibility.ts … 「消えるUI」の表示・非表示
│   │   ├── useKeyboard.ts       … キーボードショートカット
│   │   ├── useFileActions.ts    … 削除・復元・コピー・オープンとトースト
│   │   ├── usePrefetch.ts       … 前後画像の先読み
│   │   └── useSlideshow.ts      … スライドショーの送り
│   │
│   └── view/                    … 表示（JSX構造とpropsの受け渡しに専念）
│       ├── chrome.ts            … バーの高さと画像の余白の単一情報源
│       ├── Stage/
│       │   ├── index.tsx        … 画像の描画・安全領域の確保・カーソル制御
│       │   ├── geometry.ts      … フィット倍率・クランプ・カーソル基準ズームの純粋関数
│       │   ├── useImageLoader.ts … 裏読み・段階表示・成功時だけ差し替える読み込み
│       │   └── useZoomPan.ts    … ホイール・ドラッグ・ダブルクリックの配線
│       ├── Gallery/
│       │   ├── index.tsx        … サムネイル一覧のオーバーレイ
│       │   ├── grid.ts          … 列数・描画範囲・カーソル移動の純粋関数
│       │   └── useGalleryKeys.ts … 一覧表示中のキー操作の横取り
│       ├── TopBar/              … ファイル名・位置・情報／ヘルプ・ウィンドウ操作
│       ├── BottomBar/           … 移動・倍率・ファイル操作
│       ├── Filmstrip/           … 中心追従のサムネイルリール
│       ├── InfoPanel/           … ファイル情報オーバーレイ
│       ├── HelpOverlay/         … 操作方法（shortcuts.ts に内容を分離）
│       ├── Toasts/              … 通知と「元に戻す」
│       ├── EmptyState/          … 画像未選択時の案内
│       └── ui/IconButton/       … ツールチップ付きアイコンボタン
│
└── src-tauri/                   … Main（Rust 側・OS操作と重い処理）
    ├── tauri.conf.json          … ウィンドウ設定・CSP・バンドルとファイル関連付け
    ├── capabilities/default.json … 権限。自前コマンド主体なので最小構成
    ├── build.rs                 … tauri-build の起動
    └── src/
        ├── main.rs              … エントリ。コンソールを出さない設定のみ
        ├── lib.rs               … 起動の骨格。プラグイン・プロトコル・コマンドの配線
        ├── startup.rs           … argv から開く対象を1つ確定させる
        ├── state.rs             … 起動引数・可視化フラグ・削除履歴・サムネイルキャッシュ
        ├── protocol.rs          … picv:// のルーティング（WebView からファイルを読む唯一の経路）
        ├── events.rs            … ドラッグ&ドロップと2つ目のインスタンスの受け口
        ├── imaging/
        │   ├── formats.rs       … 拡張子の分類（素通し／要変換）とMIME
        │   ├── decode.rs        … PNG変換・サムネイル生成・RGBA展開
        │   └── cache.rs         … サムネイルのディスクキャッシュと間引き
        ├── commands/
        │   ├── chrome.rs        … 可視化・ドラッグ移動・最大化・全画面・タイトル
        │   ├── library.rs       … 兄弟ファイルの列挙・対象解決・ファイル選択ダイアログ
        │   ├── file_ops.rs      … ゴミ箱・復元・エクスプローラー・クリップボード
        │   └── meta.rs          … ファイル属性の取得
        └── util/
            ├── mod.rs           … 拡張子・更新時刻の小さな共有関数
            └── natsort.rs       … 自然順比較
```

---

## データフロー

```text
起動
  exe 起動
   └─ Rust main : argv を確定（ウィンドウ生成より前）
       └─ WebView 生成（visible: false・黒背景）
           └─ Renderer boot() → 起動引数のパスを受け取る
               ├─ <img src="picv://…/full?p=…"> で読み込み開始
               │    └─ 読み込み完了 → chrome_ready() → ウィンドウ可視化
               └─ その後で list_siblings() → フォルダ内を自然順で列挙
                    └─ 前後2枚を先読み

画像の取得（picv:// プロトコル）
  Renderer ──picv://localhost/full?p=…──▶ Rust protocol.rs
                                            ├─ 対応拡張子か・実在するかを検証
                                            ├─ WebView が扱える形式 → 生バイトを素通し
                                            └─ TIFF等           → PNG へ変換して返す

サムネイル
  Renderer ──picv://localhost/thumb?p=…&s=…──▶ Rust protocol.rs
                                                └─ ディスクキャッシュを引く
                                                     └─ 無ければ生成して保存

外からの「開いて」
  関連付けのダブルクリック → 2つ目のインスタンス起動
      └─ single-instance が argv を既存プロセスへ転送
           └─ events.rs が picview://open を emit → Renderer が openPath()
  ドラッグ&ドロップ → WindowEvent::DragDrop → 同じく picview://open
```

---

## 主要技術

| カテゴリ | 採用技術 |
| --- | --- |
| デスクトップ基盤 | Tauri v2（Rust / WebView2） |
| フロントエンド | Vite + React 18 + TypeScript |
| スタイリング | Tailwind CSS v3 |
| UIプリミティブ | Radix UI（Tooltip） |
| アニメーション | Framer Motion（LazyMotion + `m`） |
| 状態管理 | Zustand |
| アイコン | lucide-react |
| 画像デコード | `image` クレート（TIFF / TGA / DDS / QOI / PNM / HDR の変換とサムネイル生成） |
| ファイル操作 | `trash`（ゴミ箱と復元）、`arboard`（クリップボード） |
| ウィンドウ状態 | `tauri-plugin-window-state`（位置・サイズ・最大化のみ復元） |
| 単一インスタンス | `tauri-plugin-single-instance` |

---

## 開発

前提として Node.js と Rust（`x86_64-pc-windows-msvc`）、Windows 11 標準の WebView2 ランタイムが必要です。

いちばん簡単なのは、**`build.bat` をダブルクリック**することです。依存の取得からビルド、成果物の取り出しまで自動で行い、終わったら `release` フォルダの場所を表示します。開発中の起動は `dev.bat` です。

コマンドで操作する場合は次のとおりです。

```powershell
npm install          # 依存の取得（初回のみ）

npm run start        # 開発起動（Vite + Tauri）
npm run typecheck    # TypeScript の型チェック
npm run check:layout # 画像がバーに隠れないかを数値で確認
npm run build        # 型チェック + フロントのビルド
npm run release      # リリースビルド（exe と NSIS インストーラを生成）
```

Rust 側だけを確認する場合は次を使います。

```powershell
cd src-tauri
cargo check          # 型チェック
cargo test           # 自然順ソートとURL解析の単体テスト
```

生成物は次の場所に出ます。`build.bat` を使った場合は `release/` にもコピーされます。

- 単体の実行ファイル … `src-tauri/target/release/picview.exe`
- インストーラ … `src-tauri/target/release/bundle/nsis/`

---

## GitHub へ push する

`GithubPush.bat` をダブルクリックすると、初期化からコミット、push までを順に行います。送り先は次のプライベートリポジトリに固定してあります。

```
https://github.com/KisaragiIchigo/PicViewer.git
```

やっていることは次のとおりです。

1. git リポジトリでなければ初期化します（ブランチは `main`）。
2. コミット用の名前とメールアドレスが未設定なら、その場で尋ねてこのリポジトリにだけ設定します。
3. リモート `origin` を登録します。別のURLが登録済みの場合は差し替えてよいか確認します。
4. 変更をすべてステージし、内容を一覧で表示します。**1MB を超えるファイルが含まれる場合は警告して確認します**。
5. コミットメッセージを尋ねます（空欄なら日時が入ります）。コマンドラインから `GithubPush.bat "メッセージ"` の形で渡すこともできます。
6. 確認のうえ push します。

初回は GitHub のサインイン画面がブラウザで開きます。リモート側に先にコミットがある場合（GitHub 側で README を作った場合など）は、取り込んでから push し直すかを尋ねます。

`node_modules` / `dist` / `release` / `src-tauri/target` は `.gitignore` で除外しているため、ビルド成果物は push されません。

---

> **バッチファイルを編集するときの注意**
> `build.bat` / `dev.bat` は**ASCII文字だけ**で書いてください。cmd.exe は非ASCIIを含むバッチファイルの行境界を正しく扱えず、`chcp 65001` を先に実行しても解決しません。日本語のメッセージとロジックは `tools/*.ps1` 側に置き、こちらは **UTF-8 BOM付き**で保存してください（Windows PowerShell 5.1 は BOM が無いと CP932 として読むため、日本語が化けます）。

インストーラ経由で入れると画像ファイルの関連付けが登録され、エクスプローラーの「プログラムから開く」に PicView が出るようになります。

アプリアイコンを作り直す場合は次の手順です。

```powershell
python tools/make_icon.py tools/icon-source.png
npx tauri icon tools/icon-source.png
```

---

## スタイルの決まりごと

配色・フォント・質感の単一情報源は `project_style.json` です。UI に触れる作業では必ず最初にこれを読み、**ここに定義されていない色やフォントを直接書き足さない**でください。追加が必要な場合は先に `project_style.json` を更新し、`changelogs.json` に記録します。
