mod commands;
mod events;
mod imaging;
mod protocol;
mod startup;
mod state;
mod util;
mod watcher;

use std::path::PathBuf;
use std::time::Duration;

use tauri::{AppHandle, Manager};

use state::AppState;

/// 起動の骨格。ここは各段取りを宣言順に呼ぶだけに専念し、実装は各モジュールへ寄せている。
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // ウィンドウ生成より前に引数を確定させる。ここが速いほど1枚目の表示が早い。
    let initial = startup::initial_target(std::env::args());

    let mut builder = tauri::Builder::default();

    #[cfg(desktop)]
    {
        // single-instance は他プラグインより先に登録する必要がある。
        builder = builder
            .plugin(tauri_plugin_single_instance::init(
                events::on_second_instance,
            ))
            .plugin(
                tauri_plugin_window_state::Builder::default()
                    .with_state_flags(window_state_flags())
                    .build(),
            );
    }

    builder
        .plugin(tauri_plugin_dialog::init())
        // 状態の登録は setup ではなくここで行う。WebView はウィンドウ生成と同時に
        // 読み込みを始めるため、setup を待つと最初のリクエストが状態未登録に当たる。
        .manage(AppState::new(initial, cache_root()))
        .manage(watcher::FolderWatch::default())
        .register_asynchronous_uri_scheme_protocol("picv", |context, request, responder| {
            protocol::handle(context.app_handle(), request, responder);
        })
        .invoke_handler(tauri::generate_handler![
            commands::chrome::boot,
            commands::chrome::chrome_ready,
            commands::chrome::start_drag,
            commands::chrome::minimize,
            commands::chrome::toggle_maximize,
            commands::chrome::close_window,
            commands::chrome::toggle_fullscreen,
            commands::chrome::set_title,
            commands::library::list_siblings,
            commands::library::resolve_target,
            commands::library::watch_folder,
            commands::library::pick_file,
            commands::file_ops::move_to_trash,
            commands::file_ops::undo_trash,
            commands::file_ops::reveal_in_explorer,
            commands::file_ops::copy_image,
            commands::file_ops::copy_path,
            commands::meta::file_meta,
        ])
        .on_window_event(events::on_window_event)
        .setup(|app| {
            spawn_show_guard(app.handle().clone());
            spawn_cache_prune(app.handle().clone());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("PicView の起動に失敗しました");
}

/// サムネイルキャッシュの置き場。AppHandle に依存しないので、
/// 状態を builder 段階で組み立てられる。
fn cache_root() -> PathBuf {
    std::env::var_os("LOCALAPPDATA")
        .map(PathBuf::from)
        .unwrap_or_else(std::env::temp_dir)
        .join("PicView")
        .join("cache")
}

/// フロントの初回描画が何らかの理由で失敗しても、ウィンドウが不可視のまま
/// 残らないようにするための保険。
fn spawn_show_guard(app: AppHandle) {
    std::thread::spawn(move || {
        std::thread::sleep(Duration::from_millis(1500));
        if app.state::<AppState>().claim_show() {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }
    });
}

/// サムネイルキャッシュの間引き。ディスク走査が起動を邪魔しないよう別スレッドで遅らせる。
fn spawn_cache_prune(app: AppHandle) {
    std::thread::spawn(move || {
        std::thread::sleep(Duration::from_secs(5));
        app.state::<AppState>().thumbs.prune(4000);
    });
}

#[cfg(desktop)]
fn window_state_flags() -> tauri_plugin_window_state::StateFlags {
    use tauri_plugin_window_state::StateFlags;
    // VISIBLE を含めると初回描画前にウィンドウが出てしまうため、意図的に外している。
    StateFlags::POSITION | StateFlags::SIZE | StateFlags::MAXIMIZED
}
