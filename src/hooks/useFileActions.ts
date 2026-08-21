import { useCallback, useMemo } from "react";

import { ipc } from "@/lib/ipc";
import { baseName } from "@/lib/format";
import { useViewer } from "@/store/viewer";

export type FileActions = {
  openDialog: () => Promise<void>;
  trash: () => Promise<void>;
  undoTrash: () => Promise<void>;
  copyImage: () => Promise<void>;
  copyPath: () => Promise<void>;
  reveal: () => Promise<void>;
};

/**
 * ファイル操作系のアクション。キーボードショートカットとボタンの両方から
 * 同じ関数を呼べるよう、トースト表示まで含めてここに閉じ込める。
 */
export function useFileActions(): FileActions {
  const openDialog = useCallback(async () => {
    const picked = await ipc.pickFile();
    if (picked) void useViewer.getState().openPath(picked);
  }, []);

  const trash = useCallback(async () => {
    const { current, pushToast, dropCurrent } = useViewer.getState();
    if (!current) return;

    try {
      await ipc.moveToTrash(current);
    } catch (error) {
      pushToast({ text: `削除できませんでした: ${error}`, tone: "danger" });
      return;
    }

    dropCurrent();
    pushToast({
      text: `${baseName(current)} をゴミ箱へ移動しました`,
      tone: "info",
      action: { label: "元に戻す", run: () => void undoTrashInternal() },
    });
  }, []);

  const undoTrash = useCallback(() => undoTrashInternal(), []);

  const copyImage = useCallback(async () => {
    const { current, pushToast } = useViewer.getState();
    if (!current) return;

    try {
      await ipc.copyImage(current);
      pushToast({ text: "画像をクリップボードへコピーしました", tone: "info" });
    } catch (error) {
      pushToast({ text: `コピーできませんでした: ${error}`, tone: "danger" });
    }
  }, []);

  const copyPath = useCallback(async () => {
    const { current, pushToast } = useViewer.getState();
    if (!current) return;

    try {
      await ipc.copyPath(current);
      pushToast({ text: "ファイルパスをコピーしました", tone: "info" });
    } catch (error) {
      pushToast({ text: `コピーできませんでした: ${error}`, tone: "danger" });
    }
  }, []);

  const reveal = useCallback(async () => {
    const { current, pushToast } = useViewer.getState();
    if (!current) return;

    try {
      await ipc.revealInExplorer(current);
    } catch (error) {
      pushToast({ text: `${error}`, tone: "danger" });
    }
  }, []);

  return useMemo(
    () => ({ openDialog, trash, undoTrash, copyImage, copyPath, reveal }),
    [openDialog, trash, undoTrash, copyImage, copyPath, reveal],
  );
}

/** トーストの「元に戻す」からも呼ぶため、フックの外に出しておく。 */
async function undoTrashInternal(): Promise<void> {
  const { pushToast, openPath } = useViewer.getState();

  try {
    const restored = await ipc.undoTrash();
    if (!restored) {
      pushToast({ text: "元に戻せる削除がありません", tone: "info" });
      return;
    }
    await openPath(restored);
    pushToast({ text: `${baseName(restored)} を元に戻しました`, tone: "info" });
  } catch (error) {
    pushToast({ text: `元に戻せませんでした: ${error}`, tone: "danger" });
  }
}
