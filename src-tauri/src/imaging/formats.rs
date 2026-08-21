/// WebView(Chromium) が自前でデコードできる形式。ここに該当する画像は Rust 側で
/// 一切触らず生バイトのまま流すため、表示までの経路が最短になる。
const WEBVIEW_NATIVE: &[&str] = &[
    "png", "jpg", "jpeg", "jfif", "jpe", "gif", "webp", "bmp", "avif", "ico", "svg",
];

/// WebView が描画できないため、Rust 側で PNG へ変換してから渡す形式。
const TRANSCODE: &[&str] = &[
    "tif", "tiff", "tga", "dds", "qoi", "ppm", "pgm", "pbm", "pnm", "hdr",
];

/// ビューアが開ける拡張子かどうか。
pub fn is_supported(ext: &str) -> bool {
    WEBVIEW_NATIVE.contains(&ext) || TRANSCODE.contains(&ext)
}

/// Rust 側での変換が必要かどうか。
pub fn needs_transcode(ext: &str) -> bool {
    TRANSCODE.contains(&ext)
}

/// サムネイル生成に `image` クレートのデコーダを使えるか。
/// SVG と AVIF はデコーダを積んでいないので、サムネイルは原寸表示で代替する。
pub fn thumbnailable(ext: &str) -> bool {
    ext != "svg" && ext != "avif"
}

/// レスポンスに載せる Content-Type。
pub fn mime_for(ext: &str) -> &'static str {
    match ext {
        "png" => "image/png",
        "jpg" | "jpeg" | "jfif" | "jpe" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "bmp" => "image/bmp",
        "avif" => "image/avif",
        "ico" => "image/x-icon",
        "svg" => "image/svg+xml",
        _ => "application/octet-stream",
    }
}

/// ファイル選択ダイアログ用の拡張子一覧。
pub fn dialog_filter() -> Vec<&'static str> {
    WEBVIEW_NATIVE.iter().chain(TRANSCODE.iter()).copied().collect()
}
