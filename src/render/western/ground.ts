import * as THREE from 'three';

/**
 * 3D Car Run v1.0.0 — tiling desert ground textures (canvas, drawn once, seamless 256² tiles).
 * Colours are light / neutral where possible so one texture serves day, dusk and night through the
 * ground material colour.
 */
export type GroundKind = 'sand' | 'cracked' | 'redrock' | 'gravel' | 'prairie' | 'pines' | 'beach' | 'sea' | 'dirt' | 'rails';

const cache = new Map<GroundKind, THREE.CanvasTexture>();

function rng(seed: number) {
  let a = seed * 7919 + 13;
  return () => ((a = (a * 16807) % 2147483647) / 2147483647);
}
/** draw with wrap-around so the tile is seamless */
function wrapDraw(size: number, f: (dx: number, dy: number) => void) {
  for (const dx of [-size, 0, size]) for (const dy of [-size, 0, size]) f(dx, dy);
}

export function groundTex(kind: GroundKind): THREE.CanvasTexture {
  let t = cache.get(kind);
  if (t) return t;
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  const r = rng(kind.length * 31 + kind.charCodeAt(0));
  const speck = (n: number, cols: string[], sz: [number, number]) => {
    for (let i = 0; i < n; i++) {
      g.fillStyle = cols[Math.floor(r() * cols.length)];
      const x = r() * S;
      const y = r() * S;
      const s = sz[0] + r() * (sz[1] - sz[0]);
      wrapDraw(S, (dx, dy) => g.fillRect(x + dx, y + dy, s, s * (0.6 + r() * 0.8)));
    }
  };
  switch (kind) {
    case 'sand': {
      g.fillStyle = '#e6c08a';
      g.fillRect(0, 0, S, S);
      // wind ripples (periodic along x: whole number of waves per tile)
      for (let y = 0; y < S; y += 7) {
        g.strokeStyle = y % 14 ? 'rgba(150,95,45,.16)' : 'rgba(255,240,210,.22)';
        g.lineWidth = 2;
        g.beginPath();
        for (let x = 0; x <= S; x += 8) g.lineTo(x, y + Math.sin((x / S) * Math.PI * 4 + y * 0.3) * 3);
        g.stroke();
      }
      speck(120, ['rgba(140,90,40,.25)', 'rgba(255,245,220,.3)', 'rgba(110,70,30,.3)'], [1, 3]);
      break;
    }
    case 'cracked': {
      g.fillStyle = '#d8b88a';
      g.fillRect(0, 0, S, S);
      speck(200, ['rgba(120,80,40,.15)', 'rgba(255,240,210,.18)'], [2, 6]);
      // polygon cracks (seamless: lines drawn with wrap)
      g.strokeStyle = 'rgba(90,55,25,.55)';
      g.lineWidth = 1.6;
      const pts: [number, number][] = [];
      for (let i = 0; i < 26; i++) pts.push([r() * S, r() * S]);
      for (const [x, y] of pts) {
        const near = pts.map((p) => [p, Math.hypot(p[0] - x, p[1] - y)] as const).sort((a, b) => a[1] - b[1]).slice(1, 4);
        for (const [[px, py]] of near)
          wrapDraw(S, (dx, dy) => {
            g.beginPath();
            g.moveTo(x + dx, y + dy);
            g.lineTo((x + px) / 2 + (r() - 0.5) * 6 + dx, (y + py) / 2 + (r() - 0.5) * 6 + dy);
            g.lineTo(px + dx, py + dy);
            g.stroke();
          });
      }
      break;
    }
    case 'redrock': {
      g.fillStyle = '#b8603a';
      g.fillRect(0, 0, S, S);
      speck(260, ['rgba(80,30,10,.3)', 'rgba(240,170,120,.25)', 'rgba(140,60,30,.35)'], [2, 9]);
      for (let i = 0; i < 40; i++) {
        g.fillStyle = `rgba(${r() < 0.5 ? '90,40,20' : '230,160,110'},.25)`;
        const x = r() * S;
        const y = r() * S;
        const rr = 6 + r() * 16;
        wrapDraw(S, (dx, dy) => {
          g.beginPath();
          g.ellipse(x + dx, y + dy, rr, rr * 0.6, r() * 3, 0, Math.PI * 2);
          g.fill();
        });
      }
      break;
    }
    case 'gravel':
    case 'dirt': {
      g.fillStyle = kind === 'gravel' ? '#a89070' : '#b8946a';
      g.fillRect(0, 0, S, S);
      speck(900, ['rgba(70,50,30,.35)', 'rgba(230,210,180,.3)', 'rgba(120,90,60,.4)'], [1, 3.5]);
      if (kind === 'dirt')
        for (let x = 0; x < S; x += 32) {
          // tyre ruts along z
          g.fillStyle = 'rgba(90,60,30,.12)';
          g.fillRect(x + 6, 0, 6, S);
        }
      break;
    }
    case 'rails': {
      // gravel ballast with sleepers (train yard ground)
      g.fillStyle = '#8a7a68';
      g.fillRect(0, 0, S, S);
      speck(700, ['rgba(50,40,30,.4)', 'rgba(200,190,170,.3)'], [1, 3]);
      for (let y = 0; y < S; y += 32) {
        g.fillStyle = '#5a3e26';
        g.fillRect(0, y + 10, S, 10);
        g.fillStyle = 'rgba(0,0,0,.25)';
        g.fillRect(0, y + 19, S, 2);
      }
      g.fillStyle = '#7a7a80';
      for (const x of [40, 104, 168, 232]) g.fillRect(x, 0, 5, S);
      g.fillStyle = 'rgba(255,255,255,.35)';
      for (const x of [41, 105, 169, 233]) g.fillRect(x, 0, 1.5, S);
      break;
    }
    case 'prairie': {
      g.fillStyle = '#b8a458';
      g.fillRect(0, 0, S, S);
      speck(1400, ['rgba(120,110,40,.35)', 'rgba(230,210,120,.35)', 'rgba(90,110,40,.3)'], [1, 3]);
      break;
    }
    case 'pines': {
      g.fillStyle = '#5a6a3a';
      g.fillRect(0, 0, S, S);
      speck(1200, ['rgba(40,50,20,.4)', 'rgba(140,130,70,.3)', 'rgba(110,80,40,.35)'], [1, 4]);
      break;
    }
    case 'beach': {
      g.fillStyle = '#ead6a8';
      g.fillRect(0, 0, S, S);
      speck(500, ['rgba(160,130,90,.25)', 'rgba(255,255,240,.3)'], [1, 3]);
      break;
    }
    case 'sea': {
      g.fillStyle = '#3a8ab0';
      g.fillRect(0, 0, S, S);
      for (let i = 0; i < 70; i++) {
        g.strokeStyle = r() < 0.5 ? 'rgba(255,255,255,.28)' : 'rgba(20,60,100,.25)';
        g.lineWidth = 1 + r() * 2;
        const x = r() * S;
        const y = r() * S;
        const w = 10 + r() * 30;
        wrapDraw(S, (dx, dy) => {
          g.beginPath();
          g.moveTo(x + dx, y + dy);
          g.quadraticCurveTo(x + w / 2 + dx, y - 3 + dy, x + w + dx, y + dy);
          g.stroke();
        });
      }
      break;
    }
  }
  t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  cache.set(kind, t);
  return t;
}

/** dust mote / sand particle sprite (soft warm disc) */
let dustTex: THREE.CanvasTexture | null = null;
export function dustTexture() {
  if (dustTex) return dustTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,240,215,1)');
  grd.addColorStop(0.4, 'rgba(240,210,170,.55)');
  grd.addColorStop(1, 'rgba(220,180,130,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  dustTex = new THREE.CanvasTexture(c);
  return dustTex;
}

/** soft cloud puff for the sky (warm) */
let puffTex: THREE.CanvasTexture | null = null;
export function puffTexture() {
  if (puffTex) return puffTex;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const g = c.getContext('2d')!;
  const r = rng(9);
  for (let i = 0; i < 26; i++) {
    const x = 40 + r() * 176;
    const y = 50 + r() * 40;
    const rr = 18 + r() * 30;
    const grd = g.createRadialGradient(x, y, 0, x, y, rr);
    grd.addColorStop(0, 'rgba(255,255,255,.85)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.beginPath();
    g.arc(x, y, rr, 0, Math.PI * 2);
    g.fill();
  }
  puffTex = new THREE.CanvasTexture(c);
  puffTex.colorSpace = THREE.SRGBColorSpace;
  return puffTex;
}
