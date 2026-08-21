import { useEffect, useState } from "react";

import { ipc } from "@/lib/ipc";
import { fullSrc, thumbSrc } from "@/lib/source";
import type { Natural } from "@/lib/types";
import { useViewer } from "@/store/viewer";

import { fitZoom } from "./geometry";

/** ウィンドウの可視化は最初の1回だけで足りるので、以降は IPC を投げない。 */
let windowRevealed = false;

/** 本体がこの時間までに来なければ、先にサムネイルを出して繋ぐ。 */
const PREVIEW_AFTER_MS = 220;
/** 繋ぎに使うサムネイルの辺長。 */
const PREVIEW_EDGE = 640;

type Shown = {
  src: string | null;
  natural: Natural | null;
  /** 表示中のものが繋ぎのサムネイルかどうか。 */
  preview: boolean;
};

const EMPTY: Shown = { src: null, natural: null, preview: false };

/**
 * 画像の読み込みを裏で行い、成功した時点で初めて表示を差し替える。
 * こうすると切り替え中に「前の画像が違うサイズで一瞬映る」現象も
 * 「一瞬真っ黒になる」現象も起きない。
 *
 * 本体のデコードに時間がかかる巨大画像（数億画素の TIFF など）では、
 * 先にサムネイルを出しておいて、本体が来た時点で静かに差し替える。
 *
 * 初回の表示（サムネイル・本体・失敗確定のいずれか）で chrome_ready を呼び、
 * そこで初めてウィンドウが可視化される。
 */
export function useImageLoader(path: string | null): Shown & { loading: boolean } {
  const [shown, setShown] = useState<Shown>(EMPTY);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!path) {
      setShown(EMPTY);
      setLoading(false);
      useViewer.getState().setNatural(null);
      return;
    }

    let settled = false;
    let cancelled = false;
    setLoading(true);

    const src = fullSrc(path);
    const image = new Image();
    image.decoding = "async";

    image.onload = () => {
      if (cancelled) return;
      settled = true;

      const natural = { width: image.naturalWidth, height: image.naturalHeight };
      commit(natural, () => setShown({ src, natural, preview: false }));
      setLoading(false);
      reveal();
    };

    image.onerror = () => {
      if (cancelled) return;
      settled = true;
      setLoading(false);

      // フォルダを渡された直後など、解決待ちの空振りはエラー扱いしない。
      // 解決の結果すでに別のパスへ移っている場合も同様。
      const store = useViewer.getState();
      if (store.resolving || store.current !== path) return;

      setShown(EMPTY);
      store.setNatural(null);
      store.setLoadError("この画像は表示できませんでした");
      reveal();

      // <img> は失敗の理由を教えてくれないので、同じURLをもう一度叩いて
      // Rust 側が返した説明文を拾う。
      void describeFailure(src).then((reason) => {
        if (cancelled || !reason) return;
        if (useViewer.getState().current !== path) return;
        useViewer.getState().setLoadError(reason);
      });
    };

    image.src = src;

    // 本体が遅い場合の繋ぎ。すでに本体が来ていれば何もしない。
    const timer = window.setTimeout(() => {
      if (cancelled || settled) return;

      const previewSrc = thumbSrc(path, PREVIEW_EDGE);
      const preview = new Image();
      preview.decoding = "async";
      preview.onload = () => {
        if (cancelled || settled) return;
        const natural = { width: preview.naturalWidth, height: preview.naturalHeight };
        commit(natural, () => setShown({ src: previewSrc, natural, preview: true }));
        reveal();
      };
      preview.src = previewSrc;
    }, PREVIEW_AFTER_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [path]);

  return { ...shown, loading };
}

/**
 * 寸法と倍率を同じ更新でまとめて確定させ、1フレームだけ誤った大きさで
 * 描かれることを防ぐ。
 *
 * サムネイルから本体へ差し替わるときは縦横比が同じで実寸だけが変わるため、
 * 自分で拡大していた場合（fit 以外）は見た目の大きさが保たれるよう倍率を換算する。
 */
function commit(natural: Natural, apply: () => void): void {
  const store = useViewer.getState();
  const previous = store.natural;

  store.setNatural(natural);
  store.setLoadError(null);

  if (store.mode === "fit") {
    store.setView(fitZoom(natural, store.container), { x: 0, y: 0 }, "fit");
  } else if (previous && previous.width > 0) {
    const scale = previous.width / natural.width;
    store.setView(store.zoom * scale, store.offset, store.mode);
  }

  apply();
}

function reveal(): void {
  if (windowRevealed) return;
  windowRevealed = true;
  void ipc.chromeReady();
}

/** 失敗したリクエストの本文には、Rust 側が書いた日本語の理由が入っている。 */
async function describeFailure(src: string): Promise<string | null> {
  try {
    const response = await fetch(src);
    if (response.ok) return null;

    const reason = (await response.text()).trim();
    return reason.length > 0 ? reason : null;
  } catch {
    return null;
  }
}
