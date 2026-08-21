use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use std::path::{Path, PathBuf};

use percent_encoding::percent_decode_str;
use tauri::http::{Request, Response, StatusCode};
use tauri::{AppHandle, Manager, UriSchemeResponder};

use crate::imaging::{decode, formats};
use crate::state::AppState;
use crate::util::{ext_of, file_size, modified_ms};

/// `picv://` プロトコルのエンドポイント。
/// - `/full?p=<パス>`            … 表示用の画像本体
/// - `/thumb?p=<パス>&s=<辺長>`  … サムネイル
///
/// WebView からローカルファイルを読む唯一の経路なので、ここがシステム境界。
/// 対応拡張子かつ実在する通常ファイルであることを必ず検証してから返す。
pub fn handle(app: &AppHandle, request: Request<Vec<u8>>, responder: UriSchemeResponder) {
    let app = app.clone();
    let uri = request.uri().to_string();
    let known_tag = request
        .headers()
        .get("if-none-match")
        .and_then(|value| value.to_str().ok())
        .map(str::to_owned);

    std::thread::spawn(move || {
        responder.respond(route(&app, &uri, known_tag.as_deref()));
    });
}

fn route(app: &AppHandle, uri: &str, known_tag: Option<&str>) -> Response<Vec<u8>> {
    let (path_part, query) = split_uri(uri);
    let Some(target) = query_value(query, "p").map(PathBuf::from) else {
        return error(StatusCode::BAD_REQUEST, "パスが指定されていません");
    };

    if !target.is_file() {
        return error(StatusCode::NOT_FOUND, "ファイルが見つかりません");
    }

    let ext = ext_of(&target);
    if !formats::is_supported(&ext) {
        return error(StatusCode::FORBIDDEN, "対応していない形式です");
    }

    match path_part {
        "/full" => {
            let tag = etag(&target, "full");
            if known_tag == Some(tag.as_str()) {
                return not_modified(&tag);
            }
            serve_full(&target, &ext, &tag)
        }
        "/thumb" => {
            let edge = query_value(query, "s")
                .and_then(|v| v.parse::<u32>().ok())
                .unwrap_or(160)
                .clamp(48, 640);

            let tag = etag(&target, &format!("thumb{edge}"));
            if known_tag == Some(tag.as_str()) {
                return not_modified(&tag);
            }
            serve_thumb(app, &target, &ext, edge, &tag)
        }
        _ => error(StatusCode::NOT_FOUND, "不明なエンドポイントです"),
    }
}

fn serve_full(target: &Path, ext: &str, tag: &str) -> Response<Vec<u8>> {
    if formats::needs_transcode(ext) {
        return match decode::transcode_to_png(target) {
            Ok(bytes) => ok(bytes, "image/png", tag),
            Err(message) => error(StatusCode::UNSUPPORTED_MEDIA_TYPE, &message),
        };
    }

    match std::fs::read(target) {
        Ok(bytes) => ok(bytes, formats::mime_for(ext), tag),
        Err(e) => error(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
    }
}

fn serve_thumb(
    app: &AppHandle,
    target: &Path,
    ext: &str,
    edge: u32,
    tag: &str,
) -> Response<Vec<u8>> {
    if !formats::thumbnailable(ext) {
        return serve_full(target, ext, tag);
    }

    let state = app.state::<AppState>();
    match state
        .thumbs
        .get_or_build(target, edge, || decode::thumbnail_jpeg(target, edge))
    {
        Ok(bytes) => ok(bytes, "image/jpeg", tag),
        Err(message) => error(StatusCode::UNSUPPORTED_MEDIA_TYPE, &message),
    }
}

/// 元ファイルの更新時刻とサイズから作る検証子。
/// ファイルが差し替われば値が変わるので、キャッシュを持ち越しても古い絵は出ない。
fn etag(path: &Path, salt: &str) -> String {
    let mut hasher = DefaultHasher::new();
    path.to_string_lossy().to_lowercase().hash(&mut hasher);
    modified_ms(path).hash(&mut hasher);
    file_size(path).hash(&mut hasher);
    salt.hash(&mut hasher);
    format!("\"{:016x}\"", hasher.finish())
}

/// `no-cache` は「保存はするが毎回検証する」の意味。検証が一致すれば 304 を返すので、
/// ディスク読み込みもデコードも起きず、WebView 側のデコード済み画像がそのまま使われる。
const REVALIDATE: &str = "no-cache";

fn ok(body: Vec<u8>, mime: &str, tag: &str) -> Response<Vec<u8>> {
    Response::builder()
        .status(StatusCode::OK)
        .header("Content-Type", mime)
        .header("Access-Control-Allow-Origin", "*")
        .header("Cache-Control", REVALIDATE)
        .header("ETag", tag)
        .body(body)
        .unwrap_or_else(|_| Response::new(Vec::new()))
}

fn not_modified(tag: &str) -> Response<Vec<u8>> {
    Response::builder()
        .status(StatusCode::NOT_MODIFIED)
        .header("Access-Control-Allow-Origin", "*")
        .header("Cache-Control", REVALIDATE)
        .header("ETag", tag)
        .body(Vec::new())
        .unwrap_or_else(|_| Response::new(Vec::new()))
}

fn error(status: StatusCode, message: &str) -> Response<Vec<u8>> {
    Response::builder()
        .status(status)
        .header("Content-Type", "text/plain; charset=utf-8")
        .header("Access-Control-Allow-Origin", "*")
        .body(message.as_bytes().to_vec())
        .unwrap_or_else(|_| Response::new(Vec::new()))
}

/// `http://picv.localhost/full?p=...` からパス部とクエリ部を切り出す。
fn split_uri(uri: &str) -> (&str, &str) {
    let without_scheme = uri.split_once("://").map(|(_, rest)| rest).unwrap_or(uri);
    let path_and_query = without_scheme
        .find('/')
        .map(|i| &without_scheme[i..])
        .unwrap_or("/");

    match path_and_query.split_once('?') {
        Some((path, query)) => (path, query),
        None => (path_and_query, ""),
    }
}

fn query_value(query: &str, key: &str) -> Option<String> {
    query.split('&').find_map(|pair| {
        let (k, v) = pair.split_once('=')?;
        if k != key {
            return None;
        }
        percent_decode_str(v).decode_utf8().ok().map(|s| s.into_owned())
    })
}

#[cfg(test)]
mod tests {
    use super::{etag, query_value, split_uri};

    #[test]
    fn splits_windows_style_uri() {
        let (path, query) = split_uri("http://picv.localhost/full?p=C%3A%5Ca.png");
        assert_eq!(path, "/full");
        assert_eq!(query_value(query, "p").as_deref(), Some(r"C:\a.png"));
    }

    #[test]
    fn handles_missing_query() {
        let (path, query) = split_uri("picv://localhost/thumb");
        assert_eq!(path, "/thumb");
        assert!(query_value(query, "p").is_none());
    }

    #[test]
    fn etag_changes_with_content() {
        let path = std::env::temp_dir().join("picview-etag-test.bin");

        std::fs::write(&path, b"one").unwrap();
        let first = etag(&path, "full");

        std::fs::write(&path, b"one and a half").unwrap();
        let second = etag(&path, "full");

        assert_ne!(first, second, "内容が変わったのに検証子が同じ");
        assert_ne!(
            etag(&path, "full"),
            etag(&path, "thumb160"),
            "エンドポイントが違えば検証子も分かれるべき"
        );

        let _ = std::fs::remove_file(&path);
    }
}
