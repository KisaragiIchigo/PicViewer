use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::Duration;

use notify::{RecommendedWatcher, RecursiveMode};
use notify_debouncer_mini::{new_debouncer, DebounceEventResult, Debouncer};
use tauri::{AppHandle, Emitter};

/// 表示中のフォルダに変化があったことをフロントへ伝えるイベント名。
pub const FOLDER_CHANGED: &str = "picview://folder-changed";

/// エクスプローラー側での連続した操作をまとめるための待ち時間。
const DEBOUNCE: Duration = Duration::from_millis(500);

/// 表示中のフォルダを1つだけ監視する。フォルダを移ると前の監視は捨てる。
#[derive(Default)]
pub struct FolderWatch {
    current: Mutex<Option<Watch>>,
}

struct Watch {
    dir: PathBuf,
    // Debouncer を保持している間だけ監視が続く。落とすと監視も止まる。
    _debouncer: Debouncer<RecommendedWatcher>,
}

impl FolderWatch {
    /// 監視対象を差し替える。すでに同じフォルダを見ているなら何もしない。
    pub fn observe(&self, app: &AppHandle, dir: &Path) {
        let Ok(mut slot) = self.current.lock() else {
            return;
        };

        if slot.as_ref().is_some_and(|watch| watch.dir == dir) {
            return;
        }

        // 先に古い監視を落としてからハンドルを張り替える。
        *slot = None;

        let handle = app.clone();
        let target = dir.to_path_buf();
        let notify_target = target.clone();

        let debouncer = new_debouncer(DEBOUNCE, move |result: DebounceEventResult| {
            if result.is_err() {
                return;
            }
            let _ = handle.emit(FOLDER_CHANGED, notify_target.to_string_lossy().into_owned());
        });

        let Ok(mut debouncer) = debouncer else {
            return;
        };

        // 中身だけ見れば十分なので、サブフォルダは追いかけない。
        if debouncer.watcher().watch(&target, RecursiveMode::NonRecursive).is_err() {
            return;
        }

        *slot = Some(Watch {
            dir: target,
            _debouncer: debouncer,
        });
    }

    /// 監視を止める。表示中の画像が無くなったときに呼ぶ。
    pub fn clear(&self) {
        if let Ok(mut slot) = self.current.lock() {
            *slot = None;
        }
    }
}
