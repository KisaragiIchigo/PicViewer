use tauri::{State, Window};

use crate::state::AppState;

/// フロント起動直後に1回だけ呼ばれ、起動引数で渡された画像パスを受け取る。
#[tauri::command]
pub fn boot(state: State<'_, AppState>) -> Option<String> {
    state
        .take_pending()
        .map(|path| path.to_string_lossy().into_owned())
}

/// 最初の1枚を描き終えた時点で呼ぶ。ここで初めてウィンドウを可視化するので、
/// 白背景のちらつきも「枠だけ先に出て中身が後から来る」感じも発生しない。
#[tauri::command]
pub fn chrome_ready(window: Window, state: State<'_, AppState>) {
    if state.claim_show() {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

/// タイトルバーを自前で描いているので、ドラッグ移動も自前で開始する。
#[tauri::command]
pub fn start_drag(window: Window) {
    let _ = window.start_dragging();
}

#[tauri::command]
pub fn minimize(window: Window) {
    let _ = window.minimize();
}

#[tauri::command]
pub fn toggle_maximize(window: Window) -> bool {
    let maximized = window.is_maximized().unwrap_or(false);
    if maximized {
        let _ = window.unmaximize();
    } else {
        let _ = window.maximize();
    }
    !maximized
}

#[tauri::command]
pub fn close_window(window: Window) {
    let _ = window.close();
}

#[tauri::command]
pub fn toggle_fullscreen(window: Window) -> bool {
    let full = window.is_fullscreen().unwrap_or(false);
    let _ = window.set_fullscreen(!full);
    !full
}

#[tauri::command]
pub fn set_title(window: Window, title: String) {
    let _ = window.set_title(&title);
}
