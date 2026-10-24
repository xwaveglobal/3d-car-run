// 3D Car Run — brand assets (v1.0.0).
//   node scripts/brand/make-brand.mjs [refDir]
// Draws the Western logo as SVG (wood plank, rope, steel "3D", gold "CAR RUN", hat, horns, star) and
// rasterises it with sharp (librsvg). Needs the Rye + Alfa Slab One fonts installed for fontconfig
// (src/assets/fonts has the OFL webfonts; the TTFs come from github.com/google/fonts).
// With refDir (the owner's reference art), it also makes the app icons and the loading art.
import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const req = createRequire(import.meta.url);
let sharp;
for (const p of ['sharp', '/home/claude/.npm-global/lib/node_modules/sharp', '/opt/npm-tools/node_modules/sharp']) {
  try {
    sharp = req(p);
    break;
  } catch {}
}
if (!sharp) throw new Error('sharp not found');

// ------------------------------------------------------------------ logo
function rope(x, y, w, h, r) {
  // twisted rope: a thick tan stroke + a dashed dark stroke on top (the twist)
  const d = `M${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h} H${x + r} Q${x},${y + h} ${x},${y + h - r} V${y + r} Q${x},${y} ${x + r},${y} Z`;
  return `<path d="${d}" fill="none" stroke="#3a2210" stroke-width="22"/>
  <path d="${d}" fill="none" stroke="url(#ropeG)" stroke-width="16"/>
  <path d="${d}" fill="none" stroke="#6b4420" stroke-width="16" stroke-dasharray="7 9" stroke-opacity=".55"/>`;
}
function plank(x, y, w, h, id) {
  // wood board with grain lines and bronze rivets
  let grain = '';
  for (let i = 0; i < 7; i++) {
    const yy = y + 10 + (i * (h - 20)) / 6;
    grain += `<path d="M${x + 8},${yy} C${x + w * 0.3},${yy - 5} ${x + w * 0.6},${yy + 6} ${x + w - 8},${yy - 2}" stroke="#2a160a" stroke-opacity=".35" stroke-width="2.5" fill="none"/>`;
  }
  const rivets = [
    [x + 22, y + 22],
    [x + w - 22, y + 22],
    [x + 22, y + h - 22],
    [x + w - 22, y + h - 22],
  ]
    .map(([cx, cy]) => `<circle cx="${cx}" cy="${cy}" r="10" fill="url(#bronzeR)" stroke="#2a160a" stroke-width="3"/><circle cx="${cx - 3}" cy="${cy - 3}" r="3" fill="#ffe7b0"/>`)
    .join('');
  return `<g id="${id}">
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="url(#woodG)" stroke="#24140a" stroke-width="8"/>
  <rect x="${x + 8}" y="${y + 8}" width="${w - 16}" height="${h - 16}" rx="9" fill="none" stroke="#c48a4a" stroke-opacity=".35" stroke-width="3"/>
  ${grain}${rivets}</g>`;
}
function star(cx, cy, r, fill = 'url(#starG)') {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.42 : r;
    pts.push(`${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`);
  }
  return `<polygon points="${pts.join(' ')}" fill="${fill}" stroke="#3a2210" stroke-width="5" stroke-linejoin="round"/>`;
}
function logoSvg() {
  const W = 1000;
  const H = 760;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
  <linearGradient id="woodG" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#8a5a30"/><stop offset=".45" stop-color="#6b4322"/><stop offset="1" stop-color="#4a2c14"/>
  </linearGradient>
  <linearGradient id="ropeG" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#e2b874"/><stop offset=".5" stop-color="#c8955a"/><stop offset="1" stop-color="#a87640"/>
  </linearGradient>
  <radialGradient id="bronzeR" cx=".35" cy=".35" r=".8">
    <stop offset="0" stop-color="#ffe0a0"/><stop offset=".5" stop-color="#c88a3a"/><stop offset="1" stop-color="#6a4018"/>
  </radialGradient>
  <linearGradient id="steelG" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#ffffff"/><stop offset=".35" stop-color="#d8d4cc"/><stop offset=".55" stop-color="#9c968c"/><stop offset=".7" stop-color="#e8e4dc"/><stop offset="1" stop-color="#8a847a"/>
  </linearGradient>
  <linearGradient id="goldG" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#fff2b0"/><stop offset=".3" stop-color="#ffc848"/><stop offset=".62" stop-color="#e8861a"/><stop offset="1" stop-color="#a84a10"/>
  </linearGradient>
  <linearGradient id="starG" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#fff0c0"/><stop offset=".5" stop-color="#d8b070"/><stop offset="1" stop-color="#8a6230"/>
  </linearGradient>
  <linearGradient id="hatG" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#8a5a32"/><stop offset="1" stop-color="#4a2c16"/>
  </linearGradient>
  <linearGradient id="hornG" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#3a2a1c"/><stop offset=".5" stop-color="#cdb898"/><stop offset="1" stop-color="#f4ead8"/>
  </linearGradient>
  <filter id="drop" x="-10%" y="-10%" width="120%" height="130%">
    <feDropShadow dx="0" dy="10" stdDeviation="9" flood-color="#000" flood-opacity=".55"/>
  </filter>
</defs>
<g filter="url(#drop)">
  <!-- bull horns behind the sign -->
  <path d="M280,262 C170,252 85,196 40,92 C112,168 196,186 290,188 Z" fill="url(#hornG)" stroke="#2a1a0e" stroke-width="7" transform="translate(0,20)"/>
  <path d="M720,262 C830,252 915,196 960,92 C888,168 804,186 710,188 Z" fill="url(#hornG)" stroke="#2a1a0e" stroke-width="7" transform="translate(0,20)"/>
  <!-- top board: 3D -->
  ${plank(250, 150, 500, 250, 'b1')}
  ${rope(238, 138, 524, 274, 22)}
  <!-- cowboy hat on the top board -->
  <g transform="translate(500,92)">
    <ellipse cx="0" cy="44" rx="190" ry="34" fill="url(#hatG)" stroke="#24140a" stroke-width="7"/>
    <path d="M-110,40 C-112,-20 -80,-62 -40,-58 C-18,-56 -10,-40 0,-40 C10,-40 18,-56 40,-58 C80,-62 112,-20 110,40 Z" fill="url(#hatG)" stroke="#24140a" stroke-width="7"/>
    <path d="M-108,22 C-40,34 40,34 108,22 L110,40 C40,52 -40,52 -110,40 Z" fill="#2a1a10"/>
    ${star(0, 2, 22)}
  </g>
  <!-- 3D: brushed steel with a dark outline and a bevel -->
  <text x="500" y="358" text-anchor="middle" font-family="Rye" font-size="208" letter-spacing="6"
    fill="#1a0e06" stroke="#1a0e06" stroke-width="26" stroke-linejoin="round">3D</text>
  <text x="500" y="352" text-anchor="middle" font-family="Rye" font-size="208" letter-spacing="6"
    fill="url(#steelG)" stroke="#5a4a3a" stroke-width="4">3D</text>
  ${star(500, 260, 30)}
  <!-- bottom board: CAR RUN -->
  ${plank(110, 400, 780, 200, 'b2')}
  <text x="500" y="552" text-anchor="middle" font-family="Rye" font-size="138" letter-spacing="4"
    fill="#1a0e06" stroke="#1a0e06" stroke-width="24" stroke-linejoin="round">CAR RUN</text>
  <text x="500" y="546" text-anchor="middle" font-family="Rye" font-size="138" letter-spacing="4"
    fill="url(#goldG)" stroke="#6a2a08" stroke-width="3">CAR RUN</text>
  <!-- sheriff star badge under the sign -->
  <path d="M380,640 C440,610 560,610 620,640 L600,680 C540,660 460,660 400,680 Z" fill="url(#hatG)" stroke="#24140a" stroke-width="6"/>
  <circle cx="500" cy="640" r="58" fill="#3a2210"/>
  ${star(500, 640, 54)}
</g>
</svg>`;
}

const imgDir = join(root, 'src/assets/images');
const svg = logoSvg();
writeFileSync(join(root, 'assets-src/brand-logo.svg'), svg);
await sharp(Buffer.from(svg), { density: 144 }).resize(900).webp({ quality: 90, alphaQuality: 100 }).toFile(join(imgDir, 'car-run-logo.webp'));
console.log('logo → src/assets/images/car-run-logo.webp');

// ------------------------------------------------------------------ icons + loading art from the owner's reference art
const ref = process.argv[2];
if (ref && existsSync(join(ref, 'icon.webp'))) {
  const icon = join(ref, 'icon.webp');
  // the reference icon is a rounded square on white: cut a circle-safe square from its centre
  const meta = await sharp(icon).metadata();
  const s = Math.round(Math.min(meta.width, meta.height) * 0.94);
  const off = Math.round((Math.min(meta.width, meta.height) - s) / 2);
  const sq = await sharp(icon).extract({ left: off, top: off, width: s, height: s }).toBuffer();
  const pub = join(root, 'public/icons');
  mkdirSync(pub, { recursive: true });
  for (const [f, px] of [['favicon-32.png', 32], ['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512], ['icon-1024.png', 1024], ['icon-maskable-512.png', 512]]) await sharp(sq).resize(px, px).png({ compressionLevel: 9, palette: true, quality: 92, effort: 10 }).toFile(join(pub, f));
  await sharp(sq).resize(512, 512).webp({ quality: 88 }).toFile(join(imgDir, 'app-icon.webp'));
  console.log('icons → public/icons, src/assets/images/app-icon.webp');
}
if (ref && existsSync(join(ref, 'home.webp'))) {
  // loading art: the reference home screen without its baked-in UI (top bar and bottom buttons cut)
  const home = join(ref, 'home.webp');
  const m = await sharp(home).metadata();
  const top = Math.round(m.height * 0.1);
  const h = Math.round(m.height * 0.6);
  await sharp(home).extract({ left: 0, top, width: m.width, height: h }).resize(720).webp({ quality: 82 }).toFile(join(imgDir, 'loading.webp'));
  console.log('loading → src/assets/images/loading.webp');
}
