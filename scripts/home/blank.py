# v1.0.2 Home sprites from assets-src/reference/ui-kit-sheet.webp (cut per component, see docs/carrun-v1/HOME-V2.md).
# Run inside a folder holding sprite-<name>.png crops: dedot.py removes the baked red dots, blank.py blanks text.
import numpy as np, cv2
from PIL import Image
def tile_fill(a, x0, x1, y0, y1, sx0, sx1, feather=6):
    """fill columns x0..x1 (rows y0..y1) with the clean strip sx0..sx1 tiled back and forth (mirror), feathered"""
    strip = a[y0:y1, sx0:sx1].astype(float)
    sw = sx1 - sx0
    w = x1 - x0
    cols = []
    for i in range(w):
        k = i % (2 * sw)
        cols.append(strip[:, k if k < sw else 2 * sw - 1 - k])
    fill = np.stack(cols, axis=1)
    reg = a[y0:y1, x0:x1].astype(float)
    hh, ww = reg.shape[:2]
    yy, xx = np.mgrid[0:hh, 0:ww]
    wgt = np.clip(np.minimum.reduce([xx / feather, (ww - 1 - xx) / feather, yy / feather, (hh - 1 - yy) / feather]), 0, 1)[..., None]
    out = reg * (1 - wgt) + fill * wgt
    out[..., 3] = reg[..., 3]
    a[y0:y1, x0:x1] = out.clip(0, 255).astype(np.uint8)

def inpaint(a, box, r=6):
    x0, y0, x1, y1 = box
    m = np.zeros(a.shape[:2], np.uint8); m[y0:y1, x0:x1] = 1
    a[..., :3] = cv2.inpaint(np.ascontiguousarray(a[..., :3]), m, r, cv2.INPAINT_TELEA)

# profile bar: blank name / class / EXP line, and the rank badge text
p = np.array(Image.open('sprite-profile.png'))
tile_fill(p, 214, 570, 34, 166, 568, 597, 8)
q = p.copy()
# rank badge (#59): keep the yellow plate, remove the digits
inpaint(p, (68, 148, 150, 186), 9)
Image.fromarray(p).save('blank-profile.png')
# currency bar: blank the number
c = np.array(Image.open('sprite-currency.png'))
tile_fill(c, 120, 292, 28, 104, 266, 292)
Image.fromarray(c).save('blank-currency.png')
# blank signpost (from the ENTRY sign) for Launch / Share / Daily: icon + label are drawn by the page
e = np.array(Image.open('clean-entry.png'))
tile_fill(e, 60, 250, 46, 140, 212, 248, 5)
tile_fill(e, 66, 244, 132, 182, 66, 102, 5)
tile_fill(e, 52, 248, 174, 240, 230, 244, 5)
Image.fromarray(e).save('blank-sign.png')
