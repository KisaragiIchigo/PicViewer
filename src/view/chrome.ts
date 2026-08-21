/**
 * クロームの寸法。バーの高さと、画像が隠れないための余白は同じ値から引くこと。
 * ここを一箇所変えれば、バー・オーバーレイ・画像の収まりがまとめて追従する。
 */
export const CHROME = {
  /** 上部バーの高さ。 */
  topBar: 30,
  /** 下部バーの高さ。 */
  bottomBar: 30,
  /** フィルムストリップの高さ（開いているときだけ足す）。 */
  filmstrip: 70,
  /** 浮かせる要素をバーから離す距離。 */
  gap: 8,
} as const;

/**
 * 画像を収める領域の上下の余白。
 *
 * バーは自動で出入りするが、この値は出入りに関わらず一定にしている。
 * 表示のたびに画像が伸び縮みする方が、少し小さく表示されるよりずっと目障りなため。
 */
export function stageInsets(filmstripOpen: boolean): { top: number; bottom: number } {
  return {
    top: CHROME.topBar,
    bottom: CHROME.bottomBar + (filmstripOpen ? CHROME.filmstrip : 0),
  };
}
