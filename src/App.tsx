import { useState } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { LazyMotion, domAnimation } from "framer-motion";

import { useBoot } from "@/hooks/useBoot";
import { useChromeVisibility } from "@/hooks/useChromeVisibility";
import { useFileActions } from "@/hooks/useFileActions";
import { useFolderWatch } from "@/hooks/useFolderWatch";
import { useKeyboard } from "@/hooks/useKeyboard";
import { useOpenRequests } from "@/hooks/useOpenRequests";
import { usePrefetch } from "@/hooks/usePrefetch";
import { useSlideshow } from "@/hooks/useSlideshow";
import { useViewer } from "@/store/viewer";

import { BottomBar } from "@/view/BottomBar";
import { Filmstrip } from "@/view/Filmstrip";
import { Gallery } from "@/view/Gallery";
import { HelpOverlay } from "@/view/HelpOverlay";
import { InfoPanel } from "@/view/InfoPanel";
import { Stage } from "@/view/Stage";
import { Toasts } from "@/view/Toasts";
import { TopBar } from "@/view/TopBar";

/**
 * 画面の骨格。各フックを宣言順に起動し、レイヤーを重ねるだけに専念する。
 * 画像の描画・操作ロジックはすべて Stage 配下と hooks 側にある。
 */
export default function App() {
  const filmstrip = useViewer((s) => s.filmstrip);
  const gallery = useViewer((s) => s.gallery);
  const help = useViewer((s) => s.help);
  const info = useViewer((s) => s.info);
  const hasImage = useViewer((s) => s.current !== null);

  const [hovering, setHovering] = useState(false);

  // 画像が無いとき・オーバーレイを開いているとき・バーにポインタがある間は隠さない。
  const visible = useChromeVisibility(help || info || !hasImage || hovering);

  const actions = useFileActions();

  useBoot();
  useOpenRequests();
  useFolderWatch();
  useKeyboard(actions);
  usePrefetch();
  useSlideshow();

  return (
    <LazyMotion features={domAnimation} strict>
      <Tooltip.Provider delayDuration={420} skipDelayDuration={300}>
        <div className="relative h-full w-full overflow-hidden bg-canvas">
          <Stage cursorHidden={!visible && !gallery} />

          <TopBar visible={visible} onHoverChange={setHovering} />
          {filmstrip && <Filmstrip visible={visible} onHoverChange={setHovering} />}
          <BottomBar visible={visible} onHoverChange={setHovering} actions={actions} />

          <InfoPanel />
          <Toasts />
          <Gallery />
          <HelpOverlay />
        </div>
      </Tooltip.Provider>
    </LazyMotion>
  );
}
