import { useEffect, useRef } from "react";

import { fullSrc } from "@/lib/source";
import { useViewer } from "@/store/viewer";

/**
 * 前後の画像を先読みしてデコード済みで待たせておく。
 * 生成した Image を ref で掴んだままにするのが肝で、参照が生きている間は
 * デコード結果が破棄されないため、送り／戻しが待ち時間ゼロで切り替わる。
 */
export function usePrefetch(radius = 2): void {
  const paths = useViewer((s) => s.paths);
  const index = useViewer((s) => s.index);
  const held = useRef<HTMLImageElement[]>([]);

  useEffect(() => {
    if (paths.length <= 1) {
      held.current = [];
      return;
    }

    const targets = new Set<string>();
    for (let step = 1; step <= radius; step += 1) {
      targets.add(paths[(index + step) % paths.length]);
      targets.add(paths[(((index - step) % paths.length) + paths.length) % paths.length]);
    }
    targets.delete(paths[index]);

    held.current = [...targets].map((path) => {
      const image = new Image();
      image.decoding = "async";
      image.src = fullSrc(path);
      return image;
    });
  }, [paths, index, radius]);
}
