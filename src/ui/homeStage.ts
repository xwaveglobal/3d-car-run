/**
 * v1.0.2 Home ("ảnh 4" layout): the Home screen is the owner's 9:16 key art with live UI on top.
 * Pure layout math (no DOM, no Three.js) shared by the page (sprite positions) and the renderer
 * (the painted background and the 3D car), so both always line up.
 *
 * - The art is 941 × 1672 (+ a sky extension above it, 420 px, for taller phones).
 * - Tall / normal phones: the art is fitted to the screen width and bottom-aligned (PLAY and the
 *   bottom buttons stay where a thumb expects them); the sky extension fills the space above.
 * - Wider screens (tablets, desktop): the art is fitted to the height and centred; the sides show a
 *   blurred, darker copy of the art.
 * Every Home element is placed in ART pixels (the coordinates of the key art), see HOME_LAYOUT.
 */
export const HOME_ART = { w: 941, h: 1672, ext: 420 } as const;

export interface StageRect {
  /** stage = the 941 × 1672 art area, in CSS pixels of the viewport */
  x: number;
  y: number;
  w: number;
  h: number;
  /** CSS px per art px */
  s: number;
}

export function homeStage(vw: number, vh: number): StageRect {
  const ia = HOME_ART.w / HOME_ART.h;
  if (vw / vh <= ia) {
    const w = vw;
    const s = w / HOME_ART.w;
    const h = HOME_ART.h * s;
    return { x: 0, y: vh - h, w, h, s };
  }
  const h = vh;
  const s = h / HOME_ART.h;
  const w = HOME_ART.w * s;
  return { x: (vw - w) / 2, y: 0, w, h, s };
}

/** Home elements in art pixels: [x, y, width] (height follows the sprite) — measured on the key art */
export const HOME_LAYOUT = {
  // [x, y, width, height?] — v1.0.3 (key art v3): BONUS / ENTRY / PLAY / GARAGE / SHOP / MISSIONS are painted
  // in the art; these are their tap areas (the height is given). The top bar is cut out of the art (sprites).
  bonus: [22, 1150, 163, 150],
  sign: [760, 1150, 168, 152],
  play: [166, 1292, 626, 178],
  garage: [30, 1488, 282, 104],
  shop: [335, 1488, 270, 104],
  missions: [631, 1488, 286, 104],
  // top bar (pinned to the top of the screen on tall phones)
  profile: [25, 40, 442],
  currency: [480, 65, 248],
  gear: [736, 61, 95],
  menu: [835, 60, 92],
  /** v1.0.8 (owner): Entry / Launch / Share as small buttons under the menu button (top bar, pinned on tall phones) */
  // v4.0.2 (owner): more room between the three (their labels no longer touch the next button)
  pkEntry: [840, 176, 82],
  pkLaunch: [840, 330, 82],
  pkShare: [840, 484, 82],
  /** the 3D car: centre of its footprint and its on-screen width */
  car: [470, 1012, 575],
} as const;
