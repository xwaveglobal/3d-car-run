/** v3 native UI — full screens (home, tracks, garage, missions, ranks, daily, shop…) */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { perkVisible } from '../../meta/Perks.ts';
import { C, Gfx, bar, button, card, fmt, iconBtn, panel, rankBadge, rankBadgeW, toggle } from './gfx.ts';
import type { UI } from './NativeUI.ts';
import { BAG_ICON, BOLT, ICON, ITEM_ICON, RARITY_COLOR, ROCKET_W, SPECIAL_SHORT } from './consts.ts';
import { capRow, column, safeBottom, safeTop } from './layout.ts';
import { drawOverlay } from './popups.ts';
import { avatarSvg, avatarForName } from '../../ui/avatars.ts';
import { CLASSES, CLASS_COLOR, classFor, playerRank, type RankClass } from '../../meta/Rank.ts';
import { LEVELS } from '../../config.ts';
import { SKINS, carVisibility } from '../../render/Vehicle.ts';
import { carImage } from '../../ui/shared.ts';
import { CHAINS, activeChains, pilotLevel } from '../../meta/Career.ts';
import { CHECKIN, ITEM_PRICE, SPECIALS, type ItemKey } from '../../meta/Daily.ts';
import { fmtLeft, localTime } from '../../meta/Events.ts';
import { hs } from '../hs.ts';
import loadingUrl from '../../assets/images/loading.webp';
import thEndless from '../../assets/images/tracks/desert-valley.jpg';
import thMega from '../../assets/images/tracks/canyon-arch.jpg';
import { carShadow } from '../../ui/shared.ts';
import { HOME_LAYOUT, homeStage } from '../../ui/homeStage.ts';
import { SAFE } from './layout.ts';
import hProfile from '../../assets/images/home/profile.webp';
import hCurrency from '../../assets/images/home/currency.webp';
import hGear from '../../assets/images/home/gear.webp';
import hMenu from '../../assets/images/home/menu.webp';
import hSign from '../../assets/images/home/sign-blank.webp';
import walletUrl from '../../assets/images/ui/wallet.webp';
import pageBgUrl from '../../assets/images/ui/page-bg.webp';

/** filled calendar for the DAILY signpost (web: src/ui/UI.ts CAL_W) */
const CAL_W = `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M4 6.5A2.5 2.5 0 0 1 6.5 4H7V2.5h2.2V4h5.6V2.5H17V4h.5A2.5 2.5 0 0 1 20 6.5V19a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 19zm2.2 4V19c0 .3.2.4.4.4h10.8c.2 0 .4-.1.4-.4v-8.5zm2 2h2.6v2.6H8.2zm4.8 0h2.6v2.6H13z"/></svg>`;

const SCREENS: Record<string, (ui: UI, g: Gfx) => void> = {
  loading,
  start,
  tracks,
  garage,
  missions,
  ranks,
  daily,
  events,
  shop,
  countdown,
  tutprompt,
};

export function drawScreens(ui: UI, g: Gfx, ids: string[], layer: 'base' | 'overlay') {
  for (const id of ids) {
    if (!ui.shown.has(id)) continue;
    // one screen failing to draw must never take the others (and their buttons) down with it
    g.flat = !(layer === 'base' && id === 'start');
    g.guard(id, () => (layer === 'base' ? SCREENS[id]?.(ui, g) : drawOverlay(ui, g, id)));
    g.flat = true;
  }
  if (layer === 'base' && ui.tutHint && ui.shown.has('hud')) swipeHint(g);
}

// ------------------------------------------------------------------ shared
/** dark gradient behind full pages (the 3D scene shows faintly) */
function pageBg(g: Gfx, a = 0.86) {
  // v4.0: the dimmed desert of the web pages (page-bg.webp) instead of navy
  g.rr(0, 0, g.W, g.H, 0, '#2a1608');
  g.img(pageBgUrl, 0, 0, g.W, g.H, 'cover');
  g.rr(0, 0, g.W, g.H, 0, g.lin(0, 0, 0, g.H, [[0, `rgba(26,13,5,${a - 0.31})`], [1, `rgba(16,8,3,${Math.min(0.92, a - 0.04)})`]]));
  g.block(0, 0, g.W, g.H);
}

/** page header: back · title · wallet */
export function pageHead(ui: UI, g: Gfx, title: string, back = () => ui.h.home()) {
  const row = capRow(g);
  const y = row.top + 2;
  // v4.0: a wood header band with a bronze rule (web: .head)
  g.rr(0, 0, g.W, y + 48, 0, g.lin(0, 0, 0, y + 48, [[0, 'rgba(60,36,16,.95)'], [1, 'rgba(36,20,8,.95)']]));
  g.rr(0, y + 47, g.W, 2.5, 0, '#ad8a58');
  iconBtn(g, 'back', 12, y, 40, ICON.chevL, back);
  const ww = wallet(ui, g, row.right, y + 4);
  const l = 60,
    r = row.right - ww - 8;
  g.text(title.toUpperCase(), (l + r) / 2, y + 21, { size: 20, align: 'center', font: 't', color: '#f6e3b4', stroke: '#2a1204', strokeW: 3, shadow: null, maxW: Math.max(60, r - l) });
  return Math.max(y + 56, safeTop(g) + 4);
}

/** coin chip: tap → shop, "+" → free coins (only while an ad can be shown) */
export function wallet(ui: UI, g: Gfx, right: number, y: number, compact = false) {
  // v4.0: the wood coin bar of the web UI (wallet.webp, 248 : 87) — tap = shop, "+" = shop (coins / free coins)
  const n = ui.save?.wallet ?? 0;
  const txt = compact && n >= 10000 ? `${(n / 1000).toFixed(n >= 100000 ? 0 : 1)}K` : fmt(n);
  const h = 36,
    w = h * (248 / 87);
  const x = right - w;
  g.img(walletUrl, x, y - 2, w, h, 'fill');
  g.text(txt, x + w * 0.5, y - 2 + h / 2, { size: 13, align: 'center', maxW: w * 0.42, noTr: true, color: '#fff1cf', stroke: '#2a1204', strokeW: 2, shadow: null });
  g.hit(x, y - 4, w * 0.72, h + 4, 'wallet', () => ui.h.shop());
  g.hit(x + w * 0.72, y - 4, w * 0.28, h + 4, 'freepop', () => ui.h.shop());
  return w;
}

function avatar(g: Gfx, av: number, x: number, y: number, s: number, cls?: RankClass, ring = true) {
  if (ring && cls) g.circle(x + s / 2, y + s / 2, s / 2 + 2.5, null, CLASS_COLOR[cls], 2.5);
  g.icon(avatarSvg(av), x, y, s);
  if (cls) rankBadge(g, cls, x + s - s * 0.38, y + s - s * 0.34, s * 0.36);
}

/** vertical list with its own scroll offset; content(y) draws from y and returns the bottom */
function scrollList(g: Gfx, key: string, x: number, y: number, w: number, h: number, content: (y: number) => number) {
  g.dry++;
  const total = content(0);
  g.dry--;
  const off = g.scroll(x, y, w, h, key, total + 12);
  g.clip(x, y, w, h);
  content(y - off);
  g.unclip();
}

// ------------------------------------------------------------------ loading
function loading(ui: UI, g: Gfx) {
  g.rr(0, 0, g.W, g.H, 0, '#1c0f06');
  g.img(loadingUrl, 0, 0, g.W, g.H, 'cover');
  g.block(0, 0, g.W, g.H);
  const y = g.H - safeBottom(g) - 70;
  const w = Math.min(280, g.W - 80);
  // v4.6 (owner): the bar always visibly runs — it glides toward the real progress and creeps on while
  // a step takes long — with "Loading… NN %" under it (never "Ready")
  const dt = Math.min(0.1, Math.max(0, (g.time - ui.loadT) / 1000));
  ui.loadT = g.time;
  const gap = ui.loading - ui.loadShown;
  if (gap > 0.001) ui.loadShown += Math.max(gap * Math.min(1, dt * 6), dt * 0.08);
  else if (ui.loadShown < 0.99) ui.loadShown += Math.max(0, Math.min(ui.loading + 0.09, 0.99) - ui.loadShown) * dt * 0.4;
  ui.loadShown = Math.min(1, ui.loadShown);
  bar(g, (g.W - w) / 2, y, w, 8, ui.loadShown, g.lin(0, 0, g.W, 0, [[0, '#ffc848'], [1, '#ff4fd8']]), 'rgba(0,0,0,.5)');
  g.text(`Loading… ${Math.floor(ui.loadShown * 100)}%`, g.W / 2, y + 26, { size: 13, align: 'center', font: 'b' });
}

// ------------------------------------------------------------------ home
/**
 * v4.0 (3D Car Run): Home = the owner's key art (drawn by the renderer: src/render/HomeView.ts) with live
 * parts on top, placed in key-art pixels like the web Home (src/ui/homeStage.ts → HOME_LAYOUT):
 *  - the painted BONUS / PLAY / GARAGE / SHOP / MISSIONS are the buttons (tap areas here);
 *  - the right signpost = DAILY (blank sign + calendar), with its red dot;
 *  - the top bar (profile, coins, settings, More) is pinned under TikTok's capsule;
 *  - Launch / Share / Entry: small round buttons under More (TikTok review buttons; Launch / Entry only
 *    where HSGame.has('tiktok_missions'), Share where HSGame.has('share')).
 */
function start(ui: UI, g: Gfx) {
  const o = ui.home;
  const W = g.W;
  const H = g.H;
  const st = homeStage(W, H);
  const L = HOME_LAYOUT as unknown as Record<string, readonly number[]>;
  const art = (k: string) => {
    const [x, y, w, h] = L[k];
    return { x: st.x + x * st.s, y: st.y + y * st.s, w: w * st.s, h: (h ?? 0) * st.s };
  };
  // top bar: under the status bar and TikTok's capsule, keeping its own spacing from the art
  const capB = SAFE.capBottom ? SAFE.capBottom + 4 : Math.max(SAFE.top, 0) + 8;
  const topBase = capB; // pinned at the top on tall phones too (web: #start.home2.tall)
  const top = (k: string) => {
    const r = art(k);
    return { ...r, y: topBase + (L[k][1] - 38) * st.s };
  };
  const pressGlow = (r: { x: number; y: number; w: number; h: number }, key: string) => {
    if (g.isPressed(key)) g.rr(r.x, r.y, r.w, r.h, 14 * st.s, 'rgba(255,236,190,.2)');
  };
  // ---- painted buttons (tap areas)
  const hot = (k: string, key: string, fn: () => void) => {
    const r = art(k);
    pressGlow(r, key);
    g.hit(r.x, r.y, r.w, r.h, key, fn);
    return r;
  };
  const bonus = hot('bonus', 'events', () => ui.h.events());
  if (o?.bonus.live) dot(g, bonus.x + bonus.w * 0.92, bonus.y + bonus.h * 0.06, st.s);
  {
    const r = art('play');
    const k = (Math.sin(g.time / 410) + 1) / 2; // PLAY breathes (a soft light, the art stays)
    g.alpha(0.12 + 0.18 * k);
    g.rr(r.x + r.w * 0.03, r.y + r.h * 0.06, r.w * 0.94, r.h * 0.88, 20 * st.s, 'rgba(255,214,120,.55)');
    g.alpha(1);
    hot('play', 'play', () => ui.h.play());
  }
  hot('garage', 'garage', () => ui.h.garage());
  const shopR = hot('shop', 'shop', () => ui.h.shop());
  if (o?.sale) {
    const tx = shopR.x + shopR.w - 8,
      ty = shopR.y - 6;
    g.rr(tx - 30, ty - 9, 40, 18, 8, '#c8301a', '#fff1d0', 1.2);
    g.text('−80%', tx - 10, ty, { size: 10, align: 'center', color: '#fff1d0', shadow: null, noTr: true });
  }
  hot('missions', 'missions', () => ui.h.missions());
  // ---- DAILY signpost (blank sign + calendar + label)
  {
    const r = art('sign');
    const ih = r.w * (152 / 168);
    g.img(hSign, r.x, r.y, r.w, ih, 'fill');
    g.icon(CAL_W, r.x + r.w * 0.32, r.y + ih * 0.18, r.w * 0.36, '#f3d79a');
    g.text('DAILY', r.x + r.w / 2, r.y + ih * 0.73, { size: 29 * st.s, align: 'center', color: '#f6e3b4', stroke: '#3a1a06', strokeW: 3, shadow: null });
    pressGlow({ x: r.x, y: r.y, w: r.w, h: ih }, 'daily');
    if (o && o.dailyBadge > 0) dot(g, r.x + r.w * 0.93, r.y + ih * 0.04, st.s);
    g.hit(r.x, r.y, r.w, ih, 'daily', () => ui.h.daily());
  }
  // ---- top bar
  {
    const r = top('profile');
    const ph = r.w * (135 / 442);
    g.img(hProfile, r.x, r.y, r.w, ph, 'fill');
    const av = { x: r.x + r.w * 0.032, y: r.y + ph * 0.067, s: r.w * 0.249 };
    if (o?.avatarPicked) {
      g.circle(av.x + av.s / 2, av.y + av.s / 2, av.s / 2, '#2a1406');
      g.icon(avatarSvg(o.avatar), av.x, av.y, av.s);
    }
    const rk = o?.allRank ? `#${o.allRank >= 10000 ? `${Math.round(o.allRank / 1000)}K` : fmt(o.allRank)}` : '#—';
    g.text(rk, av.x + av.s * 0.48, av.y + av.s * 0.945, { size: 30 * st.s, align: 'center', color: '#2a1404', shadow: null, noTr: true });
    if (o) {
      g.text(o.name, r.x + r.w * 0.328, r.y + ph * 0.34, { size: 40 * st.s, color: '#fff1cf', maxW: r.w * 0.58, noTr: true, stroke: '#2a1204', strokeW: 2 });
      const bw = rankBadgeW(g, ui.myClass, 34 * st.s);
      rankBadge(g, ui.myClass, r.x + r.w * 0.328, r.y + ph * 0.52, 34 * st.s);
      g.rich(`${fmt(o.bolts)} ${BOLT}`, r.x + r.w * 0.328 + bw + 8 * st.s, r.y + ph * 0.5, r.w * 0.5, { size: 36 * st.s });
    }
    pressGlow({ x: r.x, y: r.y, w: r.w, h: ph }, 'profile');
    g.hit(r.x, r.y, r.w, ph, 'profile', () => ui.h.profile());
  }
  {
    const r = top('currency');
    const ch = r.w * (87 / 248);
    g.img(hCurrency, r.x, r.y, r.w, ch, 'fill');
    const n = ui.save?.wallet ?? 0;
    const txt = n >= 100000 ? `${(n / 1000).toFixed(0)}K` : fmt(n);
    g.text(txt, r.x + r.w * 0.47, r.y + ch * 0.52, { size: 36 * st.s, align: 'center', color: '#fff1cf', maxW: r.w * 0.42, noTr: true, stroke: '#2a1204', strokeW: 2 });
    g.hit(r.x, r.y, r.w * 0.7, ch, 'wallet', () => ui.h.shop());
    g.hit(r.x + r.w * 0.7, r.y, r.w * 0.3, ch, 'freepop', () => ui.h.shop());
  }
  {
    const r = top('gear');
    g.img(hGear, r.x, r.y, r.w, r.w, 'fill');
    pressGlow({ x: r.x, y: r.y, w: r.w, h: r.w }, 'settings');
    g.hit(r.x - 2, r.y - 2, r.w + 4, r.w + 4, 'settings', () => ui.h.settings());
  }
  {
    const r = top('menu');
    const mh = r.w * (95 / 92);
    g.img(hMenu, r.x, r.y, r.w, mh, 'fill');
    pressGlow({ x: r.x, y: r.y, w: r.w, h: mh }, 'more');
    if (o && o.dailyBadge > 0) dot(g, r.x + r.w * 0.95, r.y + mh * 0.02, st.s);
    g.hit(r.x - 2, r.y - 2, r.w + 4, mh + 4, 'more', () => ui.showOverlay('more'));
  }
  // ---- Launch · Share · Entry (small round buttons under More)
  const pst = hs.perkState();
  const perks = [
    { key: 'pk-launch', kind: 'launch' as const, icon: ROCKET_W, label: 'LAUNCH', on: pst.hasMissions },
    { key: 'pk-share', kind: 'share' as const, icon: ICON.share, label: 'SHARE', on: pst.hasShare },
    { key: 'pk-entry', kind: 'entry' as const, icon: ICON.gift, label: 'ENTRY', on: pst.hasMissions },
  ].filter((p) => p.on || !pst.started);
  const slots = ['pkEntry', 'pkLaunch', 'pkShare'];
  perks.forEach((p, i) => {
    const r = top(slots[i]);
    const rr = r.w / 2,
      cx = r.x + rr,
      cy = r.y + rr;
    const pr = g.isPressed(p.key);
    g.circle(cx, cy, rr, g.rad(cx, cy - rr * 0.3, rr * 0.1, rr * 1.1, [[0, pr ? '#8a5a30' : '#6a4424'], [1, '#3a2210']]), '#ad8a58', Math.max(2, 3 * st.s + 1));
    g.circle(cx, cy, rr + 1.5, null, '#2a1204', 1.5);
    g.icon(p.icon, cx - rr * 0.56, cy - rr * 0.56, rr * 1.12, '#ffe3a0');
    const lw = g.measure(p.label, { size: 9.5 }) + 12;
    g.rr(cx - lw / 2, r.y + r.w + 2, lw, 15, 6, '#2a1406', '#ad8a58', 1);
    g.text(p.label, cx, r.y + r.w + 9.5, { size: 9.5, align: 'center', color: '#fff1d0', shadow: null, noTr: true });
    const open = perkVisible(p.kind, pst);
    if (open) dot(g, cx + rr * 0.78, cy - rr * 0.8, st.s);
    else if (pst.started && p.kind !== 'share') {
      g.circle(cx + rr * 0.78, cy - rr * 0.8, 8, '#6aa83e', '#fff1d0', 1.4);
      g.icon(ICON.check, cx + rr * 0.78 - 6, cy - rr * 0.8 - 6, 12, '#ffffff');
    }
    g.hit(r.x - 4, r.y - 4, r.w + 8, r.w + 22, p.key, () => ui.h.perk(p.kind));
  });
}

/** the key art's red notification dot */
function dot(g: Gfx, x: number, y: number, s: number) {
  const r = Math.max(6, 15 * s);
  g.circle(x, y, r, '#c40000', '#ffffff', Math.max(1.5, r * 0.25));
  g.circle(x, y, r * 0.55, '#ff2a2a');
}

function tracks(ui: UI, g: Gfx) {
  pageBg(g, 0.55);
  const s = ui.save;
  if (!s) return;
  // ---- header: back · SELECT TRACK · [Training] (v3.0.10: training lives here after the first run)
  const row = capRow(g);
  const hy = row.top + 2;
  iconBtn(g, 'back', 12, hy, 40, ICON.chevL, () => ui.h.home());
  const tw = 104;
  const tx = row.right - tw;
  {
    const k = 'tr-training';
    const pr = g.isPressed(k);
    g.rr(tx, hy + 3, tw, 34, 17, pr ? 'rgba(255,200,90,.3)' : g.lin(0, hy, 0, hy + 34, [[0, '#2a4fb8'], [1, '#14286e']]), 'rgba(140,190,255,.6)', 1.2);
    g.icon(ICON.hand, tx + 10, hy + 10, 20, '#ffffff');
    g.text('Training', tx + 34, hy + 20.5, { size: 13, maxW: tw - 42 });
    g.hit(tx - 4, hy - 2, tw + 8, 44, k, () => ui.h.help());
  }
  g.text('SELECT TRACK', 62, hy + 20, { size: 18, italic: true, maxW: tx - 62 - 10 });
  const top = Math.max(hy + 50, safeTop(g) + 4);
  const col = column(g);
  const rank = playerRank(s.expBest, s.exp2Best);
  const aaa = CLASSES.indexOf(rank) >= CLASSES.indexOf('AAA');
  const lv = LEVELS[s.settings.speed].label;
  const x = col.x + 12,
    w = col.w - 24;
  scrollList(g, 'tracks', 0, top, g.W, g.H - top - safeBottom(g), (y) => {
    const tcard = (key: string, img: string, title: string, sub: string, meta: string, num: string, sel: boolean, locked: boolean, fn: () => void, h = 112) => {
      const pr = g.isPressed(key);
      g.rr(x, y, w, h, 16, '#3a2210', sel ? C.gold : 'rgba(190,150,100,.5)', sel ? 2 : 1);
      if (img) {
        g.alpha(locked ? 0.35 : pr ? 0.8 : 1);
        g.img(img, x + 1, y + 1, w - 2, h - 2, 'cover', 15);
        g.alpha(1);
      }
      g.rr(x + 1, y + 1, w - 2, h - 2, 15, g.lin(x, 0, x + w, 0, [[0, 'rgba(4,8,26,.92)'], [0.6, 'rgba(4,8,26,.45)'], [1, 'rgba(4,8,26,0)']]));
      g.text(title, x + 16, y + 26, { size: 19, italic: true, maxW: w * 0.6 });
      g.rich(sub, x + 16, y + 40, w * 0.62, { size: 11, font: 'b', color: C.muted });
      g.rich(meta, x + 16, y + h - 34, w * 0.75, { size: 13 });
      g.circle(x + w - 24, y + 24, 14, 'rgba(0,0,0,.5)', 'rgba(255,255,255,.5)');
      if (num.startsWith('<svg')) g.icon(num, x + w - 32, y + 16, 16, '#ffffff');
      else g.text(num, x + w - 24, y + 24.5, { size: 13, align: 'center', noTr: true });
      g.hit(x, y, w, h, key, fn);
      y += h + 10;
    };
    tcard('tr-endless', thEndless, 'Endless', `<b>${lv}</b> · The rank road · D → AAA`, `${BOLT} <b>${fmt(s.expBest)}</b> <span class="clsb" style="--cc:${CLASS_COLOR[classFor(s.expBest)]}">${CLASSES[Math.min(5, CLASSES.indexOf(classFor(s.expBest)))]}</span>`, '1', s.track !== 'track2', false, () => ui.h.pickTrack('endless'));
    if (aaa)
      tcard('tr-t2', thMega, 'Mega Rush', `<b>${lv}</b> · Harder · EXP ×1.25 · ranks S+`, `${BOLT} <b>${fmt(s.exp2Best)}</b> ${['S', 'SS', 'SSS'].map((r) => `<span class="clsb" style="--cc:${CLASS_COLOR[r as RankClass]}">${r}</span>`).join(' ')}`, '2', s.track === 'track2', false, () => ui.h.pickTrack('track2'));
    else tcard('tr-t2', thMega, 'Mega Rush', 'Harder road · ranks S+', `${ICON.lock} Reach rank <span class="clsb" style="--cc:${CLASS_COLOR.AAA}">AAA</span>`, ICON.lock, false, true, () => ui.rankGuide());
    (['S', 'SS', 'SSS'] as RankClass[]).forEach((r, i) => {
      const key = `soon-${r}`;
      const h = 70;
      g.rr(x, y, w, h, 16, 'rgba(20,14,50,.85)', 'rgba(220,140,60,.35)');
      g.text('?', x + w - 70, y + h / 2 + 1, { size: 40, align: 'center', color: 'rgba(220,140,60,.35)', shadow: null });
      g.text(['Ocean Drive', 'Volcano Run', 'Aurora Peak'][i], x + 16, y + 24, { size: 17, italic: true, maxW: w - 120 });
      g.rich(`${ICON.lock} Reach rank <span class="clsb" style="--cc:${CLASS_COLOR[r]}">${r}</span>`, x + 16, y + 38, w - 120, { size: 11, font: 'b', color: C.muted });
      g.circle(x + w - 24, y + 24, 14, 'rgba(0,0,0,.5)', 'rgba(255,255,255,.5)');
      g.text(String(i + 3), x + w - 24, y + 24.5, { size: 13, align: 'center', noTr: true });
      g.hit(x, y, w, h, key, () => ui.toast(`${ICON.lock} Reach rank ${r} on Mega Rush to open this track`, '#e8c890'));
      y += h + 10;
    });
    return y;
  });
}

// ------------------------------------------------------------------ garage
function garage(ui: UI, g: Gfx) {
  const s = ui.save;
  pageHead(ui, g, 'GARAGE');
  if (!s) return;
  const W = g.W;
  const col = column(g);
  const skin = SKINS[Math.max(0, ui.garageIndex)];
  const vis = carVisibility(s.unlocked, skin.id);
  const top = safeTop(g) + 64;
  // car info card (top)
  const rc = RARITY_COLOR[skin.rarity ?? 'Common'];
  const ih = vis === 'dark' ? 70 : 76;
  card(g, col.x + 12, top, col.w - 24, ih, 12, 'rgba(130,175,255,.25)', 'rgba(36,20,8,.84)');
  if (vis === 'dark') {
    g.text(`??? · ${skin.rarity ?? ''}`, col.x + 24, top + 16, { size: 13, italic: true, color: rc });
    g.rich(skin.future ? `${ICON.lock} A future XWAVE car — its unlock is coming soon.` : `${ICON.lock} Reach rank <span class="clsb" style="--cc:${CLASS_COLOR[skin.need as RankClass]}">${skin.need}</span> to reveal and unlock this car. Drive farther in one run to earn EXP.`, col.x + 24, top + 28, col.w - 48, { size: 11, font: 'b', color: '#e8d4b0' });
  } else {
    g.text(`${skin.name} · ${skin.rarity ?? ''}`, col.x + 24, top + 16, { size: 13, italic: true, color: rc, maxW: col.w - 48 });
    g.text(skin.cls.split('·')[1]?.trim() ?? '', col.x + 24, top + 33, { size: 10, font: 'b', color: '#e8d4b0', maxW: col.w - 48, noTr: true });
    g.rich(`${ICON.lock} Unlocks at rank <span class="clsb" style="--cc:${CLASS_COLOR[skin.need as RankClass]}">${skin.need}</span>`, col.x + 24, top + 42, col.w - 48, { size: 11, color: '#ffe08a' });
    g.text('Every car drives the same — EXP stays fair. Cars show off your rank.', col.x + 24, top + 66, { size: 9.5, font: 'b', color: C.muted, maxW: col.w - 48 });
  }
  if (vis !== 'own') {
    const lt = skin.future ? 'COMING SOON' : vis === 'dark' ? `RANK ${skin.need} NEEDED` : 'LOCKED';
    const lw = g.measure(lt, { size: 13 }) + 52;
    const ly = g.H * 0.34;
    g.rr((W - lw) / 2, ly, lw, 36, 18, 'rgba(0,0,0,.6)', 'rgba(255,255,255,.35)');
    g.icon(ICON.lock, (W - lw) / 2 + 14, ly + 9, 18, '#fff');
    g.text(lt, (W - lw) / 2 + 38, ly + 18, { size: 13 });
  }
  // bottom: strip · selector · button
  const sb = safeBottom(g);
  let y = g.H - sb - 12 - 50;
  const owned = s.unlocked.includes(skin.id);
  const myClass = playerRank(s.expBest, s.exp2Best);
  if (!owned) button(g, 'carbtn', col.x + 12, y, col.w - 24, 50, skin.future ? `${ICON.lock} Coming soon` : `${ICON.lock} Reach rank ${skin.need}`, () => ui.rankGuide(), { style: 'purple' });
  else if (s.vehicle === skin.id) button(g, 'carbtn', col.x + 12, y, col.w - 24, 50, `${ICON.check} Selected`, () => ui.h.selectSkin(skin.id), { style: 'ghost' });
  else button(g, 'carbtn', col.x + 12, y, col.w - 24, 50, 'Select', () => ui.h.selectSkin(skin.id), { style: 'blue' });
  y -= 72;
  card(g, col.x + 12, y, col.w - 24, 62, 14, 'rgba(190,150,100,.5)', 'rgba(8,16,44,.85)');
  iconBtn(g, 'prevcar', col.x + 22, y + 11, 40, ICON.chevL, () => {
    ui.garageIndex = (ui.garageIndex + SKINS.length - 1) % SKINS.length;
    ui.h.previewSkin(SKINS[ui.garageIndex].id);
  });
  iconBtn(g, 'nextcar', col.x + col.w - 62, y + 11, 40, ICON.chevR, () => {
    ui.garageIndex = (ui.garageIndex + 1) % SKINS.length;
    ui.h.previewSkin(SKINS[ui.garageIndex].id);
  });
  g.text(vis === 'dark' ? '???' : skin.name, W / 2, y + 20, { size: 18, align: 'center', italic: true, maxW: col.w - 140, noTr: true });
  g.text(skin.cls.split('·')[0].trim(), W / 2, y + 38, { size: 10, align: 'center', font: 'b', color: C.muted, noTr: true });
  SKINS.forEach((_, i) => g.circle(W / 2 - (SKINS.length - 1) * 6 + i * 12, y + 52, 3.5, i === ui.garageIndex ? C.cyan : 'rgba(255,255,255,.25)'));
  // car strip (horizontal scroll)
  const ch = 96,
    cw = 86;
  y -= ch + 10;
  const n = SKINS.length + 1;
  const total = n * (cw + 8);
  const off = g.scroll(0, y, W, ch, 'carstrip', total + 24, true);
  g.clip(0, y - 4, W, ch + 8);
  SKINS.forEach((k, i) => {
    const x = 12 + i * (cw + 8) - off;
    const v = carVisibility(s.unlocked, k.id);
    const on = i === ui.garageIndex;
    const key = `car-${k.id}`;
    const rcol = RARITY_COLOR[k.rarity ?? 'Common'];
    g.rr(x, y, cw, ch, 12, on ? `${rcol}40` : 'rgba(46,28,12,.86)', on ? rcol : 'rgba(255,255,255,.18)', on ? 2 : 1);
    // v4.6: every car not owned yet is a black silhouette of the 3D render with a "?"
    g.img(v === 'dark' ? carShadow : carImage(k.id), x + 4, y + 6, cw - 8, 50, 'contain');
    if (v === 'dark') g.text('?', x + cw / 2, y + 30, { size: 26, align: 'center', color: '#e8c890' });
    g.text(v === 'dark' ? '???' : k.name.replace('XWAVE ', ''), x + cw / 2, y + 66, { size: 11, align: 'center', maxW: cw - 8, noTr: true });
    const rankOk = CLASSES.indexOf(myClass) >= CLASSES.indexOf((k.need ?? 'D') as RankClass);
    const label = v === 'own' ? (s.vehicle === k.id ? 'In use' : 'Owned') : k.future ? 'Coming soon' : v === 'next' ? (rankOk ? `${ICON.coin}${fmt(k.price)}` : `${ICON.lock} Rank ${k.need}`) : `Rank ${k.need}`;
    g.rich(label, x + 4, y + 74, cw - 8, { size: 9.5, align: 'center', font: 'b', color: v === 'own' ? C.green : C.muted });
    g.hit(x, y, cw, ch, key, () => {
      ui.garageIndex = i;
      ui.h.previewSkin(k.id);
    });
  });
  {
    const x = 12 + SKINS.length * (cw + 8) - off;
    g.rr(x, y, cw, ch, 12, 'rgba(46,28,12,.86)', 'rgba(255,255,255,.18)');
    g.text('+', x + cw / 2, y + 30, { size: 26, align: 'center', color: '#e8c890' });
    g.text('MORE', x + cw / 2, y + 62, { size: 11, align: 'center' });
    g.rich(['S', 'SS', 'SSS'].map((r) => `<span class="clsb" style="--cc:${CLASS_COLOR[r as RankClass]}">${r}</span>`).join(''), x + 2, y + 70, cw - 4, { size: 9, align: 'center' });
    g.hit(x, y, cw, ch, 'morecars', () => ui.toast(`${ICON.car} More cars unlock at rank S · SS · SSS on Mega Rush`, '#ff7a2e'));
  }
  g.unclip();
}

// ------------------------------------------------------------------ missions
function missions(ui: UI, g: Gfx) {
  pageBg(g);
  const s = ui.save;
  const top = pageHead(ui, g, 'MISSIONS');
  if (!s) return;
  const col = column(g);
  const x = col.x + 12,
    w = col.w - 24;
  const sb = safeBottom(g);
  button(g, 'mplay', g.W / 2 - 90, g.H - sb - 64, 180, 50, `${ICON.play} Play`, () => ui.h.play(), { style: 'gold' });
  scrollList(g, 'missions', 0, top, g.W, g.H - top - sb - 74, (y) => {
    const lv = pilotLevel(s);
    const done = Object.values(s.career?.tier ?? {}).reduce((a: number, b) => a + (b as number), 0);
    const all = CHAINS.reduce((a, c) => a + c.tiers.length, 0);
    card(g, x, y, w, 64, 14);
    g.circle(x + 34, y + 32, 22, g.lin(0, y, 0, y + 64, [[0, '#ffd84a'], [1, '#ff9a1a']]));
    g.text(String(lv), x + 34, y + 33, { size: 18, align: 'center', color: '#2a1600', shadow: null, noTr: true });
    g.text('Pilot rank', x + 66, y + 16, { size: 10, font: 'b', color: C.muted });
    g.text(`Pilot level ${lv}`, x + 66, y + 33, { size: 16, italic: true });
    g.text(`${done} / ${all} mission tiers done`, x + 66, y + 50, { size: 10, font: 'b', color: C.muted, noTr: true });
    y += 72;
    const auto = s.settings.autoClaim !== false;
    card(g, x, y, w, 52, 14);
    g.text('Auto-collect rewards', x + 14, y + 18, { size: 13 });
    g.text(auto ? 'On · rewards go straight to your wallet' : 'Off · claim each reward yourself', x + 14, y + 36, { size: 10, font: 'b', color: C.muted, maxW: w - 90 });
    toggle(g, 'autoclaim', x + w - 60, y + 13, auto, () => ui.h.toggleAutoClaim());
    y += 60;
    const pend = s.pendingMissions;
    if (pend.length) {
      g.text('Ready to claim', x + 4, y + 12, { size: 13 });
      if (pend.length > 1) button(g, 'claimall', x + w - 110, y, 110, 26, `${ICON.gift} Claim all`, () => ui.h.claimMission(-1), { style: 'gold', size: 11 });
      y += 32;
      pend.forEach((m, i) => {
        card(g, x, y, w, 44, 12, 'rgba(47,211,107,.45)');
        g.icon(ICON.check, x + 10, y + 12, 20, C.green);
        g.text(m.text, x + 38, y + 22, { size: 11, font: 'b', maxW: w - 150, noTr: true });
        button(g, `claimm-${i}`, x + w - 100, y + 8, 92, 28, `${ICON.coin}+${fmt(m.reward)}`, () => ui.h.claimMission(i), { style: 'green', size: 12 });
        y += 50;
      });
    }
    const ic: Record<string, string> = { rank: ICON.podium, flag: ICON.flag, globe: ICON.target, gate: ICON.shield, gift: ICON.gift, rocket: ICON.rocket, coin: ICON.coin, car: ICON.car, trophy: ICON.trophy, play: ICON.play };
    for (const v of activeChains(s)) {
      const k = Math.min(1, v.value / v.target);
      card(g, x, y, w, 70, 14);
      g.icon(ic[v.icon] ?? ICON.target, x + 12, y + 10, 24, C.cyan);
      g.text(v.text, x + 44, y + 22, { size: 12, font: 'b', maxW: w - 130, noTr: true });
      g.rich(`<span class="price">${ICON.coin}${fmt(v.reward)}</span>`, x + w - 90, y + 13, 80, { size: 12, align: 'right' });
      bar(g, x + 12, y + 40, w - 24, 7, k, g.lin(x, 0, x + w, 0, [[0, '#ffc848'], [1, '#d98c3a']]));
      for (let i = 0; i < v.tiers; i++) g.circle(x + 16 + i * 12, y + 58, 4, i < v.tier ? C.gold : i === v.tier ? C.cyan : 'rgba(255,255,255,.2)');
      g.text(`${fmt(v.value)} / ${fmt(v.target)}`, x + w - 12, y + 58, { size: 10, align: 'right', font: 'b', color: C.muted, noTr: true });
      y += 78;
    }
    g.rich(`Daily challenges are in ${ICON.calendar} Daily`, x, y + 4, w, { size: 11, align: 'center', font: 'b', color: C.muted });
    return y + 30;
  });
}

// ------------------------------------------------------------------ ranks
function ranks(ui: UI, g: Gfx) {
  pageBg(g);
  const b = ui.board;
  let y = pageHead(ui, g, 'TOP PILOTS');
  if (!b) return;
  const col = column(g);
  const x = col.x + 12,
    w = col.w - 24;
  ui.rowCache = [];
  // tabs
  const tw = (w - 8) / 2;
  (['week', 'all'] as const).forEach((tb, i) => {
    const on = b.tab === tb;
    const key = `rt-${tb}`;
    g.rr(x + i * (tw + 8), y, tw, 34, 17, on ? g.lin(0, y, 0, y + 34, [[0, '#3aa0ff'], [1, '#1f5fe0']]) : 'rgba(10,22,60,.8)', on ? '#fff' : 'rgba(255,255,255,.2)');
    g.text(tb === 'week' ? 'This week' : 'All time', x + i * (tw + 8) + tw / 2, y + 17, { size: 13, align: 'center' });
    g.hit(x + i * (tw + 8), y, tw, 34, key, () => ui.h.rankTab(tb));
  });
  y += 44;
  // podium
  const top3 = b.board.rows.slice(0, 3);
  const order = [top3[1], top3[0], top3[2]];
  const pw = w / 3;
  order.forEach((r, i) => {
    if (!r) return;
    const cls = r.you ? ui.myClass : classFor(r.score);
    const idx = ui.rowCache.push({ r, cls }) - 1;
    const px = x + i * pw;
    const hgt = r.rank === 1 ? 0 : 16;
    const s = r.rank === 1 ? 60 : 50;
    avatar(g, r.av ?? avatarForName(r.name), px + (pw - s) / 2, y + hgt, s, cls);
    if (r.rank === 1) g.icon(ICON.crown, px + pw / 2 - 12, y - 14, 24);
    g.text(r.name, px + pw / 2, y + hgt + s + 12, { size: 11, align: 'center', maxW: pw - 6, color: r.you ? C.gold : '#fff', noTr: true });
    g.rich(`${r.flag} <b>${fmt(r.score)}</b>`, px, y + hgt + s + 20, pw, { size: 10, align: 'center' });
    const sh = r.rank === 1 ? 26 : r.rank === 2 ? 20 : 16;
    const stc = r.rank === 1 ? '#ffc21a' : r.rank === 2 ? '#e8d4b0' : '#ff9a5c';
    g.rr(px + 8, y + 116 - sh + 18, pw - 16, sh, 6, `${stc}55`, stc);
    g.text(`#${r.rank}`, px + pw / 2, y + 116 - sh / 2 + 18, { size: 12, align: 'center', noTr: true });
    g.hit(px, y, pw, 134, `pod-${i}`, () => ui.h.viewPlayer(idx));
  });
  y += 142;
  // you (fixed bottom)
  const sb = safeBottom(g);
  const youH = 80;
  const listH = g.H - y - sb - youH - 8;
  const row = (r: any, yy: number, total = 0) => {
    const cls = r.you ? ui.myClass : classFor(r.score);
    const idx = ui.rowCache.push({ r, cls }) - 1;
    const key = `lb-${idx}`;
    const unranked = r.you && r.score <= 0;
    g.rr(x, yy, w, 50, 12, r.you ? 'rgba(255,194,26,.16)' : g.isPressed(key) ? 'rgba(255,200,90,.18)' : 'rgba(10,20,52,.72)', r.you ? C.gold : 'rgba(190,150,100,.35)');
    g.text(unranked ? '—' : `#${fmt(r.rank)}`, x + 30, yy + 21, { size: 13, align: 'center', maxW: 52, noTr: true });
    const pct = total && r.rank > 100 && !unranked ? Math.max(0.1, (r.rank / total) * 100) : 0;
    if (pct) g.text(`Top ${pct < 1 ? pct.toFixed(1) : Math.ceil(pct)}%`, x + 30, yy + 37, { size: 8.5, align: 'center', color: C.gold, noTr: true });
    g.icon(avatarSvg(r.av ?? avatarForName(r.name)), x + 60, yy + 7, 36);
    g.text(r.name + (r.you ? '  YOU' : ''), x + 104, yy + 17, { size: 12, maxW: w - 210, color: r.pass ? C.gold : '#fff', noTr: true });
    g.rich(`${r.flag} <span class="clsb" style="--cc:${CLASS_COLOR[cls]}">${cls}</span>`, x + 104, yy + 25, w - 210, { size: 11 });
    g.rich(`<b>${fmt(r.score)}</b> ${BOLT}`, x + w - 110, yy + 16, 100, { size: 12, align: 'right' });
    g.hit(x, yy, w, 50, key, () => ui.h.viewPlayer(idx));
  };
  const rest = b.board.rows.slice(3);
  scrollList(g, 'lb', 0, y, g.W, listH, (yy) => {
    for (const r of rest) {
      row(r, yy);
      yy += 56;
    }
    g.para(b.extra.replace(/<[^>]+>/g, ''), x, yy + 4, w, { size: 10, font: 'b', color: C.muted, align: 'center' });
    return yy + 40;
  });
  const yy = g.H - sb - youH;
  const you = b.board.you;
  row(you, yy, b.board.total);
  const pct = Math.max(0.1, (you.rank / b.board.total) * 100);
  g.rich(you.score <= 0 ? 'Play a run to get ranked' : b.board.next ? `Top ${pct < 1 ? pct.toFixed(1) : Math.ceil(pct)}% · EXP <b>${fmt(b.board.next.score)}</b> to reach <b>#${fmt(b.board.next.rank)}</b>` : 'You are #1!', x, yy + 56, w, { size: 11, align: 'center', font: 'b', color: C.muted });
}

// ------------------------------------------------------------------ daily
function daily(ui: UI, g: Gfx) {
  pageBg(g);
  const o = ui.daily;
  const top = pageHead(ui, g, 'DAILY');
  if (!o) return;
  const col = column(g);
  const x = col.x + 12,
    w = col.w - 24;
  scrollList(g, 'daily', 0, top, g.W, g.H - top - safeBottom(g), (y) => {
    const h0 = y;
    g.dry++;
    g.dry--;
    card(g, x, y, w, 254, 16);
    g.text('Check-in', x + 14, y + 18, { size: 15 });
    g.text(`Streak ${o.streak} / 7`, x + w - 14, y + 18, { size: 11, align: 'right', font: 'b', color: C.muted, noTr: true });
    // 4 + 3 grid
    const gw = (w - 28 - 18) / 4;
    CHECKIN.forEach((r, i) => {
      const got = i < o.slot || (o.claimedToday && i === o.slot);
      const today = i === o.slot && !o.claimedToday;
      const row = i < 4 ? 0 : 1;
      const ci = i < 4 ? i : i - 4;
      const cw = row ? (w - 28 - 12) / 3 : gw;
      const cx = x + 14 + ci * (cw + 6);
      const cy = y + 36 + row * 80;
      g.rr(cx, cy, cw, 72, 10, today ? 'rgba(255,194,26,.22)' : got ? 'rgba(47,211,107,.15)' : 'rgba(255,255,255,.05)', today ? C.gold : got ? C.green : 'rgba(255,255,255,.12)', today ? 2 : 1);
      g.text(`Day ${i + 1}`, cx + cw / 2, cy + 11, { size: 9.5, align: 'center', font: 'b', color: C.muted, noTr: true });
      const item = Object.entries(r.items ?? {}).find(([, n]) => n) as [ItemKey, number] | undefined;
      g.icon(item ? ITEM_ICON[item[0]] : ICON.coin, cx + cw / 2 - 13, cy + 20, 26);
      g.text(fmt(r.coins ?? 0), cx + cw / 2, cy + 59, { size: 12, align: 'center', noTr: true });
      if (got) g.icon(ICON.check, cx + cw - 18, cy + 4, 14, C.green);
    });
    button(g, 'checkin', x + 14, y + 200, w - 28, 44, o.claimedToday ? `${ICON.check} Come back tomorrow` : `${ICON.gift} Claim day ${o.slot + 1}`, () => ui.h.checkIn(), { style: o.claimedToday ? 'ghost' : 'gold', disabled: o.claimedToday });
    y += 264;
    const qh = 34 + o.quests.length * 62;
    card(g, x, y, w, qh, 16);
    g.text('Daily missions', x + 14, y + 18, { size: 15 });
    g.rich(`${ICON.clock} resets in ${o.resetIn}`, x + w / 2, y + 10, w / 2 - 14, { size: 10.5, align: 'right', font: 'b', color: C.muted });
    let qy = y + 34;
    for (const q of o.quests) {
      g.rr(x + 10, qy, w - 20, 56, 10, q.claimed ? 'rgba(47,211,107,.1)' : 'rgba(255,255,255,.04)', 'rgba(255,255,255,.1)');
      g.text(q.text, x + 20, qy + 16, { size: 11.5, font: 'b', maxW: w - 120, noTr: true });
      g.rich(`<span class="price">${ICON.coin}${q.coins}</span>`, x + w - 90, qy + 7, 70, { size: 12, align: 'right' });
      bar(g, x + 20, qy + 34, w - 140, 7, q.progress / q.target, C.cyan);
      g.text(`${fmt(q.progress)}/${fmt(q.target)}`, x + w - 112, qy + 38, { size: 10, font: 'b', color: C.muted, noTr: true });
      if (q.claimed) g.icon(ICON.check, x + w - 44, qy + 26, 22, C.green);
      else if (q.done) button(g, `cq-${q.id}`, x + w - 80, qy + 26, 64, 26, 'Claim', () => ui.h.claimQuest(q.id), { style: 'green', size: 12 });
      qy += 62;
    }
    void h0;
    return y + qh + 10;
  });
}

// ------------------------------------------------------------------ cups (v1 events page, kept reachable)
function events(ui: UI, g: Gfx) {
  pageBg(g);
  const o = ui.events;
  const top = pageHead(ui, g, 'CUPS');
  if (!o) return;
  const col = column(g);
  const x = col.x + 12,
    w = col.w - 24;
  scrollList(g, 'events', 0, top, g.W, g.H - top - safeBottom(g), (y) => {
    const e = o.mine;
    card(g, x, y, w, 150, 16, e.cup.color);
    g.rich(`${o.live ? '<b class="live">LIVE</b>' : '<b class="soon">NEXT</b>'} <span class="clsb" style="--cc:${CLASS_COLOR[e.division]}">${e.division}</span> ${ICON.clock} ${o.live ? `ends in <b>${fmtLeft(e.end - o.now)}</b>` : `starts <b>${localTime(e.start)}</b>`}`, x + 14, y + 10, w - 28, { size: 11 });
    g.text(e.cup.name, x + 14, y + 44, { size: 20, italic: true, noTr: true });
    g.text(`Your best ${o.best ? fmt(o.best) : '—'} · rank ${o.rank ? `#${fmt(o.rank)}` : '—'} · ${fmt(o.total)} racers`, x + 14, y + 68, { size: 11, font: 'b', color: C.muted, maxW: w - 28, noTr: true });
    if (o.live) button(g, 'racecup', x + 14, y + 90, w - 28, 46, `${ICON.play} Race now`, () => ui.h.raceCup(), { style: 'gold' });
    else button(g, 'racecup', x + 14, y + 90, w - 28, 46, `${ICON.clock} Opens ${localTime(e.start)}`, () => {}, { style: 'ghost', disabled: true });
    y += 160;
    for (const p of o.prizes) {
      card(g, x, y, w, 40, 10);
      g.text(p.label, x + 12, y + 20, { size: 12, noTr: true });
      g.rich(`${BOLT}${p.bolts} ${p.hyper ? `${ICON.hyper}×${p.hyper}` : ''} <span class="price">${ICON.coin}${fmt(p.coins)}</span>`, x + w / 2, y + 11, w / 2 - 12, { size: 12, align: 'right' });
      y += 46;
    }
    return y;
  });
}

// ------------------------------------------------------------------ shop
/**
 * v5 native shop (owner 2026-10-24: ads only, no TikTok Beans products): the top is always the
 * coins → specials exchange (v4.6), your items open the exchange popup, free coins by rewarded ad.
 */
function shop(ui: UI, g: Gfx) {
  pageBg(g);
  const s = ui.save;
  const top = pageHead(ui, g, 'SHOP');
  if (!s) return;
  const col = column(g);
  const x = col.x + 12,
    w = col.w - 24;
  const openExchange = () => {
    ui.buySync(s);
    ui.showOverlay('bagbuy');
  };
  scrollList(g, 'shop', 0, top, g.W, g.H - top - safeBottom(g), (y) => {
    // ---- your items (tap → exchange popup)
    card(g, x, y, w, 50, 14);
    g.text('Your items', x + 14, y + 25, { size: 12, font: 'b', color: C.muted });
    let ix = x + 100;
    for (const k of SPECIALS) {
      g.hit(ix - 4, y + 6, 66, 38, `shop-inv-${k}`, openExchange);
      g.icon(ITEM_ICON[k], ix, y + 13, 24);
      g.text(`×${s.items[k]}`, ix + 27, y + 25, { size: 13, noTr: true });
      ix += 70;
    }
    y += 58;
    // ---- exchange coins → specials (always at the top, v4.6)
    const flash = g.time - ui.shopFlashT < 900 ? 0.5 + 0.5 * Math.sin((g.time - ui.shopFlashT) / 60) : 0;
    const eh = 132;
    card(g, x, y, w, eh, 16, flash ? `rgba(255,210,74,${0.5 + 0.5 * flash})` : 'rgba(155,107,255,.55)');
    g.text('Exchange coins → specials', x + 14, y + 22, { size: 14 });
    g.rich(`${ICON.coin}<b>${fmt(s.wallet)}</b>`, x + w / 2, y + 12, w / 2 - 14, { size: 13, align: 'right' });
    const gap = 8;
    const bw = (w - 28 - gap * (SPECIALS.length - 1)) / SPECIALS.length;
    SPECIALS.forEach((k, i) => {
      const bx = x + 14 + i * (bw + gap),
        by = y + 38;
      const short = s.wallet < ITEM_PRICE[k];
      card(g, bx, by, bw, 82, 12, short ? 'rgba(255,255,255,.12)' : 'rgba(79,195,255,.45)', 'rgba(36,20,8,.74)');
      g.icon(ITEM_ICON[k], bx + bw / 2 - 15, by + 6, 30);
      g.text(SPECIAL_SHORT[k], bx + bw / 2, by + 48, { size: 11, align: 'center', maxW: bw - 6 });
      g.rich(`${ICON.coin}${fmt(ITEM_PRICE[k])}`, bx + 2, by + 58, bw - 4, { size: 11, align: 'center', color: short ? C.muted : '#ffd24a' });
      g.hit(bx, by, bw, 82, `sbuy-${k}`, () => ui.h.buySpecial(k));
    });
    y += eh + 12;
    // ---- free coins (rewarded ad) — only while the platform has ads
    if (hs.hasAds()) {
      const h = 58;
      card(g, x, y, w, h, 14, 'rgba(47,211,107,.55)');
      g.icon(ICON.play, x + 14, y + 15, 28, C.green);
      g.text('Free coins', x + 52, y + 23, { size: 14 });
      g.text('Watch an ad', x + 52, y + 41, { size: 10.5, font: 'b', color: C.muted });
      button(g, 'shop-free', x + w - 116, y + 11, 104, 36, `${ICON.play} Watch`, () => ui.h.freePop(), { style: 'green', size: 13 });
      y += h + 12;
    }
    g.para('Earn coins by racing, the daily check-in and missions.', x + 10, y + 4, w - 20, { size: 11.5, font: 'b', color: C.muted, align: 'center' });
    y += 34;
    button(g, 'shop-bag', x, y, w, 46, `${BAG_ICON} Open the Magic Bag`, () => ui.h.bag(), { style: 'purple' });
    return y + 56;
  });
}

// ------------------------------------------------------------------ countdown / tutorial
function countdown(ui: UI, g: Gfx) {
  const k = Math.min(1, (g.time - ui.countT) / 600);
  const s = 1.6 - 0.6 * (1 - Math.pow(1 - k, 3));
  g.alpha(1 - Math.max(0, (g.time - ui.countT - 700) / 400));
  g.ctx.save();
  g.ctx.translate(g.W / 2, g.H * 0.4);
  g.ctx.scale(s, s);
  g.text(ui.count, 0, 0, { size: 72, align: 'center', italic: true, color: ui.count === 'GO!' ? C.gold : '#fff', stroke: 'rgba(0,0,0,.5)', strokeW: 6 });
  g.ctx.restore();
  g.alpha(1);
}

function tutprompt(ui: UI, g: Gfx) {
  const st = ui.tut;
  if (!st) return;
  const W = g.W;
  const shake = g.time - ui.tutWrongT < 400 ? Math.sin((g.time - ui.tutWrongT) / 30) * 6 : 0;
  const w = Math.min(300, W - 40);
  const x = (W - w) / 2 + shake,
    y = Math.max(safeTop(g) + 150, ui.hudSpecialBottom + 10); // v4.6: below the special button
  g.rr(x, y, w, 150, 18, 'rgba(8,16,44,.88)', C.cyan, 1.5);
  g.text(`STEP ${st.index + 1} / ${st.total}`, W / 2 + shake, y + 16, { size: 10, align: 'center', color: C.cyan, noTr: true });
  // gesture
  const rot: Record<string, number> = { right: 0, down: 90, left: 180, up: 270 };
  const t = (g.time % 1200) / 1200;
  if (st.need in rot) {
    const r = (rot[st.need] * Math.PI) / 180;
    const dx = Math.cos(r) * (t * 50 - 25),
      dy = Math.sin(r) * (t * 50 - 25);
    g.icon(`<svg viewBox="0 0 24 24"><g transform="rotate(${rot[st.need]} 12 12)"><path d="M5 12h12M12 6l6 6-6 6" fill="none" stroke="#ffc21a" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></g></svg>`, W / 2 - 20 + shake, y + 28, 40);
    g.icon(ICON.hand, W / 2 - 14 + dx + shake, y + 40 + dy, 28);
  } else g.icon(st.need === 'sos' ? ICON.sos : ICON.rocket, W / 2 - 20 + shake, y + 28, 40);
  g.text(st.title, W / 2 + shake, y + 92, { size: 20, align: 'center', italic: true, maxW: w - 20, noTr: true });
  g.para(st.sub, x + 14, y + 106, w - 28, { size: 11.5, font: 'b', color: '#f0dcb4', align: 'center', noTr: true });
}

function swipeHint(g: Gfx) {
  const t = (g.time % 1400) / 1400;
  const y = g.H * 0.62;
  g.icon(ICON.hand, g.W / 2 - 20 + Math.sin(t * Math.PI * 2) * 50, y, 40);
  g.text('SWIPE TO DODGE', g.W / 2, y + 60, { size: 18, align: 'center', italic: true, stroke: 'rgba(0,0,0,.5)', strokeW: 4 });
  g.text('← → change lane · ↑ fly up · ↓ fly down', g.W / 2, y + 84, { size: 11, align: 'center', font: 'b' });
}

export { panel, SPECIAL_SHORT, BAG_ICON, avatar };
