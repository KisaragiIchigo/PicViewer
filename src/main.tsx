import ReactDOM from "react-dom/client";

import App from "./App";
import "./styles.css";

// ビューアなので WebView 既定のコンテキストメニューとドラッグ挙動は殺しておく。
window.addEventListener("contextmenu", (event) => event.preventDefault());
window.addEventListener("dragover", (event) => event.preventDefault());

// StrictMode は使わない。エフェクトの二重実行が起動引数の受け取り（1回だけ取り出す
// 設計）と噛み合わないうえ、二重レンダリングが起動時間に直接効いてしまうため。
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(<App />);
