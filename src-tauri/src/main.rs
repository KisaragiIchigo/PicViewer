// Windows でコンソールウィンドウを出さない（リリースビルドのみ）
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    picview_lib::run();
}
