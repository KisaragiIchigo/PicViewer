use tauri::{AppHandle, DragDropEvent, Emitter, Manager, Window, WindowEvent};

/// フロントへ「このパスを開いて」と伝えるイベント名。
/// 起動済みインスタンスへの引数転送とドラッグ&ドロップの両方がここへ集まる。
pub const OPEN_REQUEST: &str = "picview://open";

/// ウィンドウへのドラッグ&ドロップを拾う。HTML 側の DnD ではなく Tauri の
/// ネイティブイベントを使うため、実ファイルパスがそのまま得られる。
pub fn on_window_event(window: &Window, event: &WindowEvent) {
    if let WindowEvent::DragDrop(DragDropEvent::Drop { paths, .. }) = event {
        if let Some(first) = paths.first() {
            let _ = window.emit(OPEN_REQUEST, first.to_string_lossy().into_owned());
        }
    }
}

/// 2つ目のインスタンスが起動したときに呼ばれる。既存ウィンドウへ引数を渡して前面化する。
pub fn on_second_instance(app: &AppHandle, argv: Vec<String>, _cwd: String) {
    if let Some(target) = crate::startup::initial_target(argv) {
        let _ = app.emit(OPEN_REQUEST, target.to_string_lossy().into_owned());
    }

    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}
