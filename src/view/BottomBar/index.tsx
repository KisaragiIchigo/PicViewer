import { m } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  FolderOpen,
  Images,
  LayoutGrid,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Scan,
  SquareArrowOutUpRight,
  Trash2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { formatZoom } from "@/lib/format";
import { ipc } from "@/lib/ipc";
import { applyActual, applyFit, zoomBy } from "@/store/view-actions";
import { useViewer } from "@/store/viewer";

import type { FileActions } from "@/hooks/useFileActions";
import { CHROME } from "../chrome";
import { IconButton } from "../ui/IconButton";

type Props = {
  visible: boolean;
  onHoverChange: (hovering: boolean) => void;
  actions: FileActions;
};

/**
 * 下部バー。左＝移動、中央＝倍率、右＝ファイル操作。
 * 高さは chrome.ts の CHROME.bottomBar に従う。画像がバーに隠れないよう、
 * Stage 側は同じ値ぶんの余白を確保している。
 */
export function BottomBar({ visible, onHoverChange, actions }: Props) {
  const paths = useViewer((s) => s.paths);
  const current = useViewer((s) => s.current);
  const zoom = useViewer((s) => s.zoom);
  const mode = useViewer((s) => s.mode);
  const filmstrip = useViewer((s) => s.filmstrip);
  const slideshow = useViewer((s) => s.slideshow);
  const fullscreen = useViewer((s) => s.fullscreen);
  const go = useViewer((s) => s.go);
  const toggleFilmstrip = useViewer((s) => s.toggleFilmstrip);
  const toggleGallery = useViewer((s) => s.toggleGallery);
  const toggleSlideshow = useViewer((s) => s.toggleSlideshow);
  const setFullscreen = useViewer((s) => s.setFullscreen);

  const hasImage = current !== null;
  const hasLibrary = paths.length > 1;

  return (
    <m.footer
      initial={false}
      animate={{ y: visible ? 0 : CHROME.bottomBar + 8, opacity: visible ? 1 : 0 }}
      transition={{ duration: visible ? 0.12 : 0.4, ease: [0.22, 1, 0.36, 1] }}
      onPointerEnter={() => onHoverChange(true)}
      onPointerLeave={() => onHoverChange(false)}
      style={{ height: CHROME.bottomBar }}
      className="acrylic pointer-events-auto absolute inset-x-0 bottom-0 z-chrome flex items-center gap-3 border-t px-2.5"
    >
      <div className="flex items-center gap-1">
        <IconButton
          icon={ChevronLeft}
          label="前の画像"
          shortcut="←"
          disabled={!hasLibrary}
          onClick={() => go(-1)}
        />
        <IconButton
          icon={ChevronRight}
          label="次の画像"
          shortcut="→"
          disabled={!hasLibrary}
          onClick={() => go(1)}
        />
        <IconButton
          icon={slideshow ? Pause : Play}
          label={slideshow ? "スライドショーを止める" : "スライドショー"}
          shortcut="P"
          active={slideshow}
          disabled={!hasLibrary}
          onClick={toggleSlideshow}
        />
        <IconButton
          icon={Images}
          label="フィルムストリップ"
          shortcut="T"
          active={filmstrip}
          disabled={!hasLibrary}
          onClick={toggleFilmstrip}
        />
        <IconButton
          icon={LayoutGrid}
          label="サムネイル一覧"
          shortcut="G"
          disabled={paths.length === 0}
          onClick={toggleGallery}
        />
      </div>

      <div className="flex flex-1 items-center justify-center gap-1">
        <IconButton
          icon={ZoomOut}
          label="縮小"
          shortcut="−"
          disabled={!hasImage}
          onClick={() => zoomBy(-1)}
        />
        <span className="numeric min-w-[3.75rem] rounded border border-teal-500/20 bg-teal-500/10 px-1.5 text-center text-xs leading-6 text-teal-300">
          {formatZoom(zoom)}
        </span>
        <IconButton
          icon={ZoomIn}
          label="拡大"
          shortcut="＋"
          disabled={!hasImage}
          onClick={() => zoomBy(1)}
        />
        <IconButton
          icon={Scan}
          label="画面に合わせる"
          shortcut="F"
          active={mode === "fit"}
          disabled={!hasImage}
          onClick={applyFit}
        />
        <button
          type="button"
          disabled={!hasImage}
          onClick={applyActual}
          className={
            mode === "actual"
              ? "numeric h-6 rounded border border-teal-500/40 bg-teal-500/10 px-1.5 text-xs text-teal-300 shadow-glow"
              : "numeric h-6 rounded border border-white/[0.04] px-1.5 text-xs text-slate-400 transition-colors hover:border-white/[0.1] hover:bg-white/[0.05] hover:text-slate-200 disabled:pointer-events-none disabled:opacity-30"
          }
        >
          1:1
        </button>
      </div>

      <div className="flex items-center gap-1">
        <IconButton
          icon={FolderOpen}
          label="画像を開く"
          shortcut="O"
          onClick={() => void actions.openDialog()}
        />
        <IconButton
          icon={Copy}
          label="画像をコピー"
          shortcut="Ctrl+C"
          disabled={!hasImage}
          onClick={() => void actions.copyImage()}
        />
        <IconButton
          icon={SquareArrowOutUpRight}
          label="エクスプローラーで表示"
          shortcut="Ctrl+E"
          disabled={!hasImage}
          onClick={() => void actions.reveal()}
        />
        <IconButton
          icon={fullscreen ? Minimize2 : Maximize2}
          label={fullscreen ? "全画面をやめる" : "全画面"}
          shortcut="F11"
          active={fullscreen}
          onClick={() => void ipc.toggleFullscreen().then(setFullscreen)}
        />

        <span className="mx-0.5 h-3.5 w-px bg-white/[0.08]" />

        <IconButton
          icon={Trash2}
          label="ゴミ箱へ移動"
          shortcut="Del"
          tone="danger"
          disabled={!hasImage}
          onClick={() => void actions.trash()}
        />
      </div>
    </m.footer>
  );
}
