/**
 * v1.0.5 Western pilot avatars (pure SVG strings, no images, no DOM): a bronze studded medallion with a
 * leather-coloured face and a cream Western emblem. 16 emblems × 2 colour schemes = 32 avatars (the old
 * count, so saved avatar indices stay valid).
 */

/** [face light, face dark, face highlight] — muted saddle / desert colours */
const FACES: [string, string, string][] = [
  ['#b8532c', '#4a170a', '#e89a6a'], // rust
  ['#2f8a83', '#0c3431', '#86d2c4'], // turquoise
  ['#6f8a3a', '#23320d', '#bcd68a'], // sage
  ['#3f5f92', '#132240', '#9db8e2'], // denim
  ['#84405c', '#2e0f20', '#d49ab6'], // plum
  ['#a8743a', '#43260b', '#e8c08a'], // saddle tan
  ['#504843', '#161210', '#a69c94'], // charcoal
  ['#c48f2c', '#4f3205', '#f6d888'], // brass
];

const F = '#f8e8c4'; // emblem cream
const D = '#2a1406'; // emblem dark details

/** 6-point sheriff star with ball tips */
function sheriffStar() {
  const pts: string[] = [];
  const balls: string[] = [];
  for (let i = 0; i < 12; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 6;
    const r = i % 2 ? 11 : 21;
    const x = 32 + Math.cos(a) * r;
    const y = 32 + Math.sin(a) * r;
    pts.push(`${x.toFixed(1)} ${y.toFixed(1)}`);
    if (!(i % 2)) balls.push(`<circle cx="${(32 + Math.cos(a) * 22.5).toFixed(1)}" cy="${(32 + Math.sin(a) * 22.5).toFixed(1)}" r="3.4" fill="${F}"/>`);
  }
  return `<path d="M${pts.join('L')}Z" fill="${F}"/>${balls.join('')}<circle cx="32" cy="32" r="6.5" fill="none" stroke="${D}" stroke-opacity=".55" stroke-width="2"/>`;
}

/** wagon wheel */
function wheel() {
  const spokes = Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4;
    return `M${(32 + Math.cos(a) * 6).toFixed(1)} ${(32 + Math.sin(a) * 6).toFixed(1)}L${(32 + Math.cos(a) * 19).toFixed(1)} ${(32 + Math.sin(a) * 19).toFixed(1)}`;
  }).join('');
  return `<circle cx="32" cy="32" r="20" fill="none" stroke="${F}" stroke-width="5"/><path d="${spokes}" stroke="${F}" stroke-width="3.2" stroke-linecap="round"/><circle cx="32" cy="32" r="6.5" fill="${F}"/><circle cx="32" cy="32" r="2.4" fill="${D}" opacity=".5"/>`;
}

/** spur rowel (a star wheel) */
function rowel(cx: number, cy: number, r: number) {
  const p: string[] = [];
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8;
    const k = i % 2 ? r * 0.45 : r;
    p.push(`${(cx + Math.cos(a) * k).toFixed(1)} ${(cy + Math.sin(a) * k).toFixed(1)}`);
  }
  return `<path d="M${p.join('L')}Z" fill="${F}"/><circle cx="${cx}" cy="${cy}" r="${(r * 0.22).toFixed(1)}" fill="${D}" opacity=".5"/>`;
}

/** emblems in a 64×64 box, centred on 32,32 */
export const WESTERN_EMBLEMS: string[] = [
  // cowboy hat
  `<path d="M6 39c7 6 16 9 26 9s19-3 26-9c-4 .5-8 1-11.5 1L44 22c-1-5-4-7-8-5.5L32 18l-4-1.5c-4-1.5-7 .5-8 5.5L17.5 40C14 40 10 39.5 6 39z" fill="${F}"/><path d="M18.6 33.5c8 2.2 18.8 2.2 26.8 0l-.7 4.6c-7.8 2-17.6 2-25.4 0z" fill="${D}" opacity=".55"/>`,
  // sheriff star
  sheriffStar(),
  // horseshoe (lucky side up) with nail holes
  `<path d="M19 13v17a13 13 0 0 0 26 0V13" fill="none" stroke="${F}" stroke-width="9"/><path d="M15 11h8M41 11h8" stroke="${F}" stroke-width="5" stroke-linecap="round"/><g fill="${D}" opacity=".55"><circle cx="19" cy="20" r="1.6"/><circle cx="19" cy="29" r="1.6"/><circle cx="45" cy="20" r="1.6"/><circle cx="45" cy="29" r="1.6"/><circle cx="24.5" cy="38.5" r="1.6"/><circle cx="39.5" cy="38.5" r="1.6"/></g>`,
  // saguaro cactus
  `<path d="M28 54V16a4 4 0 0 1 8 0v20h4.5V25a3.5 3.5 0 0 1 7 0v13a5 5 0 0 1-5 5H36v11zM28 40h-6.5a5 5 0 0 1-5-5V27a3.5 3.5 0 0 1 7 0v6.5H28z" fill="${F}"/><path d="M16 55h32" stroke="${F}" stroke-width="3" stroke-linecap="round"/><path d="M32 18v34" stroke="${D}" stroke-opacity=".3" stroke-width="1.4"/>`,
  // bull skull
  `<path d="M6 18c4 6 10 8 16 7M58 18c-4 6-10 8-16 7" fill="none" stroke="${F}" stroke-width="5" stroke-linecap="round"/><path d="M20 22c4-3 20-3 24 0 2 6 1 13-3 18l-2 12c-1 3-3 4-7 4s-6-1-7-4l-2-12c-4-5-5-12-3-18z" fill="${F}"/><g fill="${D}" opacity=".6"><ellipse cx="25.5" cy="32" rx="3.6" ry="4.4"/><ellipse cx="38.5" cy="32" rx="3.6" ry="4.4"/><circle cx="29.5" cy="49" r="1.6"/><circle cx="34.5" cy="49" r="1.6"/></g>`,
  // wagon wheel
  wheel(),
  // cowboy boot with spur
  `<path d="M22 8h15l-1 25c4 2 9 3 13 5 4 2 5 6 4 10H18c-1-5 1-9 3-12z" fill="${F}"/><path d="M22 14h15" stroke="${D}" stroke-opacity=".45" stroke-width="2.4"/><path d="M24 22c3 2 7 2 10 0" stroke="${D}" stroke-opacity=".35" stroke-width="1.8" fill="none"/><rect x="17" y="47.5" width="12" height="5" rx="1.5" fill="${F}"/>${rowel(13, 44, 6)}`,
  // lasso
  `<ellipse cx="32" cy="26" rx="20" ry="13" fill="none" stroke="${F}" stroke-width="4.6"/><ellipse cx="32" cy="26" rx="20" ry="13" fill="none" stroke="${D}" stroke-opacity=".35" stroke-width="1.4" stroke-dasharray="3 4"/><path d="M19 36c-3 6-2 12 4 15 5 2 9 0 11 4" fill="none" stroke="${F}" stroke-width="4.2" stroke-linecap="round"/>`,
  // campfire
  `<path d="M32 9c3 7 11 11 11 21a11 11 0 0 1-22 0c0-6 3-8 5-12 1 4 3 6 4 7-1-6 0-11 2-16z" fill="${F}"/><path d="M32 29c2 3 5 5 5 9a5 5 0 0 1-10 0c0-3 3-5 5-9z" fill="${D}" opacity=".35"/><path d="M12 50l40-8M12 42l40 8" stroke="${F}" stroke-width="5.5" stroke-linecap="round"/>`,
  // mesa and sun
  `<circle cx="32" cy="27" r="10" fill="${F}"/><path d="M32 11v-4M45 15l3-3M19 15l-3-3M50 27h4M10 27h4" stroke="${F}" stroke-width="2.8" stroke-linecap="round"/><path d="M4 50l7-11h7l3-6h15l3 6h9l7 11z" fill="${F}"/><path d="M4 50l7-11h7l3-6h15l3 6h9l7 11z" fill="${D}" opacity=".25"/><path d="M8 54h48" stroke="${F}" stroke-width="3" stroke-linecap="round"/>`,
  // feather
  `<path d="M44 8C30 12 20 26 18 44l-4 12 3 1 4-11c16-2 28-14 30-30-3 3-6 4-9 4 3-3 4-7 2-12z" fill="${F}"/><path d="M41 15C33 24 26 34 20 48" stroke="${D}" stroke-opacity=".45" stroke-width="2" fill="none" stroke-linecap="round"/>`,
  // lantern
  `<path d="M26 10a6 6 0 0 1 12 0" fill="none" stroke="${F}" stroke-width="3"/><rect x="23" y="13" width="18" height="5" rx="2" fill="${F}"/><path d="M24 18h16l3 26H21z" fill="${F}"/><path d="M28 22h8l1.5 18h-11z" fill="${D}" opacity=".35"/><path d="M32 26c2 3 3 5 3 7a3 3 0 0 1-6 0c0-2 1-4 3-7z" fill="${F}"/><rect x="19" y="44" width="26" height="6" rx="2" fill="${F}"/>`,
  // cowboy (hat, face, bandana)
  `<path d="M8 25c6 4 15 6 24 6s18-2 24-6c-3 .3-7 .6-10 .6L44 12c-1-4-3-5-6-4l-6 2-6-2c-3-1-5 0-6 4l-2 13.6c-3 0-7-.3-10-.6z" fill="${F}"/><path d="M21 31c0 9 5 15 11 15s11-6 11-15z" fill="${F}"/><path d="M15 58c1-8 6-12 12-13l5 6 5-6c6 1 11 5 12 13z" fill="${F}"/><path d="M21 41c4 4 18 4 22 0l-4 9-7 5-7-5z" fill="${D}" opacity=".5"/>`,
  // horse head
  `<path d="M26 8l4 7c9 0 16 6 19 14l5 14c1 3-1 6-4 6-3 1-5-1-7-4l-5-6c-2 2-4 4-4 8l1 11H19c0-12 2-21 6-28-3-2-4-6-3-9z" fill="${F}"/><path d="M26 15c-4 4-6 10-6 16" stroke="${D}" stroke-opacity=".4" stroke-width="2.4" fill="none" stroke-linecap="round"/><circle cx="37" cy="24" r="2.2" fill="${D}" opacity=".7"/><circle cx="48.5" cy="43" r="1.6" fill="${D}" opacity=".6"/>`,
  // ace of spades card
  `<rect x="15" y="8" width="34" height="48" rx="4" fill="${F}" transform="rotate(-8 32 32)"/><path d="M32 20c4 6 11 9 11 15a5.5 5.5 0 0 1-9.5 3.8L35 46h-6l1.5-7.2A5.5 5.5 0 0 1 21 35c0-6 7-9 11-15z" fill="${D}" opacity=".75" transform="rotate(-8 32 32)"/>`,
  // spur
  `<path d="M8 26c8-6 22-7 30-2l6 6" fill="none" stroke="${F}" stroke-width="5" stroke-linecap="round"/><path d="M8 26c3 8 10 12 18 12" fill="none" stroke="${F}" stroke-width="4" stroke-linecap="round"/><path d="M40 28l6 8" stroke="${F}" stroke-width="3.5"/>${rowel(48, 40, 11)}`,
];

export const WESTERN_AVATAR_COUNT = 32;

let uid = 0;
/** one medallion; every avatar gets its own gradient / filter ids (a shared id in a hidden screen draws empty) */
export function westernAvatarSvg(i: number) {
  const n = WESTERN_EMBLEMS.length;
  const k = ((i % WESTERN_AVATAR_COUNT) + WESTERN_AVATAR_COUNT) % WESTERN_AVATAR_COUNT;
  const emblem = WESTERN_EMBLEMS[k % n];
  const [c1, c2, hi] = FACES[(k + Math.floor(k / n) * 3) % FACES.length];
  const id = `wa${k}_${(uid = (uid + 1) % 1e9).toString(36)}`;
  const studs = Array.from({ length: 12 }, (_, j) => {
    const a = (j * Math.PI) / 6 + Math.PI / 12;
    return `<circle cx="${(32 + Math.cos(a) * 28.2).toFixed(2)}" cy="${(32 + Math.sin(a) * 28.2).toFixed(2)}" r="1.25"/>`;
  }).join('');
  return `<svg viewBox="0 0 64 64" class="avsvg wav" aria-hidden="true"><defs>
    <linearGradient id="${id}r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f0cf92"/><stop offset=".5" stop-color="#b07a40"/><stop offset="1" stop-color="#5e3614"/></linearGradient>
    <radialGradient id="${id}f" cx="38%" cy="30%" r="80%"><stop offset="0" stop-color="${hi}"/><stop offset=".5" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></radialGradient>
    <filter id="${id}s" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="1.4" stdDeviation="1" flood-color="#1a0a02" flood-opacity=".6"/></filter></defs>
    <circle cx="32" cy="32" r="31.5" fill="#2a1406"/>
    <circle cx="32" cy="32" r="30" fill="url(#${id}r)"/>
    <g fill="#3a1e08" opacity=".8">${studs}</g>
    <circle cx="32" cy="32" r="25.2" fill="#2a1406"/>
    <circle cx="32" cy="32" r="24" fill="url(#${id}f)"/>
    <path d="M13 24a21 21 0 0 1 38 0" fill="none" stroke="#fff" stroke-opacity=".14" stroke-width="4" stroke-linecap="round"/>
    <g filter="url(#${id}s)" transform="translate(32 32) scale(.74) translate(-32 -32)">${emblem}</g></svg>`;
}
