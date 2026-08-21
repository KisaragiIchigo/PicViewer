use std::path::PathBuf;

use tauri::{AppHandle, Manager};

use crate::imaging::decode;
use crate::state::AppState;

/// 現在の画像をゴミ箱へ送る。元パスは取り消し用に控えておく。
#[tauri::command]
pub async fn move_to_trash(app: AppHandle, path: String) -> Result<(), String> {
    let target = PathBuf::from(&path);
    tauri::async_runtime::spawn_blocking(move || trash::delete(&target))
        .await
        .map_err(|e| format!("削除処理を実行できませんでした: {e}"))?
        .map_err(|e| format!("ゴミ箱へ移動できませんでした: {e}"))?;

    app.state::<AppState>().push_trashed(PathBuf::from(path));
    Ok(())
}

/// 直近にゴミ箱へ送ったファイルを元の場所へ戻す。戻したパスを返す。
#[tauri::command]
pub async fn undo_trash(app: AppHandle) -> Result<Option<String>, String> {
    let Some(wanted) = app.state::<AppState>().pop_trashed() else {
        return Ok(None);
    };

    let restored = tauri::async_runtime::spawn_blocking(move || restore(wanted))
        .await
        .map_err(|e| format!("復元処理を実行できませんでした: {e}"))??;

    Ok(restored)
}

fn restore(wanted: PathBuf) -> Result<Option<String>, String> {
    let items = trash::os_limited::list()
        .map_err(|e| format!("ゴミ箱の一覧を取得できませんでした: {e}"))?;

    let mut candidates: Vec<trash::TrashItem> = items
        .into_iter()
        .filter(|item| {
            item.original_path().to_string_lossy().to_lowercase()
                == wanted.to_string_lossy().to_lowercase()
        })
        .collect();

    if candidates.is_empty() {
        return Ok(None);
    }

    // 同名が複数ある場合は最後に捨てた1件だけを戻す（複数同時復元は衝突する）。
    candidates.sort_by_key(|item| item.time_deleted);
    let newest = candidates.pop().expect("candidates は空でないことを確認済み");
    let path = newest.original_path().to_string_lossy().into_owned();

    trash::os_limited::restore_all([newest])
        .map_err(|e| format!("ゴミ箱から復元できませんでした: {e}"))?;

    Ok(Some(path))
}

#[cfg(test)]
mod tests {
    use super::restore;

    /// ゴミ箱へ送ったファイルが元の場所へ戻ることを、実際に往復させて確かめる。
    ///
    /// ゴミ箱が利用できる対話セッションでしか成立しない（サービスセッションや
    /// 一部のサンドボックス下では、Windows 標準の SendToRecycleBin を使っても
    /// ゴミ箱が空のままになる）。実行するには次を使う:
    /// `cargo test -- --ignored trashed_file_comes_back`
    #[test]
    #[ignore = "ゴミ箱が使える対話セッションでのみ実行できる"]
    fn trashed_file_comes_back() {
        let target = std::env::temp_dir().join("picview-trash-roundtrip.txt");
        std::fs::write(&target, b"picview").expect("一時ファイルを作成できませんでした");

        trash::delete(&target).expect("ゴミ箱へ移動できませんでした");
        assert!(!target.exists(), "ゴミ箱へ移動した直後にファイルが残っている");

        let restored = restore(target.clone()).expect("復元処理が失敗した");
        assert_eq!(restored.as_deref(), Some(target.to_string_lossy().as_ref()));
        assert!(target.exists(), "復元後にファイルが存在しない");

        let _ = std::fs::remove_file(&target);
    }
}

/// エクスプローラーで該当ファイルを選択状態で開く。
#[tauri::command]
pub async fn reveal_in_explorer(path: String) -> Result<(), String> {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        std::process::Command::new("explorer")
            .raw_arg(format!("/select,\"{path}\""))
            .spawn()
            .map_err(|e| format!("エクスプローラーを起動できませんでした: {e}"))?;
        return Ok(());
    }

    #[cfg(not(windows))]
    {
        let _ = path;
        Err("この操作は Windows でのみ利用できます".to_string())
    }
}

/// 画像そのものをクリップボードへコピーする。
#[tauri::command]
pub async fn copy_image(path: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let (width, height, rgba) = decode::to_raw_rgba(&PathBuf::from(path))?;
        let mut clipboard = arboard::Clipboard::new()
            .map_err(|e| format!("クリップボードを開けませんでした: {e}"))?;
        clipboard
            .set_image(arboard::ImageData {
                width: width as usize,
                height: height as usize,
                bytes: rgba.into(),
            })
            .map_err(|e| format!("クリップボードへ書き込めませんでした: {e}"))
    })
    .await
    .map_err(|e| format!("コピー処理を実行できませんでした: {e}"))?
}

/// ファイルパスを文字列としてクリップボードへコピーする。
#[tauri::command]
pub async fn copy_path(path: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let mut clipboard = arboard::Clipboard::new()
            .map_err(|e| format!("クリップボードを開けませんでした: {e}"))?;
        clipboard
            .set_text(path)
            .map_err(|e| format!("クリップボードへ書き込めませんでした: {e}"))
    })
    .await
    .map_err(|e| format!("コピー処理を実行できませんでした: {e}"))?
}
