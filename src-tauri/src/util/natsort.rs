use std::cmp::Ordering;
use std::iter::Peekable;
use std::str::Chars;

/// ファイル名の自然順比較。数字の連なりは数値として比較するため
/// `img2.png` が `img10.png` より前に来る。数字以外は大文字小文字を無視する。
pub fn natural_cmp(a: &str, b: &str) -> Ordering {
    let mut left = a.chars().peekable();
    let mut right = b.chars().peekable();

    loop {
        match (left.peek().copied(), right.peek().copied()) {
            (None, None) => return Ordering::Equal,
            (None, Some(_)) => return Ordering::Less,
            (Some(_), None) => return Ordering::Greater,
            (Some(ca), Some(cb)) => {
                if ca.is_ascii_digit() && cb.is_ascii_digit() {
                    match take_number(&mut left).cmp(&take_number(&mut right)) {
                        Ordering::Equal => continue,
                        other => return other,
                    }
                }

                left.next();
                right.next();

                let la = ca.to_lowercase().next().unwrap_or(ca);
                let lb = cb.to_lowercase().next().unwrap_or(cb);
                match la.cmp(&lb) {
                    Ordering::Equal => continue,
                    other => return other,
                }
            }
        }
    }
}

/// 先頭に並ぶ数字列を数値として取り出す。桁溢れは飽和させる。
fn take_number(it: &mut Peekable<Chars<'_>>) -> u128 {
    let mut value: u128 = 0;
    while let Some(c) = it.peek().copied() {
        if !c.is_ascii_digit() {
            break;
        }
        it.next();
        value = value.saturating_mul(10).saturating_add(u128::from(c as u8 - b'0'));
    }
    value
}

#[cfg(test)]
mod tests {
    use super::natural_cmp;
    use std::cmp::Ordering;

    #[test]
    fn numbers_compare_numerically() {
        assert_eq!(natural_cmp("img2.png", "img10.png"), Ordering::Less);
        assert_eq!(natural_cmp("2.png", "10.png"), Ordering::Less);
        assert_eq!(natural_cmp("a01b", "a1c"), Ordering::Less);
    }

    #[test]
    fn text_compares_case_insensitively() {
        assert_eq!(natural_cmp("Alpha.png", "alpha.png"), Ordering::Equal);
        assert_eq!(natural_cmp("Beta.png", "alpha.png"), Ordering::Greater);
    }
}
