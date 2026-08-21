/**
 * 画像がバーに隠れないことを数値で確かめる回帰チェック。
 * 実行: npm run check:layout
 *
 * 見た目の確認は目視に頼らざるを得ないが、「上下がバーへ食い込まない」という
 * 一番効いてほしい性質だけは計算で固定しておく。
 */
import { CHROME, stageInsets } from "../src/view/chrome";
import { clampOffset, fitZoom, zoomAround } from "../src/view/Stage/geometry";

const WINDOW = { width: 1196, height: 769 };

let failed = 0;

function check(label: string, ok: boolean, detail: string): void {
  console.log(`${ok ? "OK  " : "NG  "} ${label}  —  ${detail}`);
  if (!ok) failed += 1;
}

const bare = stageInsets(false);
const safe = { width: WINDOW.width, height: WINDOW.height - bare.top - bare.bottom };

console.log(
  `ウィンドウ ${WINDOW.width}x${WINDOW.height} / 余白 上${bare.top} 下${bare.bottom}` +
    ` → 安全領域 ${safe.width}x${safe.height}\n`,
);

for (const image of [
  { width: 1400, height: 900 },
  { width: 900, height: 1400 },
  { width: 4000, height: 2000 },
  { width: 1196, height: 769 },
]) {
  const drawn = image.height * fitZoom(image, safe);
  const top = bare.top + (safe.height - drawn) / 2;
  const bottom = top + drawn;

  check(
    `${image.width}x${image.height} がバーに掛からない`,
    top >= CHROME.topBar - 0.5 && bottom <= WINDOW.height - CHROME.bottomBar + 0.5,
    `画像 y=${top.toFixed(1)}〜${bottom.toFixed(1)}` +
      ` / バー内側 y=${CHROME.topBar}〜${WINDOW.height - CHROME.bottomBar}`,
  );
}

const strip = stageInsets(true);
const safeWithStrip = {
  width: WINDOW.width,
  height: WINDOW.height - strip.top - strip.bottom,
};
const sample = { width: 1400, height: 900 };
const drawnWithStrip = sample.height * fitZoom(sample, safeWithStrip);
const bottomWithStrip =
  strip.top + (safeWithStrip.height - drawnWithStrip) / 2 + drawnWithStrip;

check(
  "フィルムストリップを開いても掛からない",
  bottomWithStrip <= WINDOW.height - strip.bottom + 0.5,
  `画像の下端 y=${bottomWithStrip.toFixed(1)} / ストリップ上端 y=${WINDOW.height - strip.bottom}`,
);

check(
  "小さい画像は引き伸ばさない",
  fitZoom({ width: 32, height: 32 }, safe) === 1,
  "32x32 → 100%",
);

const limit = (sample.height * 2 - safe.height) / 2;
check(
  "拡大時の平行移動が安全領域を基準に止まる",
  Math.abs(clampOffset({ x: 0, y: 9999 }, 2, sample, safe).y - limit) < 0.001,
  `上限 ${limit.toFixed(1)}px`,
);

const shifted = zoomAround({ x: 100, y: 0 }, 1, { x: 0, y: 0 }, 2);
check(
  "カーソル位置を固定したまま拡大する",
  100 * 2 + shifted.x === 100,
  `offset.x=${shifted.x}`,
);

console.log(failed === 0 ? "\nすべて通過しました。" : `\n${failed} 件が失敗しました。`);
process.exit(failed === 0 ? 0 : 1);
