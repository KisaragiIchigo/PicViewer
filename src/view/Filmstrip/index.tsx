import { m } from "framer-motion";

import { cx } from "@/lib/cx";
import { baseName } from "@/lib/format";
import { thumbSrc } from "@/lib/source";
import { useViewer } from "@/store/viewer";

import { CHROME } from "../chrome";

const THUMB = 76;
const GAP = 6;
const SLOT = THUMB + GAP;
/** 中心から左右に描画する枚数。数万枚のフォルダでも DOM 数が増えないようにする。 */
const WINDOW = 24;

type Props = {
  visible: boolean;
  onHoverChange: (hovering: boolean) => void;
};

/**
 * フィルムストリップ。スクロール可能なリストではなく「中心が常に現在の画像」の
 * リールとして描く。表示するのは現在位置の前後だけなので、枚数が増えても軽い。
 */
export function Filmstrip({ visible, onHoverChange }: Props) {
  const paths = useViewer((s) => s.paths);
  const index = useViewer((s) => s.index);
  const jumpTo = useViewer((s) => s.jumpTo);

  if (paths.length <= 1) return null;

  const from = Math.max(0, index - WINDOW);
  const to = Math.min(paths.length - 1, index + WINDOW);
  const slots = Array.from({ length: to - from + 1 }, (_, i) => from + i);

  return (
    <m.div
      initial={false}
      animate={{ y: visible ? 0 : CHROME.filmstrip + 8, opacity: visible ? 1 : 0 }}
      transition={{ duration: visible ? 0.16 : 0.4, ease: [0.22, 1, 0.36, 1] }}
      onPointerEnter={() => onHoverChange(true)}
      onPointerLeave={() => onHoverChange(false)}
      style={{ bottom: CHROME.bottomBar, height: CHROME.filmstrip }}
      className="acrylic pointer-events-auto absolute inset-x-0 z-chrome overflow-hidden border-t"
    >
      <m.div
        className="absolute left-1/2 top-0 h-full"
        animate={{ x: -(index * SLOT) - THUMB / 2 }}
        transition={{ type: "spring", stiffness: 420, damping: 42 }}
      >
        {slots.map((slot) => {
          const path = paths[slot];
          const active = slot === index;

          return (
            <button
              key={path}
              type="button"
              title={baseName(path)}
              onClick={() => jumpTo(slot)}
              style={{ left: slot * SLOT, width: THUMB, top: 7, height: CHROME.filmstrip - 14 }}
              className={cx(
                "absolute overflow-hidden rounded-[3px] border transition-all duration-150",
                active
                  ? "border-teal-400/70 shadow-glow-strong"
                  : "border-white/[0.06] opacity-55 hover:opacity-100",
              )}
            >
              <img
                src={thumbSrc(path, 168)}
                alt=""
                loading="lazy"
                decoding="async"
                draggable={false}
                className="h-full w-full bg-black object-cover"
              />
            </button>
          );
        })}
      </m.div>
    </m.div>
  );
}
