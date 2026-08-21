export type ShortcutGroup = {
  title: string;
  items: Array<{ keys: string[]; description: string }>;
};

/** ヘルプ表示の内容。アプリ内テキストなので「です・ます調」で統一する。 */
export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: "画像の移動",
    items: [
      { keys: ["←", "→"], description: "前後の画像へ移動します。" },
      { keys: ["ホイール"], description: "前後の画像へ移動します。" },
      { keys: ["Space"], description: "次の画像へ移動します。Shift 併用で前へ戻ります。" },
      { keys: ["Home", "End"], description: "フォルダの最初、または最後の画像へ移動します。" },
      { keys: ["P"], description: "スライドショーを開始・停止します。" },
      { keys: ["T"], description: "フィルムストリップを開閉します。" },
      { keys: ["G"], description: "サムネイル一覧を開閉します。" },
    ],
  },
  {
    title: "サムネイル一覧",
    items: [
      { keys: ["←", "→", "↑", "↓"], description: "カーソルを動かします。" },
      { keys: ["Enter"], description: "カーソル位置の画像を開いて一覧を閉じます。クリックでも同じです。" },
      { keys: ["Home", "End"], description: "先頭、または末尾へ移動します。" },
      { keys: ["S", "M", "L"], description: "右上のボタンでサムネイルの大きさを切り替えます。" },
      { keys: ["Esc"], description: "一覧を閉じます。G キーでも閉じられます。" },
    ],
  },
  {
    title: "拡大と表示",
    items: [
      { keys: ["Ctrl", "ホイール"], description: "カーソル位置を軸に拡大・縮小します。" },
      { keys: ["ドラッグ"], description: "拡大中の画像を動かします。" },
      { keys: ["ダブルクリック"], description: "画面に合わせる表示と等倍表示を切り替えます。" },
      { keys: ["F"], description: "画面に合わせて表示します。" },
      { keys: ["1"], description: "等倍（100%）で表示します。" },
      { keys: ["F11"], description: "全画面表示を切り替えます。Enter でも同じ動作です。" },
    ],
  },
  {
    title: "ファイル操作",
    items: [
      { keys: ["O"], description: "画像を開きます。ウィンドウへのドラッグ&ドロップでも開けます。" },
      { keys: ["Delete"], description: "現在の画像をゴミ箱へ移動します。" },
      { keys: ["Ctrl", "Z"], description: "直前にゴミ箱へ移動した画像を元に戻します。" },
      { keys: ["Ctrl", "C"], description: "画像をクリップボードへコピーします。" },
      { keys: ["Ctrl", "Shift", "C"], description: "ファイルパスをコピーします。" },
      { keys: ["Ctrl", "E"], description: "エクスプローラーでファイルの場所を開きます。" },
      { keys: ["R"], description: "フォルダの内容を読み込み直します。通常は自動で追従するため、手動での操作は不要です。" },
    ],
  },
  {
    title: "そのほか",
    items: [
      { keys: ["I"], description: "ファイル情報の表示を切り替えます。" },
      { keys: ["H"], description: "この操作方法の表示を切り替えます。" },
      { keys: ["Esc"], description: "開いているパネルや全画面表示を、手前のものから順に閉じます。" },
    ],
  },
];
