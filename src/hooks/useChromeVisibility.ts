import { useCallback, useEffect, useRef, useState } from "react";

/** 無操作でクロームが引っ込むまでの時間。 */
const IDLE_MS = 2000;

/**
 * 「消えるUI」の中枢。マウス移動・キー操作・ホイールで起き、2秒の無操作で沈む。
 * `keepAwake` が立っている間（オーバーレイ表示中・画像未選択時など）は沈まない。
 */
export function useChromeVisibility(keepAwake: boolean): boolean {
  const [awake, setAwake] = useState(true);
  const timer = useRef<number | null>(null);

  const wake = useCallback(() => {
    setAwake(true);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setAwake(false), IDLE_MS);
  }, []);

  useEffect(() => {
    wake();

    const events: Array<keyof WindowEventMap> = [
      "pointermove",
      "pointerdown",
      "keydown",
      "wheel",
    ];
    events.forEach((name) => window.addEventListener(name, wake, { passive: true }));

    return () => {
      events.forEach((name) => window.removeEventListener(name, wake));
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, [wake]);

  return awake || keepAwake;
}
