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
  bonus: [30, 1160, 156],
  sign: [762, 1162, 160],
  play: [146, 1262, 656],
  garage: [40, 1500, 276],
  shop: [343, 1504, 258],
  missions: [620, 1502, 284],
  // top bar (pinned to the top of the screen on tall phones)
  profile: [24, 38, 428],
  currency: [482, 63, 250],
  gear: [748, 60, 82],
  menu: [842, 58, 84],
  /** the 3D car: centre of its footprint and its on-screen width */
  car: [452, 1000, 620],
} as const;
