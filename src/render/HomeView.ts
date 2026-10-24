import * as THREE from 'three';
import { HOME_ART, HOME_LAYOUT, homeStage } from '../ui/homeStage.ts';
import { puffTexture } from './western/ground.ts';
import { HOME_SHOW } from '../config.ts';

/**
 * v1.0.2 Home (the owner's key art, "ảnh 4"): the painted art is the background, the real 3D car
 * stands where the painted car was, kicking up dust. No road, no scenery — the main scene is not
 * drawn while Home is open (cheaper than a race frame).
 *
 * Layout is shared with the page (src/ui/homeStage.ts): the art is width-fitted and bottom-aligned on
 * tall phones (sky extension above), height-fitted and centred on wide screens (blurred mirror on the
 * sides). The car is pinned to HOME_LAYOUT.car with a camera view offset, so it sits on the art at
 * every screen size.
 */
export class HomeView {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(HOME_SHOW.fov, 1, 0.1, 200);
  active = false;
  private bg: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private shadow: THREE.Mesh;
  private puffs: { s: THREE.Sprite; t: number; life: number; v: THREE.Vector3; side: number }[] = [];
  private puffI = 0;
  private puffClock = 0;
  private vw = 1;
  private vh = 1;
  /** car swipe: −1…1 slide offset animation */
  private slide: { dir: number; t: number; swapped: boolean; swap: () => void } | null = null;
  private slideX = 0;

  constructor(art: string, env: THREE.Texture | null) {
    this.scene.environment = env;
    (this.scene as THREE.Scene & { environmentIntensity?: number }).environmentIntensity = 0.9;
    this.camera.layers.enableAll();
    // ---- painted background (full-screen quad, drawn first, never tone-mapped)
    const tex = new THREE.TextureLoader().load(art);
    // v4.0 native: the art is uploaded RAW (never decoded by the GPU) and written out as the painted sRGB pixels —
    // a mini-game runtime that does not decode sRGB textures (or encodes the surface again) washed it out.
    // uLinearOut = 1 when the screen itself encodes to sRGB (src/native/color.ts fix A): then write linear.
    tex.colorSpace = THREE.NoColorSpace;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        tMap: { value: tex },
        uView: { value: new THREE.Vector2(1, 1) },
        uStage: { value: new THREE.Vector4(0, 0, 1, 1) },
        uExt: { value: HOME_ART.ext / HOME_ART.h },
        uDpr: { value: 1 },
        uLinearOut: { value: 0 },
      },
      vertexShader: /* glsl */ `void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D tMap; uniform vec2 uView; uniform vec4 uStage; uniform float uExt; uniform float uDpr; uniform float uLinearOut;
        void main() {
          vec2 p = vec2(gl_FragCoord.x, uView.y * uDpr - gl_FragCoord.y) / uDpr; // CSS px, top-left origin
          float u = (p.x - uStage.x) / uStage.z;
          float top = uStage.y - uExt * uStage.w;
          float v = clamp((p.y - top) / (uStage.w * (1.0 + uExt)), 0.0005, 0.9995);
          vec4 c;
          if (u < 0.0 || u > 1.0) {
            // wide screens: a blurred, darker mirror of the art fills the sides
            float m = u < 0.0 ? -u : 2.0 - u;
            c = texture2D(tMap, vec2(clamp(m, 0.0, 1.0), 1.0 - v), 5.5);
            c.rgb *= 0.55;
          } else {
            c = texture2D(tMap, vec2(u, 1.0 - v));
          }
          vec3 lin = mix(pow((c.rgb + 0.055) / 1.055, vec3(2.4)), c.rgb / 12.92, step(c.rgb, vec3(0.04045)));
          gl_FragColor = vec4(mix(c.rgb, lin, uLinearOut), 1.0);
        }`,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    this.bg = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    this.bg.frustumCulled = false;
    this.bg.renderOrder = -1000;
    this.scene.add(this.bg);

    // ---- sunset light: low warm sun from the right of the art, warm sky / dusty ground bounce
    const hemi = new THREE.HemisphereLight(0xffcf9a, 0x8a4a22, HOME_SHOW.hemi);
    const sun = new THREE.DirectionalLight(0xffc488, HOME_SHOW.sun);
    sun.position.set(8, 2.6, -5);
    const rim = new THREE.DirectionalLight(0xffa860, HOME_SHOW.rim);
    rim.position.set(-6, 4, -7);
    const fill = new THREE.DirectionalLight(0xffd8b0, HOME_SHOW.fill);
    fill.position.set(-2, 3, 8);
    this.scene.add(hemi, sun, rim, fill);

    // ---- soft contact shadow so the car sits on the dust
    const cv = document.createElement('canvas');
    cv.width = cv.height = 128;
    const g = cv.getContext('2d')!;
    const grd = g.createRadialGradient(64, 64, 4, 64, 64, 64);
    grd.addColorStop(0, 'rgba(30,12,2,0.85)');
    grd.addColorStop(0.55, 'rgba(30,12,2,0.45)');
    grd.addColorStop(1, 'rgba(30,12,2,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    const st = new THREE.CanvasTexture(cv);
    st.colorSpace = THREE.SRGBColorSpace;
    this.shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: st, transparent: true, depthWrite: false, toneMapped: false }));
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.scale.set(3.1, 6.2, 1);
    this.shadow.position.y = 0.02;
    this.shadow.renderOrder = -10;
    this.scene.add(this.shadow);

    // ---- dust kicked up by the rear wheels
    const pm = puffTexture();
    for (let i = 0; i < HOME_SHOW.puffs; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: pm, color: 0xe0a868, transparent: true, depthWrite: false, opacity: 0 }));
      s.visible = false;
      this.scene.add(s);
      this.puffs.push({ s, t: 0, life: 1, v: new THREE.Vector3(), side: 1 });
    }
  }

  /** warm sunset reflections for the car paint (the race uses a neutral studio room) */
  makeEnv(renderer: THREE.WebGLRenderer) {
    const es = new THREE.Scene();
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(10, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `varying vec3 vP;
          void main(){
            float y = vP.y;
            vec3 top = vec3(0.32, 0.38, 0.62), hor = vec3(1.0, 0.62, 0.30), gnd = vec3(0.42, 0.22, 0.10);
            vec3 c = y > 0.0 ? mix(hor, top, smoothstep(0.0, 0.7, y)) : mix(hor * 0.8, gnd, smoothstep(0.0, 0.35, -y));
            // the low sun on the right (+x, slightly ahead of the car)
            float sun = pow(max(dot(vP, normalize(vec3(0.85, 0.12, -0.5))), 0.0), 40.0);
            gl_FragColor = vec4(c + vec3(4.0, 2.6, 1.2) * sun, 1.0);
          }`,
      }),
    );
    es.add(sky);
    const pm = new THREE.PMREMGenerator(renderer);
    this.scene.environment = pm.fromScene(es, 0.03).texture;
    pm.dispose();
    sky.geometry.dispose();
    (sky.material as THREE.Material).dispose();
  }

  /** the renderer's output: sRGB (normal) → the art's pixels as they are; linear (the surface encodes) → decoded */
  setLinearOut(on: boolean) {
    this.bg.material.uniforms.uLinearOut.value = on ? 1 : 0;
  }

  resize(w: number, h: number, dpr: number) {
    this.vw = w;
    this.vh = h;
    const st = homeStage(w, h);
    const u = this.bg.material.uniforms;
    u.uView.value.set(w, h);
    u.uDpr.value = dpr;
    u.uStage.value.set(st.x, st.y, st.w, st.h);
    this.camera.aspect = w / h;
    this.placeCamera();
  }

  /** camera behind-right of the car, pulled back so the car spans HOME_LAYOUT.car's width on the art */
  private placeCamera() {
    const st = homeStage(this.vw, this.vh);
    const [ax, ay, aw] = HOME_LAYOUT.car;
    const cx = st.x + ax * st.s;
    const cy = st.y + ay * st.s;
    const wantPx = aw * st.s;
    const fov = THREE.MathUtils.degToRad(HOME_SHOW.fov);
    const d = (HOME_SHOW.carSpan * this.vh) / (2 * Math.tan(fov / 2) * wantPx);
    const yaw = HOME_SHOW.yaw;
    const pitch = HOME_SHOW.pitch;
    const look = new THREE.Vector3(0, HOME_SHOW.lookY, 0);
    this.camera.position.set(look.x + Math.sin(yaw) * Math.cos(pitch) * d, look.y + Math.sin(pitch) * d, look.z + Math.cos(yaw) * Math.cos(pitch) * d);
    this.camera.lookAt(look);
    // the look point lands on (cx, cy) instead of the screen centre
    this.camera.setViewOffset(this.vw, this.vh, this.vw / 2 - cx, this.vh / 2 - cy, this.vw, this.vh);
    this.camera.updateProjectionMatrix();
  }

  attach(car: THREE.Object3D) {
    if (HOME_SHOW.car3d) this.scene.add(car);
    this.shadow.visible = HOME_SHOW.car3d;
    this.active = true;
  }

  /** swipe to the next (dir 1) / previous (dir −1) car: slide out, swap the skin, slide in */
  swipe(dir: 1 | -1, swap: () => void) {
    if (this.slide && !this.slide.swapped) this.slide.swap();
    this.slide = { dir, t: 0, swapped: false, swap };
  }

  get sliding() {
    return !!this.slide;
  }

  update(dt: number, car: THREE.Object3D, baseX = 0) {
    if (!HOME_SHOW.car3d) {
      for (const p of this.puffs) p.s.visible = false;
      return;
    }
    // ---- swipe animation (out 0.16 s → swap → in 0.3 s)
    const OUT = 0.16;
    const IN = 0.3;
    const far = HOME_SHOW.slide;
    if (this.slide) {
      const sl = this.slide;
      sl.t += dt;
      if (!sl.swapped && sl.t >= OUT) {
        sl.swapped = true;
        sl.swap();
      }
      if (!sl.swapped) {
        const k = Math.min(1, sl.t / OUT);
        this.slideX = -sl.dir * far * k * k;
      } else {
        const k = Math.min(1, (sl.t - OUT) / IN);
        const e = 1 - Math.pow(1 - k, 3);
        this.slideX = sl.dir * far * (1 - e);
        if (k >= 1) {
          this.slide = null;
          this.slideX = 0;
        }
      }
    }
    car.position.set(baseX + this.slideX, car.position.y, 0);
    car.rotation.set(0, HOME_SHOW.carYaw, HOME_SHOW.carRoll);
    this.shadow.position.x = car.position.x;
    this.shadow.position.z = car.position.z;
    // ---- dust puffs from the rear wheels (fewer while sliding)
    this.puffClock += dt;
    const every = 1 / HOME_SHOW.puffRate;
    while (this.puffClock > every) {
      this.puffClock -= every;
      if (this.slide) continue;
      const p = this.puffs[this.puffI++ % this.puffs.length];
      p.side = this.puffI % 2 ? 1 : -1;
      p.t = 0;
      p.life = 0.55 + Math.random() * 0.35;
      p.s.position.set(car.position.x + p.side * (1.0 + Math.random() * 0.25), 0.3, car.position.z + 1.2 + Math.random() * 0.3);
      p.v.set(p.side * (0.35 + Math.random() * 0.5), 0.25 + Math.random() * 0.3, 0.3 + Math.random() * 0.5);
      p.s.visible = true;
    }
    for (const p of this.puffs) {
      if (!p.s.visible) continue;
      p.t += dt;
      const k = p.t / p.life;
      if (k >= 1) {
        p.s.visible = false;
        continue;
      }
      p.s.position.addScaledVector(p.v, dt);
      p.v.multiplyScalar(1 - 1.4 * dt);
      const sc = 0.7 + k * 2.2;
      p.s.scale.set(sc, sc, 1);
      (p.s.material as THREE.SpriteMaterial).opacity = HOME_SHOW.puffAlpha * Math.sin(Math.PI * Math.min(1, k * 1.4)) * (1 - k);
    }
  }
}
