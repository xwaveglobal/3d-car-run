// 3D Car Run — UI material textures (wood plank, dark wood, leather, parchment) as small tileable webp.
//   node scripts/brand/make-textures.mjs
// SVG feTurbulence (stitchTiles) rasterised by sharp/librsvg → src/assets/images/ui/*.webp
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const req = createRequire(import.meta.url);
let sharp;
for (const p of ['sharp', '/home/claude/.npm-global/lib/node_modules/sharp', '/opt/npm-tools/node_modules/sharp']) {
  try { sharp = req(p); break; } catch {}
}
const out = join(root, 'src/assets/images/ui');
mkdirSync(out, { recursive: true });

const wood = (w, h, base, dark, light, seed) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <filter id="g" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.004 0.09" numOctaves="4" seed="${seed}" stitchTiles="stitch"/>
    <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1.6 0 0 0 -0.45"/>
  </filter>
  <filter id="f" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.02 0.4" numOctaves="2" seed="${seed + 7}" stitchTiles="stitch"/>
    <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 0.85  0 0 0 0 0.6  0.9 0 0 0 -0.55"/>
  </filter>
  <rect width="100%" height="100%" fill="${base}"/>
  <rect width="100%" height="100%" fill="${dark}" filter="url(#g)"/>
  <rect width="100%" height="100%" fill="${light}" filter="url(#f)" opacity=".35"/>
</svg>`;
const leather = (w, h, base, seed) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <filter id="l" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.22" numOctaves="3" seed="${seed}" stitchTiles="stitch"/>
    <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1.4 0 0 0 -0.5"/>
  </filter>
  <filter id="m" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="${seed + 3}" stitchTiles="stitch"/>
    <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 0.8  0 0 0 0 0.6  1.2 0 0 0 -0.6"/>
  </filter>
  <rect width="100%" height="100%" fill="${base}"/>
  <rect width="100%" height="100%" fill="#1a0a04" filter="url(#l)"/>
  <rect width="100%" height="100%" fill="#fff" filter="url(#m)" opacity=".25"/>
</svg>`;
const parchment = (w, h, seed) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <filter id="p" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="4" seed="${seed}" stitchTiles="stitch"/>
    <feColorMatrix type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.3  0 0 0 0 0.15  1.2 0 0 0 -0.5"/>
  </filter>
  <rect width="100%" height="100%" fill="#ead2a2"/>
  <rect width="100%" height="100%" filter="url(#p)" opacity=".55"/>
</svg>`;

const jobs = [
  ['wood.webp', wood(512, 256, '#7a4c26', '#3a200c', '#ffdca0', 3)],
  ['wood-dark.webp', wood(512, 256, '#4a2c16', '#1e1006', '#c89060', 11)],
  ['wood-light.webp', wood(512, 256, '#a8743e', '#5a3818', '#fff0c8', 5)],
  ['leather.webp', leather(256, 256, '#5a3220', 9)],
  ['parchment.webp', parchment(256, 256, 21)],
];
for (const [f, svg] of jobs) {
  await sharp(Buffer.from(svg)).webp({ quality: 78 }).toFile(join(out, f));
  console.log(f);
}
