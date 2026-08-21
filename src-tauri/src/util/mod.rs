pub mod natsort;

use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

/// パスの拡張子を小文字で返す。拡張子が無ければ空文字。
pub fn ext_of(path: &Path) -> String {
    path.extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_ascii_lowercase())
        .unwrap_or_default()
}

/// 更新時刻をエポックミリ秒で返す。取得できない場合は 0。
pub fn modified_ms(path: &Path) -> u64 {
    std::fs::metadata(path)
        .and_then(|m| m.modified())
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

/// ファイルサイズ。取得できない場合は 0。
pub fn file_size(path: &Path) -> u64 {
    std::fs::metadata(path).map(|m| m.len()).unwrap_or(0)
}

/// SystemTime をエポックミリ秒へ。
pub fn to_epoch_ms(time: SystemTime) -> u64 {
    time.duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}
