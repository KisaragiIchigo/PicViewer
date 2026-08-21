"""PicView のアプリアイコンを project_style.json の配色で描き起こす。

モチーフは「重なったフレームの一番手前が点灯している」状態＝フォルダ内を
めくって見るビューア。汎用の「画像プレースホルダー（山と太陽）」は使わない。
"""

import sys

from PIL import Image, ImageDraw, ImageFilter

S = 1024
SS = 4
W = S * SS

BASE_TOP = (14, 20, 32)
BASE_BOTTOM = (4, 6, 11)
TEAL = (45, 212, 191)
EMERALD = (16, 185, 129)


def lerp(a, b, t):
    return tuple(round(x + (y - x) * t) for x, y in zip(a, b))


def gradient_base():
    img = Image.new("RGBA", (W, W))
    draw = ImageDraw.Draw(img)
    for y in range(W):
        draw.line([(0, y), (W, y)], fill=lerp(BASE_TOP, BASE_BOTTOM, y / W) + (255,))
    return img


def ambient_glow():
    """左下から差し込むティールの淡い発光。"""
    layer = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    ImageDraw.Draw(layer).ellipse(
        (-W * 0.10, W * 0.50, W * 0.78, W * 1.24), fill=TEAL + (86,)
    )
    return layer.filter(ImageFilter.GaussianBlur(W * 0.12))


def stack_boxes():
    """手前の1枚と、その奥へ後退していく2枚。写真らしく 3:2 の横位置で組む。"""
    width = W * 0.560
    height = width * 2 / 3
    left, top = W * 0.155, W * 0.390
    shift = W * 0.075

    def box(step):
        x, y = left + shift * step, top - shift * step
        return (x, y, x + width, y + height)

    return [box(2), box(1), box(0)]


def lit_panel(box, radius):
    """手前フレームの内側。奥のフレームを隠す不透明な地に、点灯を示すグラデを重ねる。"""
    x0, y0, x1, y1 = box
    w, h = int(x1 - x0), int(y1 - y0)

    wash = Image.new("RGBA", (w, h))
    draw = ImageDraw.Draw(wash)
    for y in range(h):
        t = y / h
        # 下へ行くほどティール寄りに点灯する暗い面。奥のフレームは透けない。
        tint = lerp(lerp(BASE_BOTTOM, TEAL, 0.06), lerp(BASE_BOTTOM, TEAL, 0.30), t)
        draw.line([(0, y), (w, y)], fill=tint + (255,))

    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, w - 1, h - 1), radius=radius, fill=255)
    wash.putalpha(mask)

    panel = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    panel.paste(wash, (int(x0), int(y0)), wash)
    return panel


def glyph():
    layer = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)

    radius = int(W * 0.042)
    back, mid, front = stack_boxes()

    d.rounded_rectangle(back, radius=radius, outline=TEAL + (64,), width=int(W * 0.0105))
    d.rounded_rectangle(mid, radius=radius, outline=TEAL + (128,), width=int(W * 0.0125))

    layer = Image.alpha_composite(layer, lit_panel(front, radius))

    d = ImageDraw.Draw(layer)
    d.rounded_rectangle(front, radius=radius, outline=TEAL + (255,), width=int(W * 0.0165))
    return layer


def rounded_mask():
    mask = Image.new("L", (W, W), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, W - 1, W - 1), radius=int(W * 0.185), fill=255
    )
    return mask


def build():
    canvas = Image.alpha_composite(gradient_base(), ambient_glow())

    marks = glyph()
    bloom = marks.filter(ImageFilter.GaussianBlur(W * 0.022))
    bloom.putalpha(bloom.getchannel("A").point(lambda v: int(v * 0.6)))

    canvas = Image.alpha_composite(canvas, bloom)
    canvas = Image.alpha_composite(canvas, marks)
    canvas.putalpha(rounded_mask())

    return canvas.resize((S, S), Image.LANCZOS)


if __name__ == "__main__":
    build().save(sys.argv[1])
    print(f"wrote {sys.argv[1]}")
