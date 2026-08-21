import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";

import { FOLDER_CHANGED } from "@/lib/ipc";
import { samePath } from "@/lib/format";
import { useViewer } from "@/store/viewer";

/**
 * エクスプローラー側で画像が増減したときに一覧を追従させる。
 * Rust 側で 500ms のデバウンスを掛けているので、連続した操作でも一度しか来ない。
 */
export function useFolderWatch(): void {
  useEffect(() => {
    const pending = listen<string>(FOLDER_CHANGED, (event) => {
      const store = useViewer.getState();
      // 監視の張り替え直後に前のフォルダの通知が届くことがあるので確かめる。
      if (!store.dir || !samePath(store.dir, event.payload)) return;
      void store.reload();
    });

    return () => {
      void pending.then((unlisten) => unlisten());
    };
  }, []);
}
