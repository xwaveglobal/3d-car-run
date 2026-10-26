/*
 * v4.0.2 — the first code in tiktok/game.js (prepended by scripts/build-tiktok.mjs; plain ES2017, no imports).
 * Owner video + TikTok review: a grey / black screen for ~1 s before the loading art. This shows the art at
 * once — before three.js and the game are even set up — then starts the game (wrapped as __runGame):
 *  1. takes THE on-screen canvas (the first tt.createCanvas() call) and paints the art's warm desert tone;
 *  2. decodes the loading art and draws it full-screen with a tiny WebGL pass (the same context three.js
 *     then reuses; every GL object made here is deleted and the state reset to defaults);
 *  3. starts the game right after (never more than 700 ms later, even if the art fails).
 * Nothing here can throw out: any problem just starts the game.
 */
(function () {
  var G = typeof GameGlobal !== 'undefined' ? GameGlobal : globalThis;
  var T = G.tt;
  var ART = '__LOADING_ART__';
  var started = false;
  function run() {
    if (started) return;
    started = true;
    try {
      G.__runGame();
    } catch (e) {
      try { console.error('[loader] the game could not start', e); } catch (e2) { /* no console */ }
    }
  }
  function drawArt(gl, img, W, H) {
    var vs = 'attribute vec2 p; uniform vec4 r; varying vec2 v; void main(){ v = r.xy + (vec2(p.x, -p.y) * 0.5 + 0.5) * r.zw; gl_Position = vec4(p, 0.0, 1.0); }';
    var fs = 'precision mediump float; varying vec2 v; uniform sampler2D t; void main(){ gl_FragColor = vec4(texture2D(t, v).rgb, 1.0); }';
    function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; }
    var a = sh(gl.VERTEX_SHADER, vs), b = sh(gl.FRAGMENT_SHADER, fs);
    var pr = gl.createProgram();
    gl.attachShader(pr, a); gl.attachShader(pr, b); gl.linkProgram(pr);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.useProgram(pr);
    var loc = gl.getAttribLocation(pr, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    // "cover": fill the screen, crop the overflow evenly (like the loading screen of the game)
    var sa = W / H, ia = img.width / img.height, x0 = 0, y0 = 0, w = 1, h = 1;
    if (ia > sa) { w = sa / ia; x0 = (1 - w) / 2; } else { h = ia / sa; y0 = (1 - h) / 2; }
    gl.uniform4f(gl.getUniformLocation(pr, 'r'), x0, y0, w, h);
    gl.uniform1i(gl.getUniformLocation(pr, 't'), 0);
    gl.viewport(0, 0, W, H);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    // leave the context exactly as a fresh one (three.js takes it over next)
    gl.disableVertexAttribArray(loc);
    gl.useProgram(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.deleteTexture(tex); gl.deleteBuffer(buf); gl.deleteProgram(pr); gl.deleteShader(a); gl.deleteShader(b);
  }
  try {
    if (!T || typeof T.createCanvas !== 'function') return run();
    var cv = T.createCanvas();
    G.__screenCanvas = cv;
    var info = {};
    try { info = T.getSystemInfoSync() || {}; } catch (e) { /* defaults */ }
    var dpr = Math.min(3, info.pixelRatio || 2);
    var W = Math.round((info.windowWidth || 390) * dpr), H = Math.round((info.windowHeight || 844) * dpr);
    cv.width = W;
    cv.height = H;
    // the same context three.js asks for first (src/render/Renderer.ts makeRenderer) — it gets this one back
    var gl = null;
    try { gl = cv.getContext('webgl2', { alpha: false, depth: true, stencil: false, antialias: true, premultipliedAlpha: true, preserveDrawingBuffer: false, powerPreference: 'high-performance' }); } catch (e) { gl = null; }
    if (gl) {
      gl.viewport(0, 0, W, H);
      gl.clearColor(0.62, 0.42, 0.22, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    var img = typeof T.createImage === 'function' ? T.createImage() : null;
    if (!img) return run();
    img.onload = function () {
      img._ok = true;
      (G.__preImages = G.__preImages || {})[ART] = img;
      try { if (gl && !started) drawArt(gl, img, W, H); } catch (e) { /* the colour stays */ }
      setTimeout(run, 16); // let the art reach the screen, then build the game under it
    };
    img.onerror = run;
    img.src = ART;
    setTimeout(run, 700); // never wait on the picture longer than this
  } catch (e) {
    run();
  }
})();
