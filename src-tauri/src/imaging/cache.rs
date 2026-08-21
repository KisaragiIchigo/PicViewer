use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};

use crate::util::modified_ms;

/// 書き込み中の一時ファイル名を衝突させないための通し番号。
static STAGING_SEQ: AtomicU64 = AtomicU64::new(0);

/// サムネイルのディスクキャッシュ置き場。元ファイルのパス・更新時刻・要求サイズを
/// 混ぜた鍵でファイル名を決めるので、元画像を差し替えれば自動的に別エントリになる。
pub struct ThumbCache {
    dir: PathBuf,
}

impl ThumbCache {
    pub fn new(base: PathBuf) -> Self {
        let dir = base.join("thumbs");
        let _ = std::fs::create_dir_all(&dir);
        Self { dir }
    }

    pub fn get_or_build<F>(&self, src: &Path, max_edge: u32, build: F) -> Result<Vec<u8>, String>
    where
        F: FnOnce() -> Result<Vec<u8>, String>,
    {
        let cached = self.entry_path(src, max_edge);
        if let Ok(bytes) = std::fs::read(&cached) {
            if !bytes.is_empty() {
                return Ok(bytes);
            }
        }

        let bytes = build()?;

        // 同じサムネイルを同時に要求された場合に、書きかけのファイルを
        // 読ませないよう別名で書いてから差し替える。
        let ticket = STAGING_SEQ.fetch_add(1, Ordering::Relaxed);
        let staging = cached.with_extension(format!("{ticket}.part"));
        if std::fs::write(&staging, &bytes).is_ok() {
            let _ = std::fs::rename(&staging, &cached);
        }

        Ok(bytes)
    }

    fn entry_path(&self, src: &Path, max_edge: u32) -> PathBuf {
        let mut hasher = DefaultHasher::new();
        src.to_string_lossy().to_lowercase().hash(&mut hasher);
        modified_ms(src).hash(&mut hasher);
        crate::util::file_size(src).hash(&mut hasher);
        max_edge.hash(&mut hasher);
        self.dir.join(format!("{:016x}.jpg", hasher.finish()))
    }

    /// 一定量を超えたキャッシュを古い順に間引く。起動時に一度だけ呼ぶ。
    pub fn prune(&self, keep: usize) {
        let Ok(entries) = std::fs::read_dir(&self.dir) else {
            return;
        };

        let mut files: Vec<(u64, PathBuf)> = entries
            .flatten()
            .filter_map(|e| {
                let path = e.path();
                let modified = e.metadata().ok()?.modified().ok()?;
                Some((crate::util::to_epoch_ms(modified), path))
            })
            .collect();

        if files.len() <= keep {
            return;
        }

        files.sort_by_key(|(time, _)| *time);
        for (_, path) in files.iter().take(files.len() - keep) {
            let _ = std::fs::remove_file(path);
        }
    }
}
