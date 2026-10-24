// Share image: a 1080×1350 "brag card" drawn on a canvas (rank shield, EXP, car, pilot),
// then handed to the native share sheet — with a visible fallback when sharing is blocked
// (e.g. inside an iframe): a preview the player can long-press / download.
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
  if (logo) {
    const lw = 560;
    g.drawImage(logo, (W - lw) / 2, 40, lw, (lw * logo.height) / logo.width);
  }
  g.textAlign = 'center';
  g.fillStyle = '#ffffff';
  g.font = '92px "Rye", Georgia, serif';
  g.shadowColor = col;
  g.shadowBlur = 30;
  g.fillText(d.title, W / 2, 300);
  g.shadowBlur = 0;
  // rank shield
  shield(g, W / 2, 500, 150);
  const sg = g.createLinearGradient(0, 350, 0, 650);
  sg.addColorStop(0, col);
  sg.addColorStop(1, '#3a1a06');
  g.fillStyle = sg;
  g.shadowColor = col;
  g.shadowBlur = 50;
  g.fill();
  g.shadowBlur = 0;
  g.lineWidth = 12;
  g.strokeStyle = '#ffffff';
  g.stroke();
  g.fillStyle = '#ffffff';
  g.font = `900 ${d.rank.length > 2 ? 110 : d.rank.length > 1 ? 140 : 170}px system-ui, -apple-system, Segoe UI, sans-serif`;
  g.textBaseline = 'middle';
  g.fillText(d.rank, W / 2, 510);
  g.textBaseline = 'alphabetic';
  g.font = '800 40px system-ui, -apple-system, Segoe UI, sans-serif';
  g.fillStyle = col;
  g.fillText(`RANK ${d.rank}`, W / 2, 712);
  // EXP
  g.fillStyle = '#ffffff';
  g.font = '128px "Alfa Slab One", Georgia, serif';
  g.fillText(fmt(d.exp), W / 2, 850);
  g.font = '800 44px system-ui, -apple-system, Segoe UI, sans-serif';
  g.fillStyle = '#ffd94a';
  g.fillText('EXP', W / 2, 910);
  if (d.sub) {
    g.fillStyle = 'rgba(220,225,255,.8)';
    g.font = '600 36px system-ui, -apple-system, Segoe UI, sans-serif';
    g.fillText(d.sub, W / 2, 964);
  }
  // car
  if (car) {
    // fit inside 680×250, keep the aspect ratio, sit on a soft glow
    const k = Math.min(680 / car.width, 250 / car.height);
    const cw = car.width * k;
    const ch = car.height * k;
    const halo = g.createRadialGradient(W / 2, 1110, 20, W / 2, 1110, 380);
    halo.addColorStop(0, `${col}55`);
    halo.addColorStop(1, 'transparent');
    g.fillStyle = halo;
    g.fillRect(0, 980, W, 260);
    g.drawImage(car, (W - cw) / 2, 1235 - ch, cw, ch);
  }
  // pilot strip
  g.fillStyle = 'rgba(42,22,8,.85)';
  g.fillRect(0, H - 110, W, 110);
  g.fillStyle = '#c8924a';
  g.fillRect(0, H - 114, W, 4);
  if (ava) g.drawImage(ava, 40, H - 98, 86, 86);
  g.textAlign = 'left';
  g.fillStyle = '#ffffff';
  g.font = '800 44px system-ui, -apple-system, Segoe UI, sans-serif';
  g.fillText(d.name.slice(0, 18), 146, H - 42);
  g.textAlign = 'right';
  g.fillStyle = 'rgba(220,225,255,.85)';
  g.font = '700 34px system-ui, -apple-system, Segoe UI, sans-serif';
  g.fillText('Can you beat me?', W - 40, H - 44);
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
