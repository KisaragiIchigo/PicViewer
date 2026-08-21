import { useEffect, useState } from "react";
import { AnimatePresence, m } from "framer-motion";

import { formatBytes, formatDate } from "@/lib/format";
import { ipc } from "@/lib/ipc";
import type { FileMeta } from "@/lib/types";
import { useViewer } from "@/store/viewer";

import { CHROME } from "../chrome";

/** 情報オーバーレイ。右上に浮かべる薄いカード。 */
export function InfoPanel() {
  const open = useViewer((s) => s.info);
  const current = useViewer((s) => s.current);
  const natural = useViewer((s) => s.natural);
  const index = useViewer((s) => s.index);
  const total = useViewer((s) => s.paths.length);

  const [meta, setMeta] = useState<FileMeta | null>(null);

  useEffect(() => {
    if (!open || !current) {
      setMeta(null);
      return;
    }

    let cancelled = false;
    void ipc
      .fileMeta(current)
      .then((value) => {
        if (!cancelled) setMeta(value);
      })
      .catch(() => {
        if (!cancelled) setMeta(null);
      });

    return () => {
      cancelled = true;
    };
  }, [open, current]);

  return (
    <AnimatePresence>
      {open && current && (
        <m.aside
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 12 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          style={{ top: CHROME.topBar + CHROME.gap }}
          className="acrylic pointer-events-auto absolute right-3 z-floating w-[19rem] rounded-lg border p-4"
        >
          <p className="label mb-3">File Info</p>

          <dl className="space-y-2.5">
            <Row label="名前" value={meta?.name ?? "—"} wrap />
            <Row
              label="サイズ"
              value={natural ? `${natural.width} × ${natural.height} px` : "—"}
              numeric
            />
            <Row label="容量" value={meta ? formatBytes(meta.bytes) : "—"} numeric />
            <Row label="形式" value={meta ? meta.ext.toUpperCase() : "—"} numeric />
            <Row label="更新日時" value={meta ? formatDate(meta.modified) : "—"} numeric />
            <Row
              label="位置"
              value={total > 0 ? `${index + 1} / ${total}` : "—"}
              numeric
            />
            <Row label="フォルダ" value={meta?.dir ?? "—"} wrap />
          </dl>
        </m.aside>
      )}
    </AnimatePresence>
  );
}

type RowProps = {
  label: string;
  value: string;
  numeric?: boolean;
  wrap?: boolean;
};

function Row({ label, value, numeric = false, wrap = false }: RowProps) {
  return (
    <div className="flex gap-3">
      <dt className="w-16 shrink-0 font-jp text-xs text-slate-400">{label}</dt>
      <dd
        className={
          (numeric ? "numeric " : "font-jp ") +
          (wrap ? "break-all " : "truncate ") +
          "flex-1 text-xs text-slate-300"
        }
      >
        {value}
      </dd>
    </div>
  );
}
