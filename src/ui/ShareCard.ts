// Share image: a 1080×1350 "brag card" drawn on a canvas (rank shield, EXP, car, pilot),
// then handed to the native share sheet — with a visible fallback when sharing is blocked
// (e.g. inside an iframe): a preview the player can long-press / download.
import xwaveWhiteUrl from '../assets/images/xwave-white.png';
import { CLASS_COLOR, type RankClass } from '../meta/Rank.ts';

export interface ShareCardData {
  title: string; // 'FINISH' · 'NEW RANK' · 'MY PILOT'
  name: string;
  rank: RankClass;
  exp: number;
  sub?: string; // e.g. '8.4 km · Hard · Endless'
  car: string; // image url
  avatar: string; // svg markup
  logo: string; // image url
}

const W = 1080;
const H = 1350;

function load(src: string): Promise<HTMLImageElement | null> {
  return new Promise((res) => {
    const im = new Image();
    im.crossOrigin = 'anonymous';
    im.onload = () => res(im);
    im.onerror = () => res(null);
    im.src = src;
  });
}

function shield(g: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  g.beginPath();
  g.moveTo(cx, cy - r);
  g.lineTo(cx + r * 0.86, cy - r * 0.62);
  g.lineTo(cx + r * 0.78, cy + r * 0.28);
  g.quadraticCurveTo(cx + r * 0.5, cy + r * 0.82, cx, cy + r);
  g.quadraticCurveTo(cx - r * 0.5, cy + r * 0.82, cx - r * 0.78, cy + r * 0.28);
  g.lineTo(cx - r * 0.86, cy - r * 0.62);
  g.closePath();
}

const fmt = (n: number) => Math.floor(n).toLocaleString('en-US');

export async function drawShareCard(d: ShareCardData): Promise<Blob | null> {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  if (!g) return null;
  const col = CLASS_COLOR[d.rank];
  // v1.0.0 (3D Car Run): a desert sunset — warm sky, red mesas, a dusty road — + rank-coloured glow
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#2a2a5c');
  bg.addColorStop(0.35, '#c8643a');
  bg.addColorStop(0.62, '#f0b060');
  bg.addColorStop(0.63, '#a8582e');
  bg.addColorStop(1, '#3a1a0a');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  // mesas on the horizon
  g.fillStyle = '#7a3418';
  for (const [x, w, h] of [[60, 220, 120], [330, 160, 80], [700, 260, 150], [960, 140, 90]] as const) {
    g.beginPath();
    g.moveTo(x, H * 0.63);
    g.lineTo(x + 24, H * 0.63 - h);
    g.lineTo(x + w - 24, H * 0.63 - h);
    g.lineTo(x + w, H * 0.63);
    g.fill();
  }
  // road to the vanishing point
  g.fillStyle = '#4a3a30';
  g.beginPath();
  g.moveTo(W / 2 - 40, H * 0.63);
  g.lineTo(W / 2 + 40, H * 0.63);
  g.lineTo(W * 0.92, H);
  g.lineTo(W * 0.08, H);
  g.fill();
  g.fillStyle = '#ffd060';
  for (let i = 0; i < 6; i++) {
    const t0 = i / 6;
    const y = H * 0.63 + (H * 0.37) * t0 * t0;
    g.fillRect(W / 2 - 2 - t0 * 6, y, 4 + t0 * 12, 10 + t0 * 30);
  }
  // darken the middle so text reads
  g.fillStyle = 'rgba(20,8,2,.35)';
  g.fillRect(0, 0, W, H);
  const glow = g.createRadialGradient(W / 2, 470, 40, W / 2, 470, 620);
  glow.addColorStop(0, `${col}66`);
  glow.addColorStop(1, 'transparent');
  g.fillStyle = glow;
  g.fillRect(0, 0, W, H);
  // speed lines
  g.strokeStyle = 'rgba(255,255,255,.06)';
  g.lineWidth = 3;
  for (let i = 0; i < 26; i++) {
    const y = 120 + i * 47;
    g.beginPath();
    g.moveTo(((i * 137) % 300) - 40, y);
    g.lineTo(((i * 137) % 300) + 160 + (i % 3) * 90, y);
    g.stroke();
  }
  const [logo, car, ava] = await Promise.all([
    load(d.logo),
    load(d.car),
    load(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(d.avatar.includes('xmlns') ? d.avatar : d.avatar.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"'))}`),
  ]);
  // v1.0.5 layout (top → bottom, nothing overlaps): logo · title · rank shield · EXP · line · car
  try {
    await Promise.all([document.fonts?.load('72px "Rye"'), document.fonts?.load('112px "Alfa Slab One"')]);
  } catch {
    /* fonts are optional */
  }
  if (logo) {
    const lw = 430;
    g.drawImage(logo, (W - lw) / 2, 24, lw, (lw * logo.height) / logo.width); // ends at y ≈ 392
  }
  g.textAlign = 'center';
  g.font = '68px "Rye", Georgia, serif';
  g.lineJoin = 'round';
  g.lineWidth = 10;
  g.strokeStyle = '#2a1204';
  g.strokeText(d.title, W / 2, 470);
  g.fillStyle = '#ffe7b0';
  g.fillText(d.title, W / 2, 470);
  // rank shield
  shield(g, W / 2, 625, 112);
  const sg = g.createLinearGradient(0, 513, 0, 737);
  sg.addColorStop(0, col);
  sg.addColorStop(1, '#3a1a06');
  g.fillStyle = sg;
  g.shadowColor = col;
  g.shadowBlur = 40;
  g.fill();
  g.shadowBlur = 0;
  g.lineWidth = 10;
  g.strokeStyle = '#f0d49a';
  g.stroke();
  g.fillStyle = '#ffffff';
  g.font = `${d.rank.length > 2 ? 84 : d.rank.length > 1 ? 104 : 128}px "Alfa Slab One", Georgia, serif`;
  g.textBaseline = 'middle';
  g.fillText(d.rank, W / 2, 632);
  g.textBaseline = 'alphabetic';
  g.font = '38px "Alfa Slab One", Georgia, serif';
  g.fillStyle = '#ffd27a';
  g.fillText(`RANK ${d.rank}`, W / 2, 800);
  // EXP: big number + a brass EXP plate
  g.fillStyle = '#ffffff';
  g.font = '112px "Alfa Slab One", Georgia, serif';
  g.lineWidth = 10;
  g.strokeStyle = '#2a1204';
  g.strokeText(fmt(d.exp), W / 2, 912);
  g.fillText(fmt(d.exp), W / 2, 912);
  const pw = 120, ph = 46, px = (W - pw) / 2, py = 932;
  const pg = g.createLinearGradient(0, py, 0, py + ph);
  pg.addColorStop(0, '#ffe3a0');
  pg.addColorStop(0.5, '#e2a446');
  pg.addColorStop(1, '#a8641c');
  g.fillStyle = pg;
  g.beginPath();
  g.roundRect(px, py, pw, ph, 10);
  g.fill();
  g.lineWidth = 4;
  g.strokeStyle = '#3a1a06';
  g.stroke();
  g.fillStyle = '#3a1a04';
  g.font = '30px "Alfa Slab One", Georgia, serif';
  g.fillText('EXP', W / 2, py + 34);
  if (d.sub) {
    g.fillStyle = 'rgba(255,236,200,.88)';
    g.font = '600 32px system-ui, -apple-system, Segoe UI, sans-serif';
    g.fillText(d.sub, W / 2, 1022);
  }
  // car
  if (car) {
    // fit inside 600×190 above the pilot strip, keep the aspect ratio, sit on a soft glow
    const k = Math.min(600 / car.width, 190 / car.height);
    const cw = car.width * k;
    const ch = car.height * k;
    const halo = g.createRadialGradient(W / 2, 1150, 20, W / 2, 1150, 360);
    halo.addColorStop(0, `${col}55`);
    halo.addColorStop(1, 'transparent');
    g.fillStyle = halo;
    g.fillRect(0, 1040, W, 196);
    g.drawImage(car, (W - cw) / 2, 1232 - ch, cw, ch);
  }
  // pilot strip
  g.fillStyle = 'rgba(42,22,8,.85)';
  g.fillRect(0, H - 110, W, 110);
  g.fillStyle = '#ad8a58';
  g.fillRect(0, H - 114, W, 4);
  if (ava) g.drawImage(ava, 40, H - 98, 86, 86);
  g.textAlign = 'left';
  g.fillStyle = '#ffffff';
  g.font = '800 44px system-ui, -apple-system, Segoe UI, sans-serif';
  g.fillText(d.name.slice(0, 18), 146, H - 42);
  g.textAlign = 'right';
  g.fillStyle = '#ffd27a';
  g.font = '700 34px system-ui, -apple-system, Segoe UI, sans-serif';
  g.fillText('Can you beat me?', W - 40, H - 44);
  // v4.0.2 (owner): the publisher's white wordmark in the top-right corner
  const xw = await load(xwaveWhiteUrl);
  if (xw && xw.naturalWidth) {
    const lw = 200;
    g.globalAlpha = 0.9;
    g.shadowColor = 'rgba(0,0,0,.55)';
    g.shadowBlur = 8;
    g.drawImage(xw, W - lw - 40, 44, lw, (lw * xw.naturalHeight) / xw.naturalWidth);
    g.shadowBlur = 0;
    g.globalAlpha = 1;
  }
  return new Promise((res) => c.toBlob((b) => res(b), 'image/png'));
}

/** 'shared' = native sheet done · 'cancel' = player closed it · 'fallback' = caller shows the preview */
export async function shareImage(blob: Blob | null, text: string, url: string): Promise<'shared' | 'cancel' | 'fallback'> {
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  try {
    if (blob && nav.share && nav.canShare) {
      const file = new File([blob], '3d-car-run.png', { type: 'image/png' });
      if (nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], title: '3D Car Run', text: url ? `${text} ${url}` : text });
        return 'shared';
      }
    }
    if (nav.share) {
      await nav.share({ title: '3D Car Run', text, ...(url ? { url } : {}) });
      return 'shared';
    }
  } catch (e) {
    if ((e as DOMException)?.name === 'AbortError') return 'cancel';
  }
  return 'fallback';
}

/** copy text without the async clipboard API (works inside sandboxed iframes more often) */
export function copyText(t: string) {
  try {
    void navigator.clipboard?.writeText(t).catch(() => legacyCopy(t));
  } catch {
    legacyCopy(t);
  }
}
function legacyCopy(t: string) {
  const ta = document.createElement('textarea');
  ta.value = t;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
  } catch {
    /* ignore */
  }
  ta.remove();
}
