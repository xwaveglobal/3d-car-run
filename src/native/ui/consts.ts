/** v3 native UI — shared icons / names (mirrors the DOM UI's constants) */
import { ICON } from '../../ui/icons.ts';
import type { ItemKey, SpecialKey } from '../../meta/Daily.ts';
import { XPT } from '../../meta/Rank.ts';
import { ITEM_NAME_W, SPECIAL_HOW_W, SPECIAL_LINE_W, SPECIAL_SHORT_W } from '../../western/items.ts';

export const BAG_ICON = `<svg viewBox="0 0 24 24"><defs><linearGradient id="sbL" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c98a4a"/><stop offset="1" stop-color="#7a4520"/></linearGradient><linearGradient id="sbF" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b8743a"/><stop offset="1" stop-color="#8a4e22"/></linearGradient></defs><path d="M8.6 7.4V4.6c0-.8.6-1.3 1.3-1.3h4.2c.7 0 1.3.5 1.3 1.3v2.8" fill="none" stroke="#3a1c06" stroke-width="1.6"/><rect x="3.3" y="7" width="17.4" height="13.8" rx="3" fill="url(#sbL)" stroke="#3a1c06" stroke-width="1.1"/><rect x="5" y="15.2" width="14" height="4" rx="1.6" fill="none" stroke="#f3d29a" stroke-width=".55" stroke-dasharray="1 .9" opacity=".8"/><path d="M3.3 10c0-1.7 1.3-3 3-3h11.4c1.7 0 3 1.3 3 3v2.6c-2.6 1.6-5.4 2.4-8.7 2.4s-6.1-.8-8.7-2.4z" fill="url(#sbF)" stroke="#3a1c06" stroke-width="1.1" stroke-linejoin="round"/><path d="M12 8.1l.75 1.5 1.65.24-1.2 1.17.28 1.64L12 11.9l-1.48.77.28-1.64-1.2-1.17 1.65-.24z" fill="#ffd23d" stroke="#7a4a00" stroke-width=".35"/><rect x="10.1" y="13.1" width="3.8" height="3.4" rx=".7" fill="none" stroke="#ffd23d" stroke-width="1.1"/><path d="M12 13.1v3.4" stroke="#ffd23d" stroke-width=".8"/></svg>`; // v4.0.2: Western leather saddlebag (was a purple magic pouch)
export const TUT_ICON = `<svg viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/><path d="M10.2 8.3a2 2 0 1 1 2.6 1.9c-.5.2-.8.6-.8 1.1v.6"/><path d="M12 14.4h.01"/></g></svg>`;
export const ROCKET_W = `<svg viewBox="0 0 24 24"><path d="M14.8 3.2c2.9-.6 5.4-.4 6 .2.6.6.8 3.1.2 6-.6 3-2.6 5.8-5.3 7.7l.3 2.6-2.6 2-1.1-3.2-3.6-3.6-3.2-1.1 2-2.6 2.6.3C11 8.8 11.8 3.8 14.8 3.2z" fill="#fff"/><circle cx="16" cy="8" r="1.8" fill="#2c4a9a"/><path d="M6.5 14.8c-1.6.4-2.8 2.4-3 5.7 3.3-.2 5.3-1.4 5.7-3z" fill="#ffd27a"/></svg>`;
/** v4.0.2: the Launch rocket in the Western palette (Home perk button) */
export const ROCKET_G = `<svg viewBox="0 0 24 24"><path d="M14.8 3.2c2.9-.6 5.4-.4 6 .2.6.6.8 3.1.2 6-.6 3-2.6 5.8-5.3 7.7l.3 2.6-2.6 2-1.1-3.2-3.6-3.6-3.2-1.1 2-2.6 2.6.3C11 8.8 11.8 3.8 14.8 3.2z" fill="#ffe3a0"/><circle cx="16" cy="8" r="1.8" fill="#6a3a12"/><path d="M6.5 14.8c-1.6.4-2.8 2.4-3 5.7 3.3-.2 5.3-1.4 5.7-3z" fill="#f2a83a"/></svg>`;
export const CAR_LINE = `<svg viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M4 13.5 5.8 8.6A2 2 0 0 1 7.7 7.3h8.6a2 2 0 0 1 1.9 1.3l1.8 4.9"/><rect x="2.8" y="13" width="18.4" height="5.2" rx="1.8"/><path d="M5.2 18.2v1.6M18.8 18.2v1.6"/></g><circle cx="7" cy="15.6" r="1.1" fill="currentColor"/><circle cx="17" cy="15.6" r="1.1" fill="currentColor"/></svg>`;
export const ARROW = (deg: number) => `<svg viewBox="0 0 24 24"><g transform="rotate(${deg} 12 12)"><path d="M5 12h12M12 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></g></svg>`;
export const CHEV = (deg: number) => `<svg viewBox="0 0 24 24"><g transform="rotate(${deg} 12 12)"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></g></svg>`;
export const WIFI = `<svg viewBox="0 0 24 24"><path d="M2 8.5a15 15 0 0 1 20 0M5.5 12a10 10 0 0 1 13 0M9 15.5a5 5 0 0 1 6 0" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="19" r="1.6" fill="#fff"/></svg>`;
export const BOLT = XPT;

export const ITEM_ICON: Record<ItemKey, string> = { super: ICON.rocket, hyper: ICON.hyper, shield: ICON.shield, escape: ICON.sos, turbo: ICON.bolt, magnet: ICON.magnet, double: ICON.x2, life: ICON.heart };
export const ITEM_NAME: Record<ItemKey, string> = { ...ITEM_NAME_W };
export const SPECIAL_LINE: Record<SpecialKey, string> = { ...SPECIAL_LINE_W };
export const SPECIAL_SHORT: Record<SpecialKey, string> = { ...SPECIAL_SHORT_W };
export const SPECIAL_HOW: Record<SpecialKey, string> = { ...SPECIAL_HOW_W };
export const SPECIAL_COLOR: Record<SpecialKey, string> = { escape: '#e0502a', super: '#d98c22', hyper: '#ffc848' };
export const BOOST_WHAT: Record<ItemKey, string> = {
  super: 'A rocket hop that clears two rows of obstacles at once.',
  hyper: 'The mythic jump: 7.4 m high, a double roll and a golden trail.',
  escape: 'Emergency rocket straight up: you cruise safely above the road, then glide back down.',
  shield: 'Start the run inside a shield bubble that absorbs one hit.',
  turbo: 'Start the run with a Turbo Boost.',
  magnet: 'Start with the Coin Magnet active.',
  double: 'Double EXP: every metre counts twice while it lasts.',
  life: 'Start the run with one extra life.',
};
export const BONUS_COLOR: Record<string, string> = { desert: '#ff9a3c', forest: '#3dbf6a', country: '#e8c040', sea: '#2fb6ff' };
export const BONUS_EMOJI: Record<string, string> = { desert: '🌵', forest: '🌲', country: '🌾', sea: '🌊' };
export const RARITY_COLOR: Record<string, string> = { Common: '#4fb3ff', Rare: '#d98c3a', Epic: '#ffc24a', Legendary: '#ff4a3c', Mythic: '#d04dff', Ultimate: '#7dfff2' };
export const LOCKED_ICON: Record<string, string> = {
  tunnel: `<svg viewBox="0 0 24 24"><path d="M3 20V12a9 9 0 0 1 18 0v8" fill="none" stroke="#ffd27a" stroke-width="2"/><path d="M7 20v-7a5 5 0 0 1 10 0v7" fill="none" stroke="#ffd27a" stroke-width="1.4" opacity=".6"/><rect x="8.5" y="1.6" width="7" height="3.4" rx="1.2" fill="#fff"/></svg>`,
  wall: `<svg viewBox="0 0 24 24"><path d="M3 3v18M6 3v18" stroke="#c86a2a" stroke-width="2"/><path d="M9 16l6-4-6-4" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 16l6-4-6-4" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity=".55"/></svg>`,
  ghost: `<svg viewBox="0 0 24 24"><path d="M5 21V11a7 7 0 0 1 14 0v10l-2.4-1.8L14.3 21 12 19.2 9.7 21l-2.3-1.8z" fill="#f0dcb4" fill-opacity=".85"/><circle cx="9.5" cy="11" r="1.3" fill="#1b1450"/><circle cx="14.5" cy="11" r="1.3" fill="#1b1450"/></svg>`,
  rail: `<svg viewBox="0 0 24 24"><path d="M2 6h20" stroke="#ffc21a" stroke-width="2.2" stroke-linecap="round"/><path d="M12 6v5" stroke="#fff" stroke-width="1.6"/><rect x="7" y="11" width="10" height="5" rx="2" fill="#fff"/><path d="M3 20l4-3M21 20l-4-3" stroke="#ffc21a" stroke-width="1.4" opacity=".6"/></svg>`,
};
export { ICON };
