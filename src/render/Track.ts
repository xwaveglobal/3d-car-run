import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { glowTexture, xwaveBoardTexture } from './textures.ts';
import type { RoadStyle } from './western/looks.ts';
import { propMaterial } from './western/atlas.ts';
import { billboard as billboardGeo, route66 as route66Geo } from './western/props.ts';
import { fadeMaterial } from './western/PropField.ts';
import { GRAPHICS, ROAD, type GraphicsPreset } from '../config.ts';
import { emptyRoadPixels, roadPixels, roadRows, type RoadPixels } from './roadSurface.ts';
import { platform } from '../platform.ts';
import { bgAdd } from '../core/bgWork.ts';
import { addFarFade, wrapZ } from './envFx.ts';

const ROAD_LEN = 300;
const ROAD_NEAR = 30;
const TILE = ROAD.tile; // metres per road texture tile (v4.2: procedural, see roadSurface.ts)
/** lamp heads: x of the light (the arm reaches over the shoulder) */
const LAMP_HEAD_X = 4.0;
/** roadside signs: spacing (m), x (outside the barrier) */
const SIGN_EVERY = 150;
const SIGN_X = 5.7;

const roadPx = new Map<number, RoadPixels>();
/** the procedural road tile at width w (height 2w), rasterised once per size (pure data → DataTextures) */
function roadData(w = 512) {
  let px = roadPx.get(w);
  if (!px) roadPx.set(w, (px = roadPixels(w, w * 2)));
  return px;
}
/**
 * v4.0.1 (owner: the first load on iPhone stalls): the mini-game runtime on iOS runs JavaScript without a
 * JIT, where the 512 × 1024 road tile took seconds. The native build starts on the 256 tile and draws the
 * full one in small slices between frames, then swaps it in (same look a few seconds later).
 */
const ROAD_START_W = 256;
const pendingRoad = new Map<number, ((px: RoadPixels) => void)[]>();
function roadDataLater(w: number, done: (px: RoadPixels) => void) {
  const have = roadPx.get(w);
  if (have) return done(have);
  const waiting = pendingRoad.get(w);
  if (waiting) return void waiting.push(done);
  pendingRoad.set(w, [done]);
  const px = emptyRoadPixels(w, w * 2);
  let row = 0;
  // v4.0.2: one row per step of the shared background queue (core/bgWork.ts: held while the player touches)
  bgAdd(
    'road',
    () => {
      roadRows(px, row, row + 1);
      row++;
      if (row < px.h) return false;
      roadPx.set(w, px);
      const cbs = pendingRoad.get(w) ?? [];
      pendingRoad.delete(w);
      for (const cb of cbs) cb(px);
      return true;
    },
    { delay: 2500, prio: 5 },
  );
}
function dataTex(data: Uint8Array, w: number, h: number, srgb: boolean) {
  const t = new THREE.DataTexture(data as Uint8Array<ArrayBuffer>, w, h, THREE.RGBAFormat);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}
/** side wall: post spacing (m) and height (m) */
const WALL_RIB = 4;
const WALL_H = 0.62; // v1.0.0: a W-beam guardrail, not a glass wall
const tmpWhite = new THREE.Color(0xffffff);

export { wrapZ } from './envFx.ts';

/**
 * Elevated sky-highway. The road never moves — its textures scroll, and props
 * (rails, lamps, pylons) are repositioned by modulo, so there is zero spawning.
 */
export class Track {
  group = new THREE.Group();
  private roadTex: THREE.Texture;
  private roughTex: THREE.Texture;
  private emisTex: THREE.Texture;
  private get roadTexs() {
    return [this.roadTex, this.roughTex, this.emisTex];
  }
  /** road shader uniforms: scroll distance, detail on/off (quality), lamp phases, light pools */
  private roadU = {
    uDist: { value: 0 },
    uDetail: { value: 1 },
    uLampPhase: { value: new THREE.Vector2() },
    uLampEvery: { value: 24 },
    uPoolColor: { value: new THREE.Color(0xffe2b8) },
    uPool: { value: 0.07 },
  };
  /** roadside signs (scroll with the road) */
  private signs: { g: THREE.Group; base: number }[] = [];
  private signRange = 0;
  /** 0..1 light-streak stretch of the lamp heads (speed / nitro) */
  private streak = 0;
  private railTex: THREE.CanvasTexture;
  private lampSlots: { side: number; base: number }[] = [];
  private lampBodies!: THREE.InstancedMesh;
  private lampHeads!: THREE.InstancedMesh;
  private lampGlows!: THREE.Points;
  private pylonBodies!: THREE.InstancedMesh;
  private pylonRings!: THREE.InstancedMesh;
  private m4 = new THREE.Matrix4();
  private rotY = new THREE.Matrix4().makeRotationY(Math.PI);
  private lampSpacing = 24;
  private pylonSpacing = 48;
  roadMat: THREE.MeshStandardMaterial;
  railGlowMat: THREE.MeshBasicMaterial;
  accent = new THREE.Color(0x39b6ff);
  private wallTexL!: THREE.Texture;
  private wallTexR!: THREE.Texture;
  private wallMats: THREE.MeshBasicMaterial[] = [];

  constructor() {
    // ---- v4.2 road: procedural dark asphalt (aggregate grain, polished tyre tracks, sealed
    // shoulders), dashed dividers + solid edge lines + reflective studs placed from LANES, and a
    // roughness map so the surface catches the light unevenly. One plane, scrolled textures: no
    // segments, no seams, no popping.
    const px = roadData(platform.native ? ROAD_START_W : 512);
    this.roadTex = dataTex(px.color, px.w, px.h, true);
    this.roughTex = dataTex(px.rough, px.w, px.h, false);
    this.emisTex = dataTex(px.emissive, px.w, px.h, true);
    for (const t of this.roadTexs) t.repeat.set(1, ROAD_LEN / TILE);
    this.roadMat = new THREE.MeshStandardMaterial({
      map: this.roadTex,
      roughnessMap: this.roughTex,
      roughness: 1,
      emissive: 0xffffff,
      emissiveMap: this.emisTex,
      emissiveIntensity: 0.6,
      metalness: 0.18,
      envMapIntensity: 0.35,
    });
    // shader detail (no extra textures): expansion joints every ROAD.jointEvery m, and soft light pools
    // under the lamps, both locked to the scrolling road (uDist) and to the lamp positions
    const ru = this.roadU;
    this.roadMat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, ru);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vRoadW;')
        .replace('#include <project_vertex>', '#include <project_vertex>\nvRoadW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
          varying vec3 vRoadW;
          uniform float uDist; uniform float uDetail; uniform vec2 uLampPhase; uniform float uLampEvery; uniform vec3 uPoolColor; uniform float uPool;`,
        )
        .replace(
          '#include <map_fragment>',
          `#include <map_fragment>
          float zr = vRoadW.z - uDist;
          {
            float m = mod(zr, ${ROAD.jointEvery.toFixed(1)});
            float dj = min(m, ${ROAD.jointEvery.toFixed(1)} - m);
            float aa = fwidth(zr) + 1e-4;
            float joint = (1.0 - smoothstep(${(ROAD.jointW / 2).toFixed(4)} - aa, ${(ROAD.jointW / 2).toFixed(4)} + aa, dj)) * step(abs(vRoadW.x), ${(ROAD.edgeX + ROAD.edgeW / 2).toFixed(3)});
            diffuseColor.rgb *= 1.0 - 0.55 * joint * uDetail;
          }`,
        )
        .replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
          {
            float pools = 0.0;
            for (int s = 0; s < 2; s++) {
              float side = s == 0 ? -1.0 : 1.0;
              float ph = s == 0 ? uLampPhase.x : uLampPhase.y;
              float dz = mod(zr - ph + 0.5 * uLampEvery, uLampEvery) - 0.5 * uLampEvery;
              float dx = vRoadW.x - side * ${(LAMP_HEAD_X - 0.5).toFixed(2)};
              pools += exp(-dx * dx / 3.2 - dz * dz / 9.0);
            }
            totalEmissiveRadiance += uPoolColor * pools * uPool * uDetail;
          }`,
        );
    };
    const road = new THREE.Mesh(new THREE.PlaneGeometry(ROAD.half * 2, ROAD_LEN), this.roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.z = ROAD_NEAR - ROAD_LEN / 2;
    this.group.add(road);

    // deck underside / thickness
    const deckMat = new THREE.MeshStandardMaterial({ color: 0xb8a888, roughness: 0.9, metalness: 0.02 });
    this.deckMat = deckMat;
    const deck = new THREE.Mesh(new THREE.BoxGeometry(9.4, 0.9, ROAD_LEN), deckMat);
    deck.position.set(0, -0.47, ROAD_NEAR - ROAD_LEN / 2);
    this.group.add(deck);

    // rails with scrolling light dashes
    const c = document.createElement('canvas');
    c.width = 16;
    c.height = 256;
    const g = c.getContext('2d')!;
    g.fillStyle = '#0a1a33';
    g.fillRect(0, 0, 16, 256);
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, 16, 150);
    this.railTex = new THREE.CanvasTexture(c);
    this.railTex.wrapS = this.railTex.wrapT = THREE.RepeatWrapping;
    this.railTex.repeat.set(1, ROAD_LEN / 8);
    this.railGlowMat = new THREE.MeshBasicMaterial({ color: 0x39b6ff, map: this.railTex, toneMapped: false });
    this.sideGlowMat = new THREE.MeshBasicMaterial({ color: 0x39b6ff, toneMapped: false });
    // v4.2: brushed steel (the old near-white rail glared against the night city)
    const railBody = new THREE.MeshStandardMaterial({ color: 0xb8b8b0, roughness: 0.5, metalness: 0.55 });
    this.railBody = railBody;
    for (const s of [-1, 1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.55, ROAD_LEN), railBody);
      rail.position.set(4.45 * s, 0.27, ROAD_NEAR - ROAD_LEN / 2);
      this.group.add(rail);
      const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.16, ROAD_LEN), this.railGlowMat);
      strip.rotation.set(-Math.PI / 2, 0, 0);
      strip.position.set(4.45 * s, 0.56, ROAD_NEAR - ROAD_LEN / 2);
      strip.visible = false; // v1.0.0: no neon rail strips in the desert
      this.group.add(strip);
      const side = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_LEN, 0.12), this.sideGlowMat);
      side.rotation.y = (Math.PI / 2) * -s;
      side.position.set(4.63 * s, 0.3, ROAD_NEAR - ROAD_LEN / 2);
      side.visible = false;
      this.group.add(side);
      const under = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_LEN, 0.1), this.sideGlowMat);
      under.rotation.y = (Math.PI / 2) * -s;
      under.position.set(4.71 * s, -0.6, ROAD_NEAR - ROAD_LEN / 2);
      under.visible = false;
      this.group.add(under);
    }

    // SIDE WALLS: tinted glass barrier panels on top of the rails with steel posts every
    // WALL_RIB metres and a light strip. They scroll with the road: the posts flashing past at the
    // edge of the screen are the strongest cue of speed (like a highway sound wall).
    {
      const wc = document.createElement('canvas');
      wc.width = 128;
      wc.height = 64;
      const w = wc.getContext('2d')!;
      // v1.0.0: galvanised W-beam guardrail on timber posts (transparent above / below the beam)
      w.clearRect(0, 0, 128, 64);
      w.fillStyle = '#5a3a1e'; // timber post
      w.fillRect(2, 18, 12, 46);
      w.fillStyle = 'rgba(0,0,0,.25)';
      w.fillRect(11, 18, 3, 46);
      const beam = w.createLinearGradient(0, 8, 0, 34);
      beam.addColorStop(0, '#f2f2ec');
      beam.addColorStop(0.3, '#a8a8a2');
      beam.addColorStop(0.5, '#e6e6de');
      beam.addColorStop(0.7, '#9a9a94');
      beam.addColorStop(1, '#d8d8d0');
      w.fillStyle = beam;
      w.fillRect(0, 8, 128, 26);
      w.fillStyle = 'rgba(0,0,0,.18)';
      w.fillRect(0, 20, 128, 2);
      w.fillStyle = '#ffb030'; // amber reflector on each post
      w.fillRect(5, 17, 6, 6);
      const wallTex = new THREE.CanvasTexture(wc);
      wallTex.colorSpace = THREE.SRGBColorSpace;
      wallTex.wrapS = THREE.RepeatWrapping;
      wallTex.anisotropy = 8;
      this.wallTexL = wallTex;
      this.wallTexR = wallTex.clone();
      this.wallTexR.needsUpdate = true;
      for (const [s2, tex] of [[-1, this.wallTexL], [1, this.wallTexR]] as const) {
        tex.repeat.set(ROAD_LEN / WALL_RIB, 1);
        const mat = new THREE.MeshBasicMaterial({ map: tex, color: 0xffffff, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide });
        this.wallMats.push(mat);
        const wall = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_LEN, WALL_H), mat);
        wall.rotation.y = (Math.PI / 2) * -s2;
        wall.position.set(4.5 * s2, 0.5 + WALL_H / 2, ROAD_NEAR - ROAD_LEN / 2);
        wall.renderOrder = 1;
        this.group.add(wall);
      }
    }

    // lamp posts — instanced (2 meshes + 1 Points for the glows, whatever the count)
    const postGeo = new THREE.CylinderGeometry(0.06, 0.09, 3.6, 8);
    postGeo.translate(0, 1.8, 0);
    const armGeo = new THREE.BoxGeometry(0.9, 0.08, 0.14);
    armGeo.translate(-0.4, 3.55, 0);
    const bodyGeo = mergeGeometries([postGeo.toNonIndexed(), armGeo.toNonIndexed()])!;
    const headGeo = new RoundedBoxGeometry(0.5, 0.1, 0.24, 2, 0.04);
    headGeo.translate(-0.75, 3.5, 0);
    // lamp heads: a cool-white LED bar (tone-mapped: bright, no glare strobing past the camera)
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xffd9a0 });
    const n = Math.ceil(ROAD_LEN / this.lampSpacing) * 2;
    this.lampBodies = new THREE.InstancedMesh(bodyGeo, railBody, n);
    this.lampHeads = new THREE.InstancedMesh(headGeo, lampMat, n);
    for (const im of [this.lampBodies, this.lampHeads]) {
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      im.frustumCulled = false;
      this.group.add(im);
    }
    for (let i = 0; i < n; i++) {
      const s = i % 2 === 0 ? -1 : 1;
      this.lampSlots.push({ side: s, base: Math.floor(i / 2) * this.lampSpacing + (s > 0 ? this.lampSpacing / 2 : 0) });
    }
    const glowPos = new Float32Array(n * 3);
    const glowGeo = new THREE.BufferGeometry();
    glowGeo.setAttribute('position', new THREE.BufferAttribute(glowPos, 3).setUsage(THREE.DynamicDrawUsage));
    this.lampGlows = new THREE.Points(
      glowGeo,
      new THREE.PointsMaterial({ map: glowTexture(), color: 0x9fdcff, size: 2.4, sizeAttenuation: true, transparent: true, opacity: 0.65, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    this.lampGlows.frustumCulled = false;
    this.group.add(this.lampGlows);
    {
      // v1.0.0: wooden telephone poles with a cross-arm and insulators (the desert highway look)
      const pole = new THREE.CylinderGeometry(0.11, 0.15, 7.6, 6);
      pole.translate(0, 3.8, 0);
      const arm = new THREE.BoxGeometry(1.9, 0.14, 0.14);
      arm.translate(0, 7.0, 0);
      const arm2 = new THREE.BoxGeometry(1.3, 0.12, 0.12);
      arm2.translate(0, 6.4, 0);
      const ins = [-0.8, -0.3, 0.3, 0.8].map((x) => new THREE.CylinderGeometry(0.05, 0.05, 0.22, 5).translate(x, 7.18, 0).toNonIndexed());
      const geo = mergeGeometries([pole.toNonIndexed(), arm.toNonIndexed(), arm2.toNonIndexed(), ...ins])!;
      this.poleMat = new THREE.MeshStandardMaterial({ color: 0x6a4a2c, roughness: 0.95, metalness: 0, flatShading: true });
      this.poles = new THREE.InstancedMesh(geo, this.poleMat, n);
      this.poles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.poles.frustumCulled = false;
      this.group.add(this.poles);
    }

    // support pylons dropping into the cloud sea — instanced
    // v1.0.0: sandstone bridge piers (shown on the bridge / coast worlds only)
    const pylonGeo = new THREE.BoxGeometry(2.6, 66, 2.2);
    pylonGeo.translate(0, -34, 0);
    const capGeo = new THREE.BoxGeometry(9.6, 1.6, 2.8);
    capGeo.translate(0, -1.6, 0);
    const pylonMat = new THREE.MeshStandardMaterial({ color: 0xb89070, roughness: 0.95, metalness: 0, flatShading: true });
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x39b6ff, toneMapped: false });
    const r1 = new THREE.TorusGeometry(1.25, 0.08, 6, 24);
    r1.rotateX(Math.PI / 2);
    const r2 = r1.clone();
    r1.translate(0, -4, 0);
    r2.translate(0, -9, 0);
    const pn = Math.ceil(ROAD_LEN / this.pylonSpacing);
    this.pylonBodies = new THREE.InstancedMesh(mergeGeometries([pylonGeo.toNonIndexed(), capGeo.toNonIndexed()])!, pylonMat, pn);
    this.pylonRings = new THREE.InstancedMesh(mergeGeometries([r1, r2])!, ringMat, pn);
    for (const im of [this.pylonBodies, this.pylonRings]) {
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      im.frustumCulled = false;
      this.group.add(im);
    }
    this.ringMat = ringMat;
    // lamp phases along the road (the light pools on the asphalt sit exactly under the heads)
    {
      const range = Math.ceil(ROAD_LEN / this.lampSpacing) * this.lampSpacing;
      const ph = (base: number) => ((((ROAD_NEAR - range + base) % this.lampSpacing) + this.lampSpacing) % this.lampSpacing);
      const left = this.lampSlots.find((l) => l.side < 0)!;
      const right = this.lampSlots.find((l) => l.side > 0)!;
      this.roadU.uLampPhase.value.set(ph(left.base), ph(right.base));
      this.roadU.uLampEvery.value = this.lampSpacing;
      this.lampRange = range;
    }

    // roadside signs outside the barrier (never over the road): XWAVE logo boards and lane arrows
    {
      const n = Math.ceil(ROAD_LEN / SIGN_EVERY) * 2;
      this.signRange = (n / 2) * SIGN_EVERY;
      const mat = fadeMaterial(propMaterial(), ROAD_NEAR - this.signRange);
      const r66 = route66Geo();
      const bb = billboardGeo();
      for (let i = 0; i < n; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        const g = new THREE.Group();
        const shield = new THREE.Mesh(r66, mat);
        shield.name = 'route66';
        shield.position.y = -0.42;
        const board = new THREE.Mesh(bb, mat);
        board.name = 'billboard';
        board.scale.setScalar(0.55);
        board.position.set(side * 1.4, -0.42, 0);
        g.add(shield, board);
        // v4.0.2 (owner): every third board on the right is an XWAVE board (white wordmark on dark wood)
        if (i % 6 === 1) {
          const xb = new THREE.Mesh(new THREE.PlaneGeometry(6.3, 3.0), this.xwaveBoardMat());
          xb.name = 'xwaveboard';
          xb.position.set(side * 1.4, -0.42 + 5 * 0.55, 0.03);
          xb.scale.setScalar(0.55);
          g.add(xb);
        }
        g.position.x = side * SIGN_X;
        g.rotation.y = side * 0.32; // turned slightly toward the driver
        this.group.add(g);
        this.signs.push({ g, base: Math.floor(i / 2) * SIGN_EVERY + (side > 0 ? SIGN_EVERY / 2 : 0) + 37 });
      }
    }
    // no popping: recycled props appear out of the haze at the far end of their range
    addFarFade(railBody, ROAD_NEAR - this.lampRange);
    addFarFade(lampMat, ROAD_NEAR - this.lampRange);
    addFarFade(this.poleMat, ROAD_NEAR - this.lampRange);
    const pylonRange = Math.ceil(ROAD_LEN / this.pylonSpacing) * this.pylonSpacing;
    addFarFade(pylonMat, ROAD_NEAR - pylonRange);
    addFarFade(ringMat, ROAD_NEAR - pylonRange);
    this.setQuality(GRAPHICS.medium);
  }
  private lampRange = 0;
  private ringMat: THREE.MeshBasicMaterial;
  private deckMat!: THREE.MeshStandardMaterial;
  private railBody!: THREE.MeshStandardMaterial;
  private poleMat!: THREE.MeshStandardMaterial;
  private poles!: THREE.InstancedMesh;
  private style: RoadStyle | null = null;
  private tone = new THREE.Color(0xffffff);
  private toneK = 1;

  /** v1.0.0 (3D Car Run): dress the road for a Western place (rails, poles, piers, signs, light pools) */
  setStyle(st: RoadStyle) {
    this.style = st;
    this.tone.setHex(st.tone);
    this.roadMat.color.copy(this.tone).multiplyScalar(this.toneK);
    this.railBody.color.setHex(st.rail);
    this.deckMat.color.setHex(st.deck);
    this.roadU.uPool.value = st.pools;
    this.applyVisibility();
  }
  private applyVisibility() {
    const st = this.style;
    const open = this.openAir;
    const lamps = !!st && st.poles === 'lamps' && open;
    const phone = !st ? false : st.poles === 'phone' && open;
    this.lampBodies.visible = this.lampHeads.visible = lamps || (!st && open);
    this.poles.visible = phone;
    const piers = !!st && st.piers !== 'none';
    this.pylonBodies.visible = piers;
    this.pylonRings.visible = false;
    for (const sg of this.signs) {
      sg.g.visible = this.signsOn && open && !!st && st.signs !== 'none';
      for (const c of sg.g.children) c.visible = !!st && c.name === st.signs;
    }
  }

  /** graphics preset: road shader detail, roadside signs, texture size / sharpness (no recompile) */
  setQuality(p: GraphicsPreset) {
    this.preset = p;
    let want = p.roadTex;
    if (platform.native && want > ROAD_START_W && !roadPx.has(want)) {
      // native: keep the small tile now, swap in the full one when its background slices are done
      roadDataLater(want, () => {
        if (this.preset === p) this.setQuality(p);
      });
      want = this.roadTex.image.width;
    }
    if (want !== this.roadTex.image.width) {
      // LOW: a 256 × 512 tile (¼ of the GPU memory); the old textures are disposed
      const px = roadData(want);
      const old = this.roadTexs;
      this.roadTex = dataTex(px.color, px.w, px.h, true);
      this.roughTex = dataTex(px.rough, px.w, px.h, false);
      this.emisTex = dataTex(px.emissive, px.w, px.h, true);
      for (const t of this.roadTexs) {
        t.repeat.set(1, ROAD_LEN / TILE);
        t.offset.y = old[0].offset.y;
      }
      this.roadMat.map = this.roadTex;
      this.roadMat.roughnessMap = this.roughTex;
      this.roadMat.emissiveMap = this.emisTex;
      for (const t of old) t.dispose();
    }
    this.roadU.uDetail.value = p.roadDetail ? 1 : 0;
    this.signsOn = p.cityExtras;
    if (this.poles) this.applyVisibility();
    for (const t of this.roadTexs)
      if (t.anisotropy !== p.anisotropy) {
        t.anisotropy = p.anisotropy;
        t.needsUpdate = true;
      }
  }
  private signsOn = true;
  private xbMat: THREE.MeshBasicMaterial | null = null;
  private xwaveBoardMat() {
    if (!this.xbMat) {
      this.xbMat = new THREE.MeshBasicMaterial({ map: xwaveBoardTexture(), color: 0xd8d0c8 });
      addFarFade(this.xbMat, ROAD_NEAR - this.signRange);
    }
    return this.xbMat;
  }
  private preset: GraphicsPreset | null = null;
  private openAir = true;
  private sideGlowMat: THREE.MeshBasicMaterial;

  setAccent(c: THREE.Color) {
    this.accent.copy(c);
    this.railGlowMat.color.copy(c);
    this.ringMat.color.copy(c);
    this.sideGlowMat.color.copy(c);
    // v1.0.0: the guardrail keeps its own galvanised colour (no accent tint)
    for (const m of this.wallMats) m.color.copy(tmpWhite);
  }

  /** Apply a world's readability profile (lane glow, road tone, reflections, rail glow). */
  applyReadability(r: { roadGlow: number; roadTone: number; roadEnv: number; rails: number }) {
    this.roadMat.emissiveIntensity = r.roadGlow;
    this.toneK = r.roadTone;
    this.roadMat.color.copy(this.tone).multiplyScalar(r.roadTone);
    this.roadMat.envMapIntensity = r.roadEnv;
    this.railGlowMat.color.copy(this.accent).multiplyScalar(r.rails);
    this.sideGlowMat.color.copy(this.accent).multiplyScalar(r.rails);
  }

  /** Show/hide props that only make sense on the open sky highway. */
  setOpenAir(on: boolean) {
    this.openAir = on;
    this.lampGlows.visible = false; // glow halos removed (eye comfort)
    this.applyVisibility();
  }

  /**
   * @param speedK 0..1 road speed (start → max) — lamp heads streak a little at speed
   * @param nitro 0..1 turbo — stronger light streaks
   */
  update(dist: number, speedK = 0, nitro = 0) {
    const off = (dist / TILE) % 1;
    for (const t of this.roadTexs) t.offset.y = off;
    this.roadU.uDist.value = dist % (ROAD.jointEvery * this.lampSpacing);
    this.streak += (Math.max(speedK * 0.6, nitro * 2.4) - this.streak) * 0.1;
    this.railTex.offset.y = (dist / 8) % 1;
    // walls: the two planes face opposite ways, so their texture runs in opposite directions
    this.wallTexL.offset.x = -((dist / WALL_RIB) % 1);
    this.wallTexR.offset.x = (dist / WALL_RIB) % 1;
    const lampRange = this.lampRange;
    const sz = 1 + this.streak * 3; // lamp heads stretch into light streaks at speed
    const gp = this.lampGlows.geometry.attributes.position as THREE.BufferAttribute;
    this.lampSlots.forEach((l, i) => {
      const z = wrapZ(l.base, dist, lampRange, ROAD_NEAR);
      // lamps on the left are the right-hand lamp rotated 180° (arm points at the road)
      if (l.side > 0) this.m4.makeTranslation(4.75, 0, z);
      else this.m4.copy(this.rotY).setPosition(-4.75, 0, z);
      this.lampBodies.setMatrixAt(i, this.m4);
      if (sz > 1.001) this.m4.multiply(this.stretch.makeScale(1, 1, sz).premultiply(this.toHead).multiply(this.fromHead));
      this.lampHeads.setMatrixAt(i, this.m4);
      gp.setXYZ(i, l.side * (4.75 - 0.75), 3.4, z);
      this.m4.makeTranslation(l.side * 5.9, -0.42, z);
      this.poles.setMatrixAt(i, this.m4);
    });
    gp.needsUpdate = true;
    this.lampBodies.instanceMatrix.needsUpdate = true;
    this.lampHeads.instanceMatrix.needsUpdate = true;
    this.poles.instanceMatrix.needsUpdate = true;
    const pn = this.pylonBodies.count;
    const pr = pn * this.pylonSpacing;
    for (let i = 0; i < pn; i++) {
      this.m4.makeTranslation(0, 0, wrapZ(i * this.pylonSpacing, dist, pr, ROAD_NEAR));
      this.pylonBodies.setMatrixAt(i, this.m4);
      this.pylonRings.setMatrixAt(i, this.m4);
    }
    this.pylonBodies.instanceMatrix.needsUpdate = true;
    this.pylonRings.instanceMatrix.needsUpdate = true;
    for (const s of this.signs) s.g.position.z = wrapZ(s.base, dist, this.signRange, ROAD_NEAR);
  }
  private stretch = new THREE.Matrix4();
  /** stretch the head about its own centre (local head position −0.75, 3.5, 0) */
  private toHead = new THREE.Matrix4().makeTranslation(-0.75, 3.5, 0);
  private fromHead = new THREE.Matrix4().makeTranslation(0.75, -3.5, 0);
}
