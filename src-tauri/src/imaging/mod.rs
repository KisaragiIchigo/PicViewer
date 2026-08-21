pub mod cache;
pub mod decode;
pub mod formats;

#[cfg(test)]
mod tests {
    use super::{cache::ThumbCache, decode, formats};

    /// WebView が扱えない形式の変換、サムネイル生成、キャッシュの再利用を一気に確かめる。
    #[test]
    fn transcodes_thumbnails_and_reuses_cache() {
        let dir = std::env::temp_dir().join("picview-imaging-test");
        let _ = std::fs::create_dir_all(&dir);
        let source = dir.join("sample.tiff");

        let pixels = image::RgbImage::from_fn(320, 200, |x, y| {
            image::Rgb([(x % 256) as u8, (y % 256) as u8, 90])
        });
        image::DynamicImage::ImageRgb8(pixels)
            .save(&source)
            .expect("テスト用 TIFF を書き出せませんでした");

        assert!(formats::needs_transcode("tiff"));
        let png = decode::transcode_to_png(&source).expect("PNG へ変換できませんでした");
        assert_eq!(&png[..8], b"\x89PNG\r\n\x1a\n", "PNG シグネチャが一致しない");

        let thumb = decode::thumbnail_jpeg(&source, 64).expect("サムネイルを作れませんでした");
        assert_eq!(&thumb[..2], b"\xff\xd8", "JPEG シグネチャが一致しない");

        let decoded = image::load_from_memory(&thumb).expect("サムネイルを読み戻せませんでした");
        assert!(decoded.width() <= 64 && decoded.height() <= 64, "指定辺長を超えている");

        let cache = ThumbCache::new(dir.join("cache"));
        let first = cache
            .get_or_build(&source, 64, || decode::thumbnail_jpeg(&source, 64))
            .expect("初回の生成に失敗した");
        let second = cache
            .get_or_build(&source, 64, || panic!("2回目はキャッシュから返るはず"))
            .expect("キャッシュからの取得に失敗した");
        assert_eq!(first, second, "キャッシュの内容が初回と一致しない");

        let _ = std::fs::remove_dir_all(&dir);
    }
}
