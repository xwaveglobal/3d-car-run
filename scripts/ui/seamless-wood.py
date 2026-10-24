# v1.0.7: makes the UI wood textures tile without a visible seam (panels repeat them every 200–320 px).
# Each texture = the middle half of the planks + its mirror image (left/right and top/bottom), so a tile's edges
# always continue the next tile. Originals kept in assets-src/ui-wood/.
import os, numpy as np
from PIL import Image
ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
SRC = os.path.join(ROOT, 'src', 'assets', 'images', 'ui')
KEEP = os.path.join(ROOT, 'assets-src', 'ui-wood'); os.makedirs(KEEP, exist_ok=True)
for name in ('wood', 'wood-dark', 'wood-light'):
    p = os.path.join(SRC, f'{name}.webp')
    orig = os.path.join(KEEP, f'{name}-orig.webp')
    if not os.path.exists(orig):
        Image.open(p).save(orig, 'WEBP', quality=95)
    a = np.array(Image.open(orig).convert('RGB')).astype(np.float32)
    h, w = a.shape[:2]
    # mirror tiling: the middle half of the planks + its mirror image, both ways → the tile edges always match
    c = a[h // 4: h // 4 + h // 2, w // 4: w // 4 + w // 2]
    row = np.concatenate([c, c[:, ::-1]], 1)
    out = np.concatenate([row, row[::-1]], 0)
    Image.fromarray(out.clip(0, 255).astype(np.uint8)).save(p, 'WEBP', quality=86, method=6)
    print('seamless', name, w, h)
