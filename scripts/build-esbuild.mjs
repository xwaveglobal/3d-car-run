// Fallback build without Vite (used in CI / sandboxes with esbuild only).
//   node scripts/build-esbuild.mjs            -> dist-esbuild/index.html (+ JS/CSS files)
//   node scripts/build-esbuild.mjs --single   -> dist-esbuild/3d-car-run.html (one self-contained file)
//   node scripts/build-esbuild.mjs --web      -> dist-web/ (v1.0.9: for a web server — images, model and fonts as
//                                                separate cached files in assets/, small main.js)
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let out = join(root, 'dist-esbuild');
const single = process.argv.includes('--single');
const web = process.argv.includes('--web');
if (web) out = join(root, 'dist-web');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const res = await build({
  entryPoints: [join(root, 'src/main.ts')],
  bundle: true,
  format: 'esm',
  target: 'es2020',
  minify: true,
  sourcemap: false,
  write: false,
  outdir: out,
  loader: web
    ? { '.webp': 'file', '.png': 'file', '.jpg': 'file', '.glb': 'file', '.woff': 'file', '.woff2': 'file', '.ttf': 'file' }
    : { '.webp': 'dataurl', '.png': 'dataurl', '.jpg': 'dataurl', '.glb': 'dataurl', '.woff': 'dataurl' },
  assetNames: 'assets/[name]-[hash]',
  plugins: single
    ? [
        {
          // one-file build: swap GLTFLoader for a stub (see scripts/stubs/GLTFLoader.js)
          name: 'stub-gltf',
          setup(b) {
            b.onResolve({ filter: /GLTFLoader\.js$/ }, () => ({ path: join(root, 'scripts/stubs/GLTFLoader.js') }));
          },
        },
      ]
    : [],
  legalComments: 'none',
  define: { 'process.env.NODE_ENV': '"production"' },
  logLevel: 'warning',
});

let js = '';
let css = '';
for (const f of res.outputFiles) {
  if (f.path.endsWith('.js')) js = f.text;
  else if (f.path.endsWith('.css')) css = f.text;
  else if (web) {
    mkdirSync(dirname(f.path), { recursive: true });
    writeFileSync(f.path, f.contents);
  }
}

let html = readFileSync(join(root, 'index.html'), 'utf8');
if (single) {
  const safeJs = js.replace(/<\/script/gi, '<\\/script');
  const dataUri = (f) => 'data:image/png;base64,' + readFileSync(join(root, 'public', f)).toString('base64');
  html = html
    // one file: inline the small icons, drop links that need separate files
    .replace(/<link rel="icon"[^>]*sizes="192x192"[^>]*>\s*/, '')
    .replace(/<link rel="manifest"[^>]*>\s*/, '')
    .replace('/icons/favicon-32.png', () => dataUri('icons/favicon-32.png'))
    .replace('/icons/apple-touch-icon.png', () => dataUri('icons/apple-touch-icon.png'))
    // replacer functions: minified code contains `$&`-style sequences String.replace would expand
    .replace('</head>', () => `<style>${css}</style>\n  </head>`)
    .replace(/<script type="module" src="\/src\/main.ts"><\/script>/, () => `<script type="module">${safeJs}</script>`);
  writeFileSync(join(out, '3d-car-run.html'), html);
  console.log(`single file: ${(html.length / 1024).toFixed(0)} KB`);
} else {
  cpSync(join(root, 'public'), out, { recursive: true });
  writeFileSync(join(out, 'main.js'), js);
  writeFileSync(join(out, 'main.css'), css);
  html = html
    .replace('</head>', `<link rel="stylesheet" href="./main.css" />\n  </head>`)
    .replace('/src/main.ts', './main.js')
    .replaceAll('href="/', 'href="./');
  writeFileSync(join(out, 'index.html'), html);
  console.log(`js ${(js.length / 1024).toFixed(0)} KB, css ${(css.length / 1024).toFixed(0)} KB`);
}
