import * as THREE from 'three';

/**
 * 3D Car Run v1.0.0 — ONE canvas texture atlas for every Western prop and obstacle.
 *
 * Props are baked into single geometries with vertex colours (see kit.ts); faces that need a picture
 * (shop signs, Route 66 shields, planks, bricks, warning signs…) carry uvs into a rect of this atlas,
 * every other face samples the plain white corner — so the whole roadside and every obstacle share
 * ONE material / shader program and draw as one instanced mesh per prop type.
 *
 * Layout: 1024 × 1024, rects in pixels [x, y, w, h]. Drawn once, procedurally (no image files).
 */
export type AtlasKey =
  | 'white'
  | 'planks'
  | 'planksDark'
  | 'brick'
  | 'stone'
  | 'corrugated'
  | 'saloon'
  | 'hotel'
  | 'bank'
  | 'sheriff'
  | 'store'
  | 'route66'
  | 'billboard'
  | 'gas'
  | 'motel'
  | 'goldmine'
  | 'rockfall'
  | 'crossbuck'
  | 'stripes'
  | 'chevron'
  | 'tnt'
  | 'petro'
  | 'hay'
  | 'barrelTop'
  | 'roadclosed'
  | 'wanted'
  | 'cargo'
  | 'gold'
  | 'window'
  | 'windowLit'
  | 'water';

export const ATLAS_SIZE = 1024;
export const RECT: Record<AtlasKey, [number, number, number, number]> = {
  white: [0, 0, 32, 32],
  planks: [32, 0, 224, 128],
  planksDark: [256, 0, 224, 128],
  brick: [480, 0, 160, 128],
  stone: [640, 0, 160, 128],
  corrugated: [800, 0, 224, 128],
  saloon: [0, 128, 256, 96],
  hotel: [256, 128, 256, 96],
  bank: [512, 128, 256, 96],
  sheriff: [768, 128, 256, 96],
  store: [0, 224, 512, 96],
  route66: [512, 224, 160, 160],
  billboard: [672, 224, 352, 176],
  gas: [0, 320, 256, 96],
  motel: [256, 320, 256, 96],
  goldmine: [0, 416, 320, 96],
  rockfall: [320, 416, 160, 160],
  crossbuck: [480, 400, 192, 192],
  stripes: [672, 400, 352, 64],
  chevron: [672, 464, 352, 112],
  tnt: [0, 512, 160, 160],
  petro: [160, 576, 256, 96],
  hay: [416, 592, 160, 128],
  barrelTop: [576, 592, 128, 128],
  roadclosed: [704, 576, 320, 96],
  wanted: [0, 672, 160, 208],
  cargo: [160, 672, 256, 128],
  gold: [416, 720, 160, 128],
  window: [576, 720, 96, 96],
  windowLit: [672, 720, 96, 96],
  water: [768, 672, 256, 128],
};

let tex: THREE.CanvasTexture | null = null;

/** uv rect (0..1, flipY handled) of an atlas key, inset half a texel against bleeding */
export function uvRect(k: AtlasKey): [number, number, number, number] {
  const [x, y, w, h] = RECT[k];
  const e = 1.5;
  const u0 = (x + e) / ATLAS_SIZE;
  const u1 = (x + w - e) / ATLAS_SIZE;
  // canvas y grows down, texture v grows up (flipY = true)
  const v1 = 1 - (y + e) / ATLAS_SIZE;
  const v0 = 1 - (y + h - e) / ATLAS_SIZE;
  return [u0, v0, u1, v1];
}

export function atlasTexture(): THREE.CanvasTexture {
  if (tex) return tex;
  const c = document.createElement('canvas');
  c.width = c.height = ATLAS_SIZE;
  const g = c.getContext('2d')!;
  draw(g);
  tex = new THREE.CanvasTexture(c);
  // the sign lettering uses the bundled Western fonts: redraw once they are loaded
  const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
  if (fonts?.load) {
    const t = tex;
    void Promise.all([fonts.load('40px "Rye"'), fonts.load('40px "Alfa Slab One"')])
      .then(() => {
        draw(g);
        t.needsUpdate = true;
      })
      .catch(() => {});
  }
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}

let mat: THREE.MeshStandardMaterial | null = null;
/** the shared prop material (vertex colours × atlas, flat-shaded, matte) */
export function propMaterial(): THREE.MeshStandardMaterial {
  if (!mat) mat = new THREE.MeshStandardMaterial({ map: atlasTexture(), vertexColors: true, roughness: 0.86, metalness: 0.04, flatShading: true });
  return mat;
}
let lit: THREE.MeshBasicMaterial | null = null;
/** unlit variant for lamps / lit windows / flames (vertex colours, no tone mapping) */
export function glowMaterial(): THREE.MeshBasicMaterial {
  if (!lit) lit = new THREE.MeshBasicMaterial({ map: atlasTexture(), vertexColors: true, toneMapped: false });
  return lit;
}

// ------------------------------------------------------------------ drawing
const SERIF = '"Rye", "Alfa Slab One", Georgia, serif';
const SLAB = '"Alfa Slab One", Rockwell, Georgia, serif';
function rnd(seed: number) {
  let a = seed * 9301 + 49297;
  return () => ((a = (a * 16807) % 2147483647) / 2147483647);
}
function rect(_g: CanvasRenderingContext2D, k: AtlasKey) {
  return RECT[k];
}
function planks(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, base: string, dark: string, seed: number, rows = 4) {
  const r = rnd(seed);
  g.fillStyle = base;
  g.fillRect(x, y, w, h);
  const ph = h / rows;
  for (let i = 0; i < rows; i++) {
    const yy = y + i * ph;
    g.fillStyle = `rgba(0,0,0,${0.05 + r() * 0.12})`;
    g.fillRect(x, yy, w, ph);
    // grain
    g.strokeStyle = 'rgba(40,20,8,.35)';
    g.lineWidth = 1;
    for (let k = 0; k < 6; k++) {
      g.beginPath();
      const gy = yy + 3 + r() * (ph - 6);
      g.moveTo(x, gy);
      for (let xx = 0; xx <= w; xx += 16) g.lineTo(x + xx, gy + Math.sin(xx * 0.05 + k) * 1.5);
      g.stroke();
    }
    g.fillStyle = dark;
    g.fillRect(x, yy + ph - 2, w, 2);
    // nails
    g.fillStyle = 'rgba(30,20,10,.7)';
    g.fillRect(x + 6, yy + ph / 2 - 1, 3, 3);
    g.fillRect(x + w - 9, yy + ph / 2 - 1, 3, 3);
  }
}
function signBoard(g: CanvasRenderingContext2D, k: AtlasKey, text: string, bg: string, fg: string, font: string, edge = '#2a1608', sizeK = 0.62) {
  const [x, y, w, h] = rect(g, k);
  planks(g, x, y, w, h, bg, 'rgba(0,0,0,.35)', x + y, 3);
  g.strokeStyle = edge;
  g.lineWidth = 6;
  g.strokeRect(x + 3, y + 3, w - 6, h - 6);
  g.fillStyle = fg;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  let s = Math.floor(h * sizeK);
  g.font = `${s}px ${font}`;
  while (g.measureText(text).width > w - 24 && s > 10) g.font = `${--s}px ${font}`;
  g.lineWidth = Math.max(2, s * 0.08);
  g.strokeStyle = 'rgba(30,14,4,.9)';
  g.strokeText(text, x + w / 2, y + h / 2 + 2);
  g.fillText(text, x + w / 2, y + h / 2 + 2);
}

function draw(g: CanvasRenderingContext2D) {
  // clear to a neutral mid grey so any bleeding is unobtrusive
  g.fillStyle = '#9a8a78';
  g.fillRect(0, 0, ATLAS_SIZE, ATLAS_SIZE);
  // white: the plain vertex-colour corner
  g.fillStyle = '#ffffff';
  g.fillRect(...RECT.white);

  {
    const [x, y, w, h] = RECT.planks;
    planks(g, x, y, w, h, '#d8c0a0', 'rgba(60,30,10,.4)', 3, 5);
  }
  {
    const [x, y, w, h] = RECT.planksDark;
    planks(g, x, y, w, h, '#8a6a4a', 'rgba(20,10,4,.5)', 7, 5);
  }
  {
    // brick (light, multiplied by the vertex colour)
    const [x, y, w, h] = RECT.brick;
    g.fillStyle = '#e8d8c8';
    g.fillRect(x, y, w, h);
    g.fillStyle = '#c8a890';
    const bh = 16;
    for (let row = 0; row * bh < h; row++)
      for (let col = -1; col * 32 < w; col++) {
        const bx = x + col * 32 + (row % 2 ? 16 : 0);
        g.fillRect(Math.max(x, bx + 2), y + row * bh + 2, Math.min(28, x + w - bx - 2), bh - 3);
      }
  }
  {
    // stone blocks
    const [x, y, w, h] = RECT.stone;
    const r = rnd(41);
    g.fillStyle = '#b8a890';
    g.fillRect(x, y, w, h);
    for (let row = 0; row < 4; row++)
      for (let col = 0; col < 4; col++) {
        const bx = x + col * 40 + (row % 2 ? 20 : 0) - 10;
        g.fillStyle = `hsl(32, 18%, ${62 + r() * 18}%)`;
        g.fillRect(Math.max(x, bx + 2), y + row * 32 + 2, 36, 28);
      }
  }
  {
    // corrugated metal
    const [x, y, w, h] = RECT.corrugated;
    for (let i = 0; i < w; i += 8) {
      const grd = g.createLinearGradient(x + i, 0, x + i + 8, 0);
      grd.addColorStop(0, '#9a9a96');
      grd.addColorStop(0.5, '#e8e8e0');
      grd.addColorStop(1, '#8a8a86');
      g.fillStyle = grd;
      g.fillRect(x + i, y, 8, h);
    }
    const r = rnd(5);
    for (let i = 0; i < 30; i++) {
      g.fillStyle = `rgba(150,70,20,${0.15 + r() * 0.3})`;
      g.beginPath();
      g.arc(x + r() * w, y + r() * h, 4 + r() * 12, 0, Math.PI * 2);
      g.fill();
    }
  }
  signBoard(g, 'saloon', 'SALOON', '#7a4a22', '#ffe7a8', SERIF);
  signBoard(g, 'hotel', 'HOTEL', '#5a3a2a', '#fff1d0', SERIF);
  signBoard(g, 'bank', 'BANK', '#3a4a3a', '#ffd77a', SERIF);
  signBoard(g, 'sheriff', 'SHERIFF', '#6a3a1a', '#ffd77a', SERIF);
  signBoard(g, 'store', 'GENERAL STORE', '#8a5a2a', '#fff1d0', SERIF, '#2a1608', 0.55);
  signBoard(g, 'gas', 'GAS · FOOD', '#a83a1a', '#fff4d8', SLAB);
  signBoard(g, 'motel', 'MOTEL', '#2a5a6a', '#ffe7a8', SERIF);
  signBoard(g, 'goldmine', 'GOLD MINE', '#4a2c16', '#ffc848', SERIF);
  signBoard(g, 'petro', 'PETROLEUM', '#d8b030', '#3a1a06', SLAB, '#3a1a06', 0.5);
  signBoard(g, 'roadclosed', 'ROAD CLOSED', '#f2e8d0', '#b8281a', SLAB, '#b8281a', 0.5);
  {
    // Route 66 shield
    const [x, y, w, h] = RECT.route66;
    g.fillStyle = '#2a2a2a';
    g.fillRect(x, y, w, h);
    const cx = x + w / 2;
    g.beginPath();
    g.moveTo(x + 14, y + 16);
    g.lineTo(x + w - 14, y + 16);
    g.quadraticCurveTo(x + w - 8, y + h * 0.55, cx, y + h - 10);
    g.quadraticCurveTo(x + 8, y + h * 0.55, x + 14, y + 16);
    g.fillStyle = '#f4ead8';
    g.fill();
    g.lineWidth = 6;
    g.strokeStyle = '#1a1a1a';
    g.stroke();
    g.fillStyle = '#1a1a1a';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `22px ${SLAB}`;
    g.fillText('ROUTE', cx, y + 40);
    g.font = `70px ${SLAB}`;
    g.fillText('66', cx, y + 98);
  }
  {
    // roadside billboard: the game's own ad (no other brand)
    const [x, y, w, h] = RECT.billboard;
    const grd = g.createLinearGradient(0, y, 0, y + h);
    grd.addColorStop(0, '#f6c060');
    grd.addColorStop(1, '#c8642a');
    g.fillStyle = grd;
    g.fillRect(x, y, w, h);
    // sun rays
    g.save();
    g.translate(x + w * 0.78, y + h * 0.55);
    for (let i = 0; i < 12; i++) {
      g.rotate(Math.PI / 6);
      g.fillStyle = 'rgba(255,240,200,.18)';
      g.fillRect(0, -6, 260, 12);
    }
    g.restore();
    g.fillStyle = '#7a2a10';
    g.beginPath();
    g.moveTo(x, y + h);
    g.lineTo(x + w * 0.2, y + h * 0.62);
    g.lineTo(x + w * 0.32, y + h * 0.7);
    g.lineTo(x + w * 0.45, y + h * 0.5);
    g.lineTo(x + w * 0.6, y + h * 0.72);
    g.lineTo(x + w, y + h * 0.6);
    g.lineTo(x + w, y + h);
    g.fill();
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `46px ${SERIF}`;
    g.lineWidth = 6;
    g.strokeStyle = '#3a1406';
    g.strokeText('3D CAR RUN', x + w * 0.42, y + 52);
    g.fillStyle = '#fff4d8';
    g.fillText('3D CAR RUN', x + w * 0.42, y + 52);
    g.font = `22px ${SLAB}`;
    g.fillStyle = '#3a1406';
    g.fillText('DUST NEVER STOPS', x + w * 0.42, y + 96);
    g.strokeStyle = '#3a1406';
    g.lineWidth = 8;
    g.strokeRect(x + 4, y + 4, w - 8, h - 8);
  }
  {
    // falling rock warning diamond
    const [x, y, w, h] = RECT.rockfall;
    g.fillStyle = '#2a2a2a';
    g.fillRect(x, y, w, h);
    g.save();
    g.translate(x + w / 2, y + h / 2);
    g.rotate(Math.PI / 4);
    g.fillStyle = '#f2c230';
    g.fillRect(-52, -52, 104, 104);
    g.lineWidth = 6;
    g.strokeStyle = '#1a1a1a';
    g.strokeRect(-48, -48, 96, 96);
    g.restore();
    g.fillStyle = '#1a1a1a';
    for (const [dx, dy, r] of [[-10, -18, 10], [12, -4, 8], [-4, 14, 12], [18, 18, 7]]) {
      g.beginPath();
      g.arc(x + w / 2 + dx, y + h / 2 + dy, r, 0, Math.PI * 2);
      g.fill();
    }
  }
  {
    // railroad crossbuck (white X with RAILROAD CROSSING)
    const [x, y, w, h] = RECT.crossbuck;
    g.fillStyle = '#2a2a2a';
    g.fillRect(x, y, w, h);
    g.save();
    g.translate(x + w / 2, y + h / 2);
    for (const a of [Math.PI / 4, -Math.PI / 4]) {
      g.save();
      g.rotate(a);
      g.fillStyle = '#f4f0e6';
      g.fillRect(-92, -18, 184, 36);
      g.strokeStyle = '#1a1a1a';
      g.lineWidth = 3;
      g.strokeRect(-92, -18, 184, 36);
      g.fillStyle = '#1a1a1a';
      g.font = `20px ${SLAB}`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(a > 0 ? 'RAILROAD' : 'CROSSING', 0, 2);
      g.restore();
    }
    g.restore();
  }
  {
    // red / white hazard stripes (crossing booms, barricades)
    const [x, y, w, h] = RECT.stripes;
    g.fillStyle = '#f4f0e6';
    g.fillRect(x, y, w, h);
    g.fillStyle = '#c8281a';
    for (let i = -h; i < w; i += 44) {
      g.beginPath();
      g.moveTo(x + i, y + h);
      g.lineTo(x + i + 22, y + h);
      g.lineTo(x + i + 22 + h, y);
      g.lineTo(x + i + h, y);
      g.closePath();
      g.save();
      g.beginPath();
      g.rect(x, y, w, h);
      g.clip();
      g.beginPath();
      g.moveTo(x + i, y + h);
      g.lineTo(x + i + 22, y + h);
      g.lineTo(x + i + 22 + h, y);
      g.lineTo(x + i + h, y);
      g.closePath();
      g.fill();
      g.restore();
    }
  }
  {
    // yellow / black chevrons (curves, ramps, roadblocks)
    const [x, y, w, h] = RECT.chevron;
    g.fillStyle = '#1a1a1a';
    g.fillRect(x, y, w, h);
    g.fillStyle = '#f2c230';
    for (let i = 0; i < 5; i++) {
      const cx = x + 30 + i * 66;
      g.beginPath();
      g.moveTo(cx, y + 14);
      g.lineTo(cx + 26, y + 14);
      g.lineTo(cx + 52, y + h / 2);
      g.lineTo(cx + 26, y + h - 14);
      g.lineTo(cx, y + h - 14);
      g.lineTo(cx + 26, y + h / 2);
      g.closePath();
      g.fill();
    }
  }
  {
    // TNT crate face
    const [x, y, w, h] = RECT.tnt;
    planks(g, x, y, w, h, '#b8864a', 'rgba(40,20,6,.5)', 13, 4);
    g.strokeStyle = '#4a2a10';
    g.lineWidth = 10;
    g.strokeRect(x + 5, y + 5, w - 10, h - 10);
    g.beginPath();
    g.moveTo(x + 8, y + 8);
    g.lineTo(x + w - 8, y + h - 8);
    g.stroke();
    g.fillStyle = '#b8281a';
    g.font = `48px ${SLAB}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('TNT', x + w / 2, y + h / 2 + 4);
  }
  {
    // hay bale end
    const [x, y, w, h] = RECT.hay;
    g.fillStyle = '#e0c060';
    g.fillRect(x, y, w, h);
    const r = rnd(71);
    for (let i = 0; i < 260; i++) {
      g.strokeStyle = r() < 0.5 ? 'rgba(160,120,30,.6)' : 'rgba(255,240,170,.6)';
      g.lineWidth = 1.5;
      const sx = x + r() * w;
      const sy = y + r() * h;
      g.beginPath();
      g.moveTo(sx, sy);
      g.lineTo(sx + (r() - 0.5) * 18, sy + (r() - 0.5) * 6);
      g.stroke();
    }
    g.fillStyle = 'rgba(120,80,20,.6)';
    g.fillRect(x, y + h * 0.3, w, 4);
    g.fillRect(x, y + h * 0.7, w, 4);
  }
  {
    // barrel top (rings)
    const [x, y, w, h] = RECT.barrelTop;
    g.fillStyle = '#d0d0c8';
    g.fillRect(x, y, w, h);
    for (const r of [56, 44, 20]) {
      g.strokeStyle = 'rgba(40,40,40,.5)';
      g.lineWidth = 4;
      g.beginPath();
      g.arc(x + w / 2, y + h / 2, r, 0, Math.PI * 2);
      g.stroke();
    }
  }
  {
    // WANTED poster
    const [x, y, w, h] = RECT.wanted;
    g.fillStyle = '#ead2a2';
    g.fillRect(x, y, w, h);
    g.fillStyle = '#3a1a06';
    g.textAlign = 'center';
    g.font = `30px ${SERIF}`;
    g.fillText('WANTED', x + w / 2, y + 36);
    g.fillStyle = '#8a6a44';
    g.fillRect(x + 30, y + 52, w - 60, 90);
    g.fillStyle = '#3a1a06';
    g.font = `18px ${SLAB}`;
    g.fillText('$ 5,000', x + w / 2, y + 172);
    g.font = `13px ${SLAB}`;
    g.fillText('REWARD', x + w / 2, y + 194);
  }
  {
    // cargo container side (ribs)
    const [x, y, w, h] = RECT.cargo;
    g.fillStyle = '#e8e4dc';
    g.fillRect(x, y, w, h);
    for (let i = 4; i < w; i += 14) {
      g.fillStyle = 'rgba(0,0,0,.18)';
      g.fillRect(x + i, y, 5, h);
    }
    g.fillStyle = 'rgba(0,0,0,.3)';
    g.fillRect(x, y, w, 6);
    g.fillRect(x, y + h - 6, w, 6);
  }
  {
    // gold nuggets / bars texture
    const [x, y, w, h] = RECT.gold;
    const grd = g.createLinearGradient(x, y, x, y + h);
    grd.addColorStop(0, '#fff2b0');
    grd.addColorStop(0.5, '#ffc848');
    grd.addColorStop(1, '#a8640a');
    g.fillStyle = grd;
    g.fillRect(x, y, w, h);
  }
  {
    const [x, y, w, h] = RECT.window;
    g.fillStyle = '#2a2a30';
    g.fillRect(x, y, w, h);
    g.fillStyle = '#5a4a3a';
    g.fillRect(x, y, w, 8);
    g.fillRect(x, y + h - 8, w, 8);
    g.fillRect(x, y, 8, h);
    g.fillRect(x + w - 8, y, 8, h);
    g.fillRect(x + w / 2 - 3, y, 6, h);
    g.fillRect(x, y + h / 2 - 3, w, 6);
  }
  {
    const [x, y, w, h] = RECT.windowLit;
    g.fillStyle = '#ffc860';
    g.fillRect(x, y, w, h);
    g.fillStyle = '#5a3a1a';
    g.fillRect(x, y, w, 8);
    g.fillRect(x, y + h - 8, w, 8);
    g.fillRect(x, y, 8, h);
    g.fillRect(x + w - 8, y, 8, h);
    g.fillRect(x + w / 2 - 3, y, 6, h);
    g.fillRect(x, y + h / 2 - 3, w, 6);
  }
  {
    // sea water ripples (coast)
    const [x, y, w, h] = RECT.water;
    g.fillStyle = '#d8ecf0';
    g.fillRect(x, y, w, h);
    g.strokeStyle = 'rgba(255,255,255,.9)';
    g.lineWidth = 2;
    for (let i = 0; i < 14; i++) {
      g.beginPath();
      const yy = y + (i * h) / 14 + 4;
      for (let xx = 0; xx <= w; xx += 8) g.lineTo(x + xx, yy + Math.sin(xx * 0.08 + i) * 2);
      g.stroke();
    }
  }
}
