// v1.0.5: shrinks the shipped X1 GLB without touching its look —
//   NORMAL     float32 VEC3 → int8 normalized (byteStride 4)
//   TEXCOORD_0 all-zero      → accessor without a bufferView (zeros by the glTF spec)
// usage: node scripts/car/pack-x1.mjs [in.glb] [out.glb]   (default: src/assets/models/xwave-x1.glb in place)
// the reader is src/render/car/glbParse.ts. Run it again after scripts/car/build-x1.mjs.
import { readFileSync, writeFileSync } from 'node:fs';
const inp = process.argv[2] ?? 'src/assets/models/xwave-x1.glb';
const out = process.argv[3] ?? inp;
const b = readFileSync(inp);
const jl = b.readUInt32LE(12);
const j = JSON.parse(b.subarray(20, 20 + jl).toString('utf8'));
const binStart = 20 + jl + 8;
const bin = b.subarray(binStart, binStart + b.readUInt32LE(20 + jl));
const SZ = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
const EL = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
const role = new Map(); // accessor → attribute name
for (const m of j.meshes) for (const p of m.primitives) for (const [k, v] of Object.entries(p.attributes)) role.set(v, k);
const chunks = [];
let off = 0;
const views = [];
const push = (buf, stride, target) => {
  const pad = (4 - (off % 4)) % 4;
  if (pad) { chunks.push(Buffer.alloc(pad)); off += pad; }
  const v = { buffer: 0, byteOffset: off, byteLength: buf.length };
  if (stride) v.byteStride = stride;
  if (target) v.target = target;
  views.push(v); chunks.push(buf); off += buf.length;
  return views.length - 1;
};
const read = (a) => {
  const bv = j.bufferViews[a.bufferView];
  const n = SZ[a.type], el = EL[a.componentType], stride = bv.byteStride ?? n * el;
  const base = (bv.byteOffset ?? 0) + (a.byteOffset ?? 0);
  const vals = new Float64Array(a.count * n);
  for (let k = 0; k < a.count; k++) for (let c = 0; c < n; c++) {
    const o = base + k * stride + c * el;
    vals[k * n + c] = a.componentType === 5126 ? bin.readFloatLE(o) : a.componentType === 5123 ? bin.readUInt16LE(o) : a.componentType === 5125 ? bin.readUInt32LE(o) : a.componentType === 5121 ? bin.readUInt8(o) : a.componentType === 5122 ? bin.readInt16LE(o) : bin.readInt8(o);
  }
  return vals;
};
const viewUsers = new Map();
j.accessors.forEach((a, i) => { if (a.bufferView !== undefined) viewUsers.set(a.bufferView, [...(viewUsers.get(a.bufferView) ?? []), i]); });
const newView = new Map(); // old view → new view (for untouched, non-accessor views like images)
let saved = 0;
j.accessors.forEach((a, i) => {
  if (a.bufferView === undefined) return;
  const r = role.get(i);
  if (r === 'NORMAL' && a.componentType === 5126 && a.type === 'VEC3') {
    const v = read(a);
    const buf = Buffer.alloc(a.count * 4);
    for (let k = 0; k < a.count; k++) {
      const x = v[k * 3], y = v[k * 3 + 1], z = v[k * 3 + 2];
      const l = Math.hypot(x, y, z) || 1;
      buf.writeInt8(Math.round((x / l) * 127), k * 4); buf.writeInt8(Math.round((y / l) * 127), k * 4 + 1); buf.writeInt8(Math.round((z / l) * 127), k * 4 + 2);
    }
    saved += a.count * 12 - buf.length;
    a.bufferView = push(buf, 4, 34962); a.componentType = 5120; a.normalized = true; delete a.byteOffset;
    a.max = [1, 1, 1]; a.min = [-1, -1, -1];
    return;
  }
  if (r === 'TEXCOORD_0' && a.componentType === 5126 && read(a).every((x) => x === 0)) {
    saved += a.count * 8; delete a.bufferView; delete a.byteOffset; return;
  }
  // copy the accessor's data as a tight view
  const bv = j.bufferViews[a.bufferView];
  const n = SZ[a.type], el = EL[a.componentType], stride = bv.byteStride ?? n * el;
  const base = (bv.byteOffset ?? 0) + (a.byteOffset ?? 0);
  const len = stride * (a.count - 1) + n * el;
  a.bufferView = push(Buffer.from(bin.subarray(base, base + len)), bv.byteStride, bv.target); delete a.byteOffset;
});
// images (and any other view not used by an accessor)
j.bufferViews.forEach((bv, i) => {
  if (viewUsers.has(i)) return;
  newView.set(i, push(Buffer.from(bin.subarray(bv.byteOffset ?? 0, (bv.byteOffset ?? 0) + bv.byteLength)), bv.byteStride, bv.target));
});
for (const im of j.images ?? []) if (im.bufferView !== undefined) im.bufferView = newView.get(im.bufferView);
j.bufferViews = views;
const binOut = Buffer.concat(chunks);
const binPad = Buffer.concat([binOut, Buffer.alloc((4 - (binOut.length % 4)) % 4)]);
j.buffers = [{ byteLength: binPad.length }];
let js = Buffer.from(JSON.stringify(j), 'utf8');
js = Buffer.concat([js, Buffer.alloc((4 - (js.length % 4)) % 4, 0x20)]);
const head = Buffer.alloc(12); head.writeUInt32LE(0x46546c67, 0); head.writeUInt32LE(2, 4);
const total = 12 + 8 + js.length + 8 + binPad.length; head.writeUInt32LE(total, 8);
const c1 = Buffer.alloc(8); c1.writeUInt32LE(js.length, 0); c1.writeUInt32LE(0x4e4f534a, 4);
const c2 = Buffer.alloc(8); c2.writeUInt32LE(binPad.length, 0); c2.writeUInt32LE(0x004e4942, 4);
writeFileSync(out, Buffer.concat([head, c1, js, c2, binPad]));
console.log(`${inp}: ${b.length} → ${total} bytes (−${Math.round((b.length - total) / 1024)} KB, attributes −${Math.round(saved / 1024)} KB)`);
