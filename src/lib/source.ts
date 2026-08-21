/**
 * カスタムプロトコル `picv://` の URL 生成。
 * Windows の WebView2 ではカスタムスキームが `http://<scheme>.localhost` に
 * マップされるため、実行環境を見てオリジンを切り替える。
 */
const ORIGIN = navigator.userAgent.includes("Windows")
  ? "http://picv.localhost"
  : "picv://localhost";

/** 表示用の画像本体。WebView が扱える形式は Rust を素通りして生バイトが返る。 */
export function fullSrc(path: string): string {
  return `${ORIGIN}/full?p=${encodeURIComponent(path)}`;
}

/** フィルムストリップ用サムネイル。Rust 側でディスクキャッシュされる。 */
export function thumbSrc(path: string, edge: number): string {
  return `${ORIGIN}/thumb?p=${encodeURIComponent(path)}&s=${edge}`;
}
