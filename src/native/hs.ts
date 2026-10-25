/**
 * 3D Car Run v4.0 native — the HS SDK kit (hs-sdk/, kit 3.2.4 · SDK 1.1.3), carried over from the Sky Roadster
 * v5 native layer (same v4.6.1 base).
 *
 * Owner's answers (2026-10-25): branch v4.0 · a NEW TikTok app / HS game (ids come later — empty = offline
 * draft) · SAVE local · the 5 ad places of Sky Roadster v5 (ad unit ids come later) · ads only, no shop
 * (HS rule 13). `no_ads` stays a profile field (harmless; nothing sells it).
 *
 * Rules kept here (INTEGRATE-WITH-AI.md):
 *  - ALL progress lives in ONE HSGame.profile (save: 'local'); the game's SaveData is stored in it
 *    (numbers rewards can add to are top-level fields: coins, super, hyper, escape, no_ads).
 *  - keys / places are written as literals in the calls below (hs-check reads them from game.js).
 *  - TikTok-only buttons are drawn only while HSGame.has('<feature>') is true.
 *  - never tt.login / ads / share / pay directly — only through HSGame.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { perkVisible, type PerkKind, type PerkState } from '../meta/Perks.ts';

declare const require: (p: string) => any;

declare const GameGlobal: any;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const hsModule = require('./hs-game.js');
/** the kit also sets GameGlobal.HSGame (used when a loader hands back an empty module object) */
const HSGame = hsModule && typeof hsModule.profile === 'function' ? hsModule : (typeof GameGlobal !== 'undefined' ? GameGlobal : globalThis as any).HSGame;

/** HS credentials: Game ID = the TikTok App ID; SDK key from the HS dashboard (never the TikTok Client Secret). */
// 3D Car Run's own TikTok app (App ID 7700006034421647378) and its HS game's SDK key (public by design — the TikTok
// Client Secret is never in the game)
const GAME_ID = '7700006034421647378';
const SDK_KEY = 'sk_live_b3eb164f781d940a4e6e3b3a95590fda8f63b6daa2866b4ff86dfae27cd2918d';

/**
 * What each moment gives (offline defaults; the HS dashboard overrides them, no new build).
 * Items are number fields of the profile below.
 */
export const DEFAULTS = {
  rewards: {
    share: { coins: 300, $limit: 'daily' },
    tiktok_profile: { coins: 300 },
    tiktok_shortcut: { coins: 300 },
  } as Record<string, Record<string, number | string>>,
  items: {
    coins: { category: 'currency', name: 'Coins' },
    super: { category: 'consumable', name: 'Canyon Launcher' },
    hyper: { category: 'consumable', name: 'Eagle Jump' },
    escape: { category: 'consumable', name: 'Last Stand' },
    no_ads: { category: 'unlock', name: 'No Ads' },
  } as Record<string, { category: string; name: string }>,
};

/** the ONE profile: numbers rewards can add to + the rest of the save in `game` */
export const profile = HSGame.profile(
  {
    coins: 0,
    super: 0,
    hyper: 0,
    escape: 0,
    no_ads: 0,
    exp_best: 0,
    exp2_best: 0,
    game: null as unknown,
    /** small non-progress data (local boards, flags) — src/core/kv.ts */
    kv: {} as Record<string, string>,
  },
  {
    save: 'local',
    merge: { exp_best: 'max', exp2_best: 'max', no_ads: 'max' },
    summary: 'exp_best',
  },
);

let started = false;
/** v3.0.11: start() finished either way (offline too) — reward buttons wait for this, never flash */
let settled = false;
export const hsReady: Promise<void> = HSGame.start({ gameId: GAME_ID, sdkKey: SDK_KEY, defaults: DEFAULTS })
  .then(() => {
    started = true;
  })
  .catch((e: unknown) => {
    console.warn('[hs] offline:', e);
  })
  .finally(() => {
    settled = true;
  });

export const hs = {
  get started() {
    return started;
  },
  /** is a platform feature on here, now? — ask every time a button is drawn */
  hasShare: () => {
    const root: any = typeof GameGlobal !== 'undefined' ? GameGlobal : globalThis;
    return root.HSGame ? !!root.HSGame.has('share') : !!HSGame.has('share'); // literal for hs-check after minify
  },
  hasAds: () => !!HSGame.has('ads'),
  hasMissions: () => !!HSGame.has('tiktok_missions'),
  /** v4.0.2: why the last ad did not play (HSGame.lastAdError: 'not configured', 'unavailable', 'busy', …) */
  adError: (): string => String((HSGame as unknown as { lastAdError?: string }).lastAdError ?? ''),
  /** one line for the hidden test info: is each ad place ready right now */
  adLine(): string {
    const m = (ok: unknown) => (ok ? '✓' : '✗');
    return `ads ${HSGame.has('ads') ? 'on' : 'OFF'} · life ${m(HSGame.canShowAd('car_run-life'))} end ${m(HSGame.canShowAd('car_run-end'))} free ${m(HSGame.canShowAd('car_run-free-coin'))} int ${m(HSGame.canShowAd('car-run-int'))} · last: ${hs.adError() || '-'}`;
  },

  // ---- ad places (no reward entry: watching lets the game go on / pays the game's own amount)
  canShowAd(place: string): boolean {
    switch (place) {
      case 'continue':
        return !!HSGame.canShowAd('car_run-life');
      case 'double_coins':
        return !!HSGame.canShowAd('car_run-end');
      case 'free_coins':
        return !!HSGame.canShowAd('car_run-free-coin');
      case 'head_start':
        return false; // v4.0.2 (owner): the Head Start ad is gone
      default:
        return !!HSGame.canShowAd('car-run-int');
    }
  },
  /** resolves true when the ad was watched to the end */
  async rewarded(place: string): Promise<boolean> {
    let r: unknown = null;
    switch (place) {
      case 'continue':
        r = await HSGame.showAd('car_run-life');
        break;
      case 'double_coins':
        r = await HSGame.showAd('car_run-end');
        break;
      case 'free_coins':
        r = await HSGame.showAd('car_run-free-coin');
        break;
      default:
        r = null; // (head_start: removed in v4.0.2)
    }
    const ok = r !== null && r !== undefined;
    if (!ok) console.warn(`[ads] ${place}: no ad (${hs.adError() || 'no reason'})`);
    return ok;
  },
  /** v4.0.2: package files (the car model) — TikTok Minis has a file system; the Android app's web tt reads by fetch */
  packageReader(): ((path: string) => Promise<ArrayBuffer>) | null {
    if (HSGame.platform !== 'minis') return null;
    const G: any = typeof GameGlobal !== 'undefined' ? GameGlobal : globalThis;
    const fs = G.tt && typeof G.tt.getFileSystemManager === 'function' ? G.tt.getFileSystemManager() : null;
    if (!fs) return null;
    return async (path: string) => {
      // package paths: relative first, then the ./ and / spellings some runtimes want
      let last: unknown = null;
      for (const p of [path, `./${path}`, `/${path}`]) {
        try {
          const data = await new Promise<ArrayBuffer>((res, rej) => fs.readFile({ filePath: p, success: (r: { data: ArrayBuffer }) => res(r.data), fail: rej }));
          if (data && data.byteLength) return data;
        } catch (e) {
          last = e;
        }
      }
      throw last ?? new Error('empty file');
    };
  },
  async interstitial(): Promise<void> {
    await HSGame.showAd('car-run-int');
  },

  // ---- share (reward of key "share", once a day, added to the profile by HSGame)
  async share(title: string, subtitle: string, imageUrl?: string): Promise<'shared' | 'none'> {
    const args = { title, subtitle, ...(imageUrl ? { imageUrl } : {}) };
    // (written as root.HSGame.share so the call stays readable for hs-check after minification)
    const root: any = typeof GameGlobal !== 'undefined' ? GameGlobal : globalThis;
    const r = root.HSGame ? await root.HSGame.share(args) : await HSGame.share(args);
    return r ? 'shared' : 'none';
  },
  shareReward(): Record<string, number> | null {
    return HSGame.rewards('share');
  },

  // ---- TikTok review missions (Entry Reward / Launch Reward)
  entryStart() {
    HSGame.tiktokMission.start('profile');
  },
  launchStart() {
    HSGame.tiktokMission.start('shortcut');
  },
  entryDone: () => !!HSGame.tiktokMission.done('profile'),
  launchDone: () => !!HSGame.tiktokMission.done('shortcut'),
  entryReward: (): Record<string, number> | null => HSGame.rewards('tiktok_profile'),
  /**
   * v3.0.11: is this reward button worth showing now? Decided by HSGame from the reward
   * configuration ($limit once / daily / every time) and the claim state — never "claimed once =
   * gone". Hidden until HSGame has started, so an exhausted reward never flashes while loading.
   *  - Entry / Launch: feature on here and the TikTok mission not done (done() honours $limit).
   *  - Share: feature on here and a share reward can still be earned (available('share')); a
   *    Share with no reward configured stays (TikTok review button).
   */
  perkState(): PerkState {
    const st: PerkState = { started: settled, hasShare: false, hasMissions: false, shareRewarded: false, shareAvailable: false, entryDone: true, launchDone: true };
    if (!settled) return st;
    try {
      st.hasShare = !!HSGame.has('share');
      st.hasMissions = !!HSGame.has('tiktok_missions');
      st.shareRewarded = !!HSGame.rewards('share');
      st.shareAvailable = !!HSGame.available('share');
      st.entryDone = !!HSGame.tiktokMission.done('profile');
      st.launchDone = !!HSGame.tiktokMission.done('shortcut');
    } catch {
      /* keep the safe defaults (hidden) */
    }
    return st;
  },
  perkVisible(kind: PerkKind): boolean {
    return perkVisible(kind, this.perkState());
  },
  launchReward: (): Record<string, number> | null => HSGame.rewards('tiktok_shortcut'),

  /** an ad, a purchase or the app went away / came back */
  onPause(cb: () => void) {
    HSGame.on('pause', cb);
  },
  onResume(cb: () => void) {
    HSGame.on('resume', cb);
  },
  /** after ANY reward (share, missions, purchases) */
  onGiven(cb: (items: Record<string, number>, from: string) => void) {
    HSGame.on('given', cb);
  },
  itemName(id: string): string {
    return HSGame.item(id)?.name ?? DEFAULTS.items[id]?.name ?? id;
  },
};
