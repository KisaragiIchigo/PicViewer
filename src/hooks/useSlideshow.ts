import { useEffect } from "react";

import { useViewer } from "@/store/viewer";

const INTERVAL_MS = 3200;

/** スライドショー。ヘルプを開いている間は進めない。 */
export function useSlideshow(): void {
  const slideshow = useViewer((s) => s.slideshow);
  const help = useViewer((s) => s.help);

  useEffect(() => {
    if (!slideshow || help) return;

    const timer = window.setInterval(() => {
      useViewer.getState().go(1);
    }, INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [slideshow, help]);
}
