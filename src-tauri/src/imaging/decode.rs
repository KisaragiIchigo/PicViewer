use std::io::Cursor;
use std::path::Path;

use image::{DynamicImage, ImageFormat, ImageReader, Limits};

/// デコード時に確保を許すメモリの上限。
///
/// `image` クレートの既定値は 512MB で、1億7千万画素あたりで頭打ちになる。
/// 手元の写真やスキャン画像は普通にこれを超えるため、上限を引き上げている。
/// 一方で無制限にはしない——壊れたファイルのヘッダで巨大な確保を要求されたときに、
/// アプリごと落ちるより「開けませんでした」と出す方がましなので。
const MAX_ALLOC: u64 = 6 * 1024 * 1024 * 1024;

/// WebView が描画できない形式を PNG バイト列へ変換する。
/// 16bit/32bit 深度は 8bit RGBA へ落とす（ビューア用途では十分で、転送量が小さい）。
pub fn transcode_to_png(path: &Path) -> Result<Vec<u8>, String> {
    let image = open(path)?;
    encode_png(&image)
}

/// サムネイル用の JPEG バイト列を作る。透過は黒地へ合成する。
pub fn thumbnail_jpeg(path: &Path, max_edge: u32) -> Result<Vec<u8>, String> {
    let image = open(path)?;
    let thumb = image.thumbnail(max_edge, max_edge);
    encode_jpeg_on_black(&thumb)
}

fn open(path: &Path) -> Result<DynamicImage, String> {
    let mut reader = ImageReader::open(path)
        .map_err(|e| format!("ファイルを開けませんでした: {e}"))?
        .with_guessed_format()
        .map_err(|e| format!("形式を判別できませんでした: {e}"))?;

    let mut limits = Limits::no_limits();
    limits.max_alloc = Some(MAX_ALLOC);
    reader.limits(limits);

    reader
        .decode()
        .map_err(|e| format!("画像をデコードできませんでした: {e}"))
}

fn encode_png(image: &DynamicImage) -> Result<Vec<u8>, String> {
    let rgba = image.to_rgba8();
    let mut out = Vec::with_capacity(rgba.len() / 3);
    DynamicImage::ImageRgba8(rgba)
        .write_to(&mut Cursor::new(&mut out), ImageFormat::Png)
        .map_err(|e| format!("PNG へ変換できませんでした: {e}"))?;
    Ok(out)
}

fn encode_jpeg_on_black(image: &DynamicImage) -> Result<Vec<u8>, String> {
    let rgba = image.to_rgba8();
    let (w, h) = (rgba.width(), rgba.height());
    let mut rgb = image::RgbImage::new(w, h);

    for (x, y, pixel) in rgba.enumerate_pixels() {
        let alpha = f32::from(pixel[3]) / 255.0;
        rgb.put_pixel(
            x,
            y,
            image::Rgb([
                (f32::from(pixel[0]) * alpha) as u8,
                (f32::from(pixel[1]) * alpha) as u8,
                (f32::from(pixel[2]) * alpha) as u8,
            ]),
        );
    }

    let mut out = Vec::new();
    let mut encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut out, 78);
    encoder
        .encode_image(&rgb)
        .map_err(|e| format!("サムネイルを生成できませんでした: {e}"))?;
    Ok(out)
}

/// クリップボードへ渡すための RGBA 生データ。
pub fn to_raw_rgba(path: &Path) -> Result<(u32, u32, Vec<u8>), String> {
    let image = open(path)?;
    let rgba = image.to_rgba8();
    Ok((rgba.width(), rgba.height(), rgba.into_raw()))
}
