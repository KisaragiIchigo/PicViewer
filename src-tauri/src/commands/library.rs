use std::path::{Path, PathBuf};

use serde::Serialize;
use tauri::{AppHandle, Manager};
use tauri_plugin_dialog::DialogExt;

use crate::imaging::formats;
use crate::util::natsort::natural_cmp;
use crate::util::ext_of;
use crate::watcher::FolderWatch;

/// フォルダ内の画像一覧と、その中での現在位置。
#[derive(Serialize, Clone)]
pub struct Library {
    pub dir: String,
    pub paths: Vec<String>,
    pub index: usize,
}

/// 対象と同じフォルダにある画像を自然順で列挙する。
/// 起動直後の初回描画を待たせないよう、フロントは画像を表示した「後で」これを呼ぶ。
#[tauri::command]
pub async fn list_siblings(target: String) -> Result<Library, String> {
    tauri::async_runtime::spawn_blocking(move || scan(&PathBuf::from(target)))
        .await
        .map_err(|e| format!("フォルダ走査に失敗しました: {e}"))?
}

/// 渡されたパスを「表示すべき1枚」に解決する。フォルダなら中の最初の画像を返す。
#[tauri::command]
pub async fn resolve_target(path: String) -> Result<Option<String>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let target = PathBuf::from(path);
        if target.is_file() {
            // 対応外の拡張子はここで弾く。通してしまうと一覧の位置と
            // 表示中のファイルがずれる。
            if !formats::is_supported(&ext_of(&target)) {
                return Ok(None);
            }
            return Ok(Some(target.to_string_lossy().into_owned()));
        }
        if !target.is_dir() {
            return Ok(None);
        }
        Ok(scan(&target)?.paths.into_iter().next())
    })
    .await
    .map_err(|e| format!("パス解決に失敗しました: {e}"))?
}

/// 表示中のフォルダの監視を開始する。エクスプローラー側で画像が増減したら
/// `picview://folder-changed` が飛ぶので、フロントは一覧を取り直す。
#[tauri::command]
pub fn watch_folder(app: AppHandle, dir: String) {
    let state = app.state::<FolderWatch>();
    if dir.is_empty() {
        state.clear();
        return;
    }
    state.observe(&app, Path::new(&dir));
}

/// ネイティブのファイル選択ダイアログを開く。
#[tauri::command]
pub async fn pick_file(app: AppHandle) -> Option<String> {
    let extensions = formats::dialog_filter();
    let picked = app
        .dialog()
        .file()
        .set_title("画像を選択")
        .add_filter("画像ファイル", &extensions)
        .blocking_pick_file()?;

    picked.into_path().ok().map(|p| p.to_string_lossy().into_owned())
}

fn scan(target: &Path) -> Result<Library, String> {
    let (dir, focus) = if target.is_dir() {
        (target.to_path_buf(), None)
    } else {
        let parent = target
            .parent()
            .ok_or_else(|| "親フォルダを特定できませんでした".to_string())?;
        (parent.to_path_buf(), Some(target.to_path_buf()))
    };

    let mut entries: Vec<PathBuf> = std::fs::read_dir(&dir)
        .map_err(|e| format!("フォルダを読み取れませんでした: {e}"))?
        .flatten()
        .filter(|entry| entry.file_type().map(|t| t.is_file()).unwrap_or(false))
        .map(|entry| entry.path())
        .filter(|path| formats::is_supported(&ext_of(path)))
        .collect();

    entries.sort_by(|a, b| natural_cmp(&file_name(a), &file_name(b)));

    let index = focus
        .and_then(|target| entries.iter().position(|p| same_path(p, &target)))
        .unwrap_or(0);

    Ok(Library {
        dir: dir.to_string_lossy().into_owned(),
        paths: entries
            .iter()
            .map(|p| p.to_string_lossy().into_owned())
            .collect(),
        index,
    })
}

fn file_name(path: &Path) -> String {
    path.file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .unwrap_or_default()
}

/// Windows はパスの大文字小文字を区別しないため、比較は小文字化して行う。
fn same_path(a: &Path, b: &Path) -> bool {
    a.to_string_lossy().to_lowercase() == b.to_string_lossy().to_lowercase()
}
