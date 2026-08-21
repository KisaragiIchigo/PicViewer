use std::path::PathBuf;

use serde::Serialize;

use crate::util::{ext_of, to_epoch_ms};

/// 情報オーバーレイに出すファイル属性。画像の実寸は WebView 側の
/// naturalWidth / naturalHeight から取れるので、ここでは扱わない。
#[derive(Serialize)]
pub struct FileMeta {
    pub name: String,
    pub path: String,
    pub dir: String,
    pub ext: String,
    pub bytes: u64,
    pub modified: u64,
}

#[tauri::command]
pub async fn file_meta(path: String) -> Result<FileMeta, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let target = PathBuf::from(&path);
        let metadata = std::fs::metadata(&target)
            .map_err(|e| format!("ファイル情報を取得できませんでした: {e}"))?;

        Ok(FileMeta {
            name: target
                .file_name()
                .map(|n| n.to_string_lossy().into_owned())
                .unwrap_or_default(),
            dir: target
                .parent()
                .map(|p| p.to_string_lossy().into_owned())
                .unwrap_or_default(),
            ext: ext_of(&target),
            bytes: metadata.len(),
            modified: metadata.modified().map(to_epoch_ms).unwrap_or(0),
            path,
        })
    })
    .await
    .map_err(|e| format!("ファイル情報の取得に失敗しました: {e}"))?
}
