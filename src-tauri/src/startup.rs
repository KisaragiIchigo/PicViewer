use std::path::PathBuf;

/// コマンドライン引数から「開くべき対象」を1つ拾う。
/// exe 自身（先頭）とオプション引数は無視し、実在するパスだけを返す。
/// フォルダが渡された場合もそのまま返し、中身の解決は library 側に任せる。
pub fn initial_target<I>(args: I) -> Option<PathBuf>
where
    I: IntoIterator<Item = String>,
{
    args.into_iter()
        .skip(1)
        .filter(|a| !a.starts_with('-'))
        .map(PathBuf::from)
        .find(|p| p.exists())
}

#[cfg(test)]
mod tests {
    use super::initial_target;

    #[test]
    fn ignores_flags_and_missing_paths() {
        let args = vec![
            "picview.exe".to_string(),
            "--flag".to_string(),
            "存在しないパス.png".to_string(),
        ];
        assert!(initial_target(args).is_none());
    }
}
