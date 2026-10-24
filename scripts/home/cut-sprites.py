# v1.0.2: cut the Home / UI-kit sprites out of the owner's transparent sheet
# (assets-src/reference/ui-kit-sheet.webp). Each component of the alpha mask becomes sprite-<name>.png
# in the current folder; then run dedot.py (removes the baked red dots) and blank.py (blank profile /
# coin bar / signpost), and export the results to src/assets/images/home/ and src/assets/images/kit/.
#   cd /tmp/x && python3 <repo>/scripts/home/cut-sprites.py && python3 <repo>/scripts/home/dedot.py && python3 <repo>/scripts/home/blank.py
import os
import cv2
import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
im = np.array(Image.open(os.path.join(ROOT, 'assets-src', 'reference', 'ui-kit-sheet.webp')).convert('RGBA'))
n, lab, st, _ = cv2.connectedComponentsWithStats((im[..., 3] > 40).astype(np.uint8), 8)
# components sorted as on the sheet (found by area > 800 px, in label order)
NAMES = ['profile', 'logo', 'menu', 'gear', 'currency', 'play', 'garage', 'shop', 'missions', 'entry', 'bonus',
         'i-shield', 'i-coin', 'i-key', 'i-emerald', 'i-magnet', 'i-gem', 'i-heart',
         'a-bolt', 'a-fire', 'a-star', 'a-crown', 'a-wings', 'a-planet', 'a-dice']
big = [i for i in range(1, n) if st[i][4] > 800]
for name, i in zip(NAMES, big):
    m = cv2.dilate((lab == i).astype(np.uint8), np.ones((7, 7), np.uint8))
    x, y, w, h = st[i][:4]
    p = 4
    x0, y0, x1, y1 = max(0, x - p), max(0, y - p), min(im.shape[1], x + w + p), min(im.shape[0], y + h + p)
    c = im[y0:y1, x0:x1].copy()
    c[..., 3] = (c[..., 3] * m[y0:y1, x0:x1]).astype(np.uint8)
    Image.fromarray(c).save(f'sprite-{name}.png')
print(len(big), 'sprites')
