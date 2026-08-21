import { m } from "framer-motion";
import { ImageDown } from "lucide-react";

import { useViewer } from "@/store/viewer";

const HINTS = [
  "画像ファイルをこのウィンドウへドロップしてください。",
  "「O」キーでファイルを選択して開けます。",
  "画像ファイルの「プログラムから開く」に PicView を指定すると、ダブルクリックで開けます。",
];

/** 画像が1枚も開かれていないときの案内。 */
export function EmptyState() {
  const toggleHelp = useViewer((s) => s.toggleHelp);

  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-8"
    >
      <div className="grid h-14 w-14 place-items-center rounded-xl border border-white/[0.06] bg-white/[0.02]">
        <ImageDown className="h-6 w-6 text-slate-500" strokeWidth={1.3} />
      </div>

      <div className="max-w-md space-y-2 text-center">
        {HINTS.map((hint) => (
          <p key={hint} className="font-jp text-sm leading-relaxed text-slate-400">
            {hint}
          </p>
        ))}
      </div>

      <button
        type="button"
        onClick={toggleHelp}
        className="font-jp rounded border border-white/[0.07] bg-white/[0.02] px-3 py-1.5 text-xs text-slate-300 transition-colors hover:border-teal-500/30 hover:bg-teal-500/10 hover:text-teal-300"
      >
        操作方法を見る
      </button>
    </m.div>
  );
}
