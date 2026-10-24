import * as THREE from 'three';
import { fitText } from './textures.ts';
import { Model } from './western/kit.ts';
import { propMaterial } from './western/atlas.ts';

/**
 * v1.0.0 (3D Car Run): START / FINISH as a wooden ranch gate over the road — two log posts, a timber
 * crossbeam with a hand-painted sign board, rope ties and a pair of longhorns on top.
 */
function signTexture(label: string, kind: 'start' | 'finish') {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 192;
  const g = c.getContext('2d')!;
  // weathered planks
  g.fillStyle = '#6b4322';
  g.fillRect(0, 0, 1024, 192);
  for (let i = 0; i < 3; i++) {
    g.fillStyle = `rgba(0,0,0,${0.08 + i * 0.05})`;
    g.fillRect(0, i * 64, 1024, 64);
    g.fillStyle = 'rgba(30,14,4,.6)';
    g.fillRect(0, i * 64 + 62, 1024, 2);
  }
  g.strokeStyle = 'rgba(40,20,8,.35)';
  for (let k = 0; k < 40; k++) {
    g.beginPath();
    const y = (k * 37) % 192;
    g.moveTo(0, y);
    for (let x = 0; x <= 1024; x += 32) g.lineTo(x, y + Math.sin(x * 0.02 + k) * 2);
    g.stroke();
  }
  if (kind === 'finish') {
    const s = 24;
    for (let y = 0; y < 2; y++)
      for (let x = 0; x < 1024 / s; x++) {
        g.fillStyle = (x + y) % 2 ? '#f2ece0' : '#2a1608';
        g.fillRect(x * s, y * s, s, s);
        g.fillRect(x * s, 192 - (2 - y) * s, s, s);
      }
  }
  // gold stars instead of neon chevrons
  const star = (cx: number, cy: number, r: number) => {
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 ? r * 0.42 : r;
      g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    g.closePath();
    g.fillStyle = '#ffc848';
    g.fill();
    g.lineWidth = 4;
    g.strokeStyle = '#3a1a06';
    g.stroke();
  };
  star(110, 96, 40);
  star(914, 96, 40);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineWidth = 10;
  g.strokeStyle = '#2a1206';
  g.fillStyle = '#ffe7a8';
  const font = '{s} "Rye", "Alfa Slab One", Georgia, serif';
  fitText(g, label, 512, 100, 620, 116, font, true);
  fitText(g, label, 512, 100, 620, 116, font);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** START / FINISH ranch gate spanning the road. */
export function makeArch(kind: 'start' | 'finish') {
  const g = new THREE.Group();
  const m = new Model();
  for (const s of [-1, 1]) {
    m.cyl(0.42, 0.5, 8.2, 0x6a4428, 5.3 * s, 3.9, 0, 9);
    m.cyl(0.6, 0.6, 0.5, 0x4a2c16, 5.3 * s, 0.25, 0, 9);
    for (const y of [6.2, 6.6]) m.cyl(0.47, 0.47, 0.12, 0xc8a870, 5.3 * s, y, 0, 9);
  }
  m.box(12.4, 0.7, 0.8, 0x5a3a1e, 0, 8.2, 0, 0, { atlas: 'planksDark', map: 'all', rep: [3, 1] });
  m.box(11.2, 2.3, 0.3, 0x6b4322, 0, 6.9, 0.1);
  // longhorns on top
  m.push(0, 9.0, 0);
  m.box(1.1, 0.7, 0.8, 0xe8dcc8, 0, 0, 0);
  for (const s of [-1, 1]) {
    m.cone(0.14, 1.9, 0xf4ead8, s * 1.2, 0.35, 0, 7, 0, -s * 1.2);
    m.cone(0.1, 0.8, 0xf4ead8, s * 2.05, 0.9, 0, 7, 0, -s * 0.2);
  }
  m.pop();
  const frame = new THREE.Mesh(m.bake(), propMaterial());
  g.add(frame);
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(10.6, 2.0),
    new THREE.MeshBasicMaterial({ map: signTexture(kind === 'finish' ? 'FINISH' : 'GO WEST!', kind), toneMapped: false }),
  );
  sign.position.set(0, 6.9, 0.27);
  g.add(sign);
  const back = sign.clone();
  back.rotation.y = Math.PI;
  back.position.z = -0.07;
  g.add(back);
  g.visible = false;
  return g;
}
