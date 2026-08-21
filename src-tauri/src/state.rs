use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;

use crate::imaging::cache::ThumbCache;

/// アプリ全体で共有する状態。
/// - `pending`: 起動引数で渡された画像。フロントが最初の1回だけ取りに来る。
/// - `shown`  : ウィンドウを可視化済みか。初回描画完了とタイムアウトの両方から立てる。
/// - `trashed`: ゴミ箱へ送った元パスの履歴（Ctrl+Z の取り消し用）。
pub struct AppState {
    pending: Mutex<Option<PathBuf>>,
    shown: AtomicBool,
    trashed: Mutex<Vec<PathBuf>>,
    pub thumbs: ThumbCache,
}

impl AppState {
    pub fn new(pending: Option<PathBuf>, cache_dir: PathBuf) -> Self {
        Self {
            pending: Mutex::new(pending),
            shown: AtomicBool::new(false),
            trashed: Mutex::new(Vec::new()),
            thumbs: ThumbCache::new(cache_dir),
        }
    }

    /// 起動引数を1回だけ取り出す。2回目以降は None。
    pub fn take_pending(&self) -> Option<PathBuf> {
        self.pending.lock().ok().and_then(|mut p| p.take())
    }

    /// まだ可視化していなければ true を返し、同時に可視化済みへ倒す。
    pub fn claim_show(&self) -> bool {
        !self.shown.swap(true, Ordering::SeqCst)
    }

    pub fn push_trashed(&self, path: PathBuf) {
        if let Ok(mut log) = self.trashed.lock() {
            log.push(path);
            if log.len() > 64 {
                log.remove(0);
            }
        }
    }

    pub fn pop_trashed(&self) -> Option<PathBuf> {
        self.trashed.lock().ok().and_then(|mut log| log.pop())
    }
}
