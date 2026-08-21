import { AnimatePresence, m } from "framer-motion";

import { cx } from "@/lib/cx";
import { useViewer } from "@/store/viewer";

import { CHROME } from "../chrome";

/** 下部中央に積むトースト。削除の取り消しもここから行える。 */
export function Toasts() {
  const toasts = useViewer((s) => s.toasts);
  const filmstrip = useViewer((s) => s.filmstrip);
  const dismissToast = useViewer((s) => s.dismissToast);

  return (
    <div
      // フィルムストリップを開いている間はその上へ逃がす
      style={{
        bottom:
          CHROME.bottomBar + CHROME.gap + (filmstrip ? CHROME.filmstrip : 0),
      }}
      className="pointer-events-none absolute inset-x-0 z-floating flex flex-col items-center gap-2"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <m.div
            key={toast.id}
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className={cx(
              "acrylic pointer-events-auto flex items-center gap-3 rounded-md border px-3.5 py-2",
              toast.tone === "danger" && "border-rose-500/20 bg-rose-950/60",
            )}
          >
            <span
              className={cx(
                "font-jp text-xs",
                toast.tone === "danger" ? "text-rose-300" : "text-slate-300",
              )}
            >
              {toast.text}
            </span>

            {toast.action && (
              <button
                type="button"
                onClick={() => {
                  toast.action?.run();
                  dismissToast(toast.id);
                }}
                className="font-jp rounded border border-teal-500/30 bg-teal-500/10 px-2 py-0.5 text-xs text-teal-300 transition-colors hover:bg-teal-500/20"
              >
                {toast.action.label}
              </button>
            )}
          </m.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
