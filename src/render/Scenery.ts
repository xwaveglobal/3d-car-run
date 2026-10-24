import * as THREE from 'three';
import type { WorldId } from '../gameplay/Spawner.ts';
import { damp } from '../core/math.ts';
import { cloudSeaTexture, glowTexture, starfieldTexture } from './textures.ts';
import type { GraphicsPreset } from '../config.ts';
import { LOOKS } from './western/looks.ts';
import { buildWestern, type Theme } from './western/scenes.ts';

export interface ThemeLook {
  skyTop: number;
  skyMid: number;
  skyBottom: number;
  fog: number;
  fogNear: number;
  fogFar: number;
  hemiSky: number;
  hemiGround: number;
  hemi: number;
  sun: number;
  sunI: number;
  accent: number;
  stars: number;
  cloudSea: number; // opacity
  cloudTint: number;
  openAir: boolean;
  /** v4.2: colour of the big horizon glow sprite (default: the sun colour) — at night a soft city glow */
  glow?: number;
}

// v1.0.0 (3D Car Run): the Western looks and places live in src/render/western/
export { LOOKS };

/**
 * Sky dome, cloud sea, lights and the five themed scenery sets. Themes are
 * built lazily the first time they're needed; transitions blend sky/fog/light.
 */
export class Scenery {
  group = new THREE.Group();
  hemi: THREE.HemisphereLight;
  sun: THREE.DirectionalLight;
  fog: THREE.Fog;
  private skyMat: THREE.ShaderMaterial;
  private sea: THREE.Mesh;
  private seaTex: THREE.Texture;
  private sunSprite: THREE.Sprite;
  private themes = new Map<WorldId, Theme>();
  current: WorldId = 'city';
  private look: ThemeLook = { ...LOOKS.city };
  private target: ThemeLook = LOOKS.city;
  /** current world id (readability profile key) */
  world: WorldId = 'city';
  private tmpA = new THREE.Color();
  private tmpB = new THREE.Color();
  accent = new THREE.Color(LOOKS.city.accent);

  constructor(scene: THREE.Scene) {
    this.fog = new THREE.Fog(LOOKS.city.fog, LOOKS.city.fogNear, LOOKS.city.fogFar);
    scene.fog = this.fog;
    this.hemi = new THREE.HemisphereLight(LOOKS.city.hemiSky, LOOKS.city.hemiGround, LOOKS.city.hemi);
    this.group.add(this.hemi);
    this.sun = new THREE.DirectionalLight(LOOKS.city.sun, LOOKS.city.sunI);
    this.sun.position.set(-6, 12, -10);
    this.group.add(this.sun);
    const rim = new THREE.DirectionalLight(0xffe2c0, 0.8); // v1.0.0: warm desert rim
    rim.position.set(4, 6, 10);
    this.group.add(rim);

    this.skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        top: { value: new THREE.Color(LOOKS.city.skyTop) },
        mid: { value: new THREE.Color(LOOKS.city.skyMid) },
        bottom: { value: new THREE.Color(LOOKS.city.skyBottom) },
        stars: { value: starfieldTexture() },
        starMix: { value: LOOKS.city.stars },
        time: { value: 0 },
      },
      vertexShader: `varying vec3 vDir; varying vec2 vUv; void main(){ vDir = normalize(position); vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 bottom; uniform sampler2D stars; uniform float starMix; uniform float time;
        varying vec3 vDir; varying vec2 vUv;
        void main(){
          float h = vDir.y;
          vec3 c = h > 0.08 ? mix(mid, top, smoothstep(0.08, 0.7, h)) : mix(bottom, mid, smoothstep(-0.25, 0.08, h));
          float s = texture2D(stars, vUv * vec2(4.0, 2.0)).r;
          c += vec3(s) * starMix * smoothstep(-0.1, 0.4, h) * 0.8;
          gl_FragColor = vec4(c, 1.0);
          #include <colorspace_fragment>
        }`,
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(700, 32, 16), this.skyMat);
    sky.frustumCulled = false;
    sky.renderOrder = -10;
    this.group.add(sky);

    this.sunSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffd0a0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }),
    );
    this.sunSprite.scale.setScalar(260);
    this.sunSprite.position.set(-60, 40, -620);
    this.group.add(this.sunSprite);

    this.seaTex = cloudSeaTexture();
    this.seaTex.repeat.set(6, 6);
    this.sea = new THREE.Mesh(
      new THREE.PlaneGeometry(1400, 1400),
      new THREE.MeshBasicMaterial({ color: 0xf3d6ff, alphaMap: this.seaTex, transparent: true, opacity: 0.9, depthWrite: false }),
    );
    this.sea.rotation.x = -Math.PI / 2;
    this.sea.position.set(0, -26, -300);
    this.group.add(this.sea);
    const seaBase = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), new THREE.MeshBasicMaterial({ color: 0xcfa8e8 }));
    seaBase.rotation.x = -Math.PI / 2;
    seaBase.position.set(0, -34, -300);
    this.sea.userData.base = seaBase;
    this.group.add(seaBase);

    this.ensure('city');
    this.applyLook(1);
  }

  private ensure(id: WorldId) {
    let t = this.themes.get(id);
    if (!t) {
      t = buildWestern(id);
      t.group.visible = false;
      if (this.preset) t.setQuality?.(this.preset);
      this.group.add(t.group);
      this.themes.set(id, t);
    }
    return t;
  }

  /** v4.2 graphics preset, applied to every theme (also the ones built later) */
  private preset: GraphicsPreset | null = null;
  setQuality(p: GraphicsPreset) {
    this.preset = p;
    for (const [, t] of this.themes) t.setQuality?.(p);
  }

  /** Build a theme ahead of time to avoid a hitch at the world boundary. */
  preload(id: WorldId) {
    this.ensure(id);
  }

  setWorld(id: WorldId, instant = false) {
    for (const [k, t] of this.themes) t.group.visible = k === id;
    this.ensure(id).group.visible = true;
    this.current = id;
    this.target = LOOKS[id];
    this.world = id;
    if (instant) this.applyLook(1);
  }

  get openAir() {
    return LOOKS[this.current].openAir;
  }

  private applyLook(k: number) {
    const L = this.look;
    const T = this.target;
    const lc = (a: number, b: number) => this.tmpA.setHex(a).lerp(this.tmpB.setHex(b), k).getHex();
    L.skyTop = lc(L.skyTop, T.skyTop);
    L.skyMid = lc(L.skyMid, T.skyMid);
    L.skyBottom = lc(L.skyBottom, T.skyBottom);
    L.fog = lc(L.fog, T.fog);
    L.hemiSky = lc(L.hemiSky, T.hemiSky);
    L.hemiGround = lc(L.hemiGround, T.hemiGround);
    L.sun = lc(L.sun, T.sun);
    L.accent = lc(L.accent, T.accent);
    L.cloudTint = lc(L.cloudTint, T.cloudTint);
    const ln = (a: number, b: number) => a + (b - a) * k;
    L.fogNear = ln(L.fogNear, T.fogNear);
    L.fogFar = ln(L.fogFar, T.fogFar);
    L.hemi = ln(L.hemi, T.hemi);
    L.sunI = ln(L.sunI, T.sunI);
    L.stars = ln(L.stars, T.stars);
    L.cloudSea = ln(L.cloudSea, T.cloudSea);

    const u = this.skyMat.uniforms;
    (u.top.value as THREE.Color).setHex(L.skyTop);
    (u.mid.value as THREE.Color).setHex(L.skyMid);
    (u.bottom.value as THREE.Color).setHex(L.skyBottom);
    u.starMix.value = L.stars;
    this.fog.color.setHex(L.fog);
    this.fog.near = L.fogNear;
    this.fog.far = L.fogFar;
    this.hemi.color.setHex(L.hemiSky);
    this.hemi.groundColor.setHex(L.hemiGround);
    this.hemi.intensity = L.hemi;
    this.sun.color.setHex(L.sun);
    this.sun.intensity = L.sunI;
    this.accent.setHex(L.accent);
    const sm = this.sea.material as THREE.MeshBasicMaterial;
    sm.opacity = L.cloudSea;
    sm.color.setHex(L.cloudTint);
    this.sea.visible = L.cloudSea > 0.02;
    (this.sea.userData.base as THREE.Mesh).visible = L.cloudSea > 0.5;
    ((this.sea.userData.base as THREE.Mesh).material as THREE.MeshBasicMaterial).color.setHex(L.skyBottom).lerp(this.tmpA.setHex(L.cloudTint), 0.5);
    (this.sunSprite.material as THREE.SpriteMaterial).color.setHex(this.target.glow ?? L.sun);
    this.sunSprite.visible = this.current !== 'tunnel';
  }

  update(dist: number, t: number, dt: number) {
    this.applyLook(damp(2.2, dt));
    this.skyMat.uniforms.time.value = t;
    this.seaTex.offset.y = (dist / 230) % 1;
    for (const [, th] of this.themes) if (th.group.visible) th.update(dist, t, dt);
  }
}
