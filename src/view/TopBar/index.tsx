import { m } from "framer-motion";
import { HelpCircle, Info, Minus, Square, X } from "lucide-react";

import { baseName } from "@/lib/format";
import { ipc } from "@/lib/ipc";
import { useViewer } from "@/store/viewer";

import { CHROME } from "../chrome";
import { IconButton } from "../ui/IconButton";

type Props = {
  visible: boolean;
  onHoverChange: (hovering: boolean) => void;
};

/**
 * 上部バー。ファイル名と現在位置、情報／ヘルプ、ウィンドウ操作。
 * タイトルバーを自前で描いているので、空きスペースはドラッグ移動に使う。
 * 高さは chrome.ts の CHROME.topBar に従う。
 */
export function TopBar({ visible, onHoverChange }: Props) {
  const current = useViewer((s) => s.current);
  const paths = useViewer((s) => s.paths);
  const index = useViewer((s) => s.index);
  const info = useViewer((s) => s.info);
  const help = useViewer((s) => s.help);
  const toggleInfo = useViewer((s) => s.toggleInfo);
  const toggleHelp = useViewer((s) => s.toggleHelp);

  return (
    <m.header
      initial={false}
      animate={{ y: visible ? 0 : -(CHROME.topBar + 8), opacity: visible ? 1 : 0 }}
      transition={{ duration: visible ? 0.12 : 0.4, ease: [0.22, 1, 0.36, 1] }}
      onPointerEnter={() => onHoverChange(true)}
      onPointerLeave={() => onHoverChange(false)}
      style={{ height: CHROME.topBar }}
      className="acrylic pointer-events-auto absolute inset-x-0 top-0 z-chrome flex items-center gap-3 border-b px-2.5"
    >
      <div
        onPointerDown={(event) => {
          if (event.button === 0) void ipc.startDrag();
        }}
        onDoubleClick={() => void ipc.toggleMaximize()}
        className="flex min-w-0 flex-1 items-baseline gap-3"
      >
        <span className="truncate font-jp text-sm text-slate-200">
          {current ? baseName(current) : "画像が開かれていません"}
        </span>
        {paths.length > 0 && (
          <span className="numeric shrink-0 text-xs text-slate-400">
            {index + 1} / {paths.length}
          </span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <IconButton
          icon={Info}
          label="ファイル情報"
          shortcut="I"
          active={info}
          onClick={toggleInfo}
        />
        <IconButton
          icon={HelpCircle}
          label="操作方法"
          shortcut="H"
          active={help}
          onClick={toggleHelp}
        />

        <span className="mx-0.5 h-3.5 w-px bg-white/[0.08]" />

        <IconButton icon={Minus} label="最小化" onClick={() => void ipc.minimize()} />
        <IconButton
          icon={Square}
          label="最大化"
          onClick={() => void ipc.toggleMaximize()}
        />
        <IconButton
          icon={X}
          label="閉じる"
          tone="danger"
          onClick={() => void ipc.closeWindow()}
        />
      </div>
    </m.header>
  );
}
