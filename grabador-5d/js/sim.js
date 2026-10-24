/* Simulación: codificación 5D/3D, secuencias de escritura+validación y lectura, vista del microscopio. */
(function () {
  const T = THREE, L5 = window.L5, G = L5.G;
  const N = G.grid * G.grid * G.layers;
  const S = () => L5.state;

  // enc3d: codificación del 3D económico → 1 = presencia, 2 = posición dentro de la celda, 3 = posición + tamaño
  L5.cfg = { mode5D: true, noise: 'bajo', enc3d: 1 };
  // p = desvío del centroide medido, en fracciones del corrimiento
  const NOISE = { bajo: { th: 4, de: 0.05, b: 0.08, p: 0.18 }, medio: { th: 12, de: 0.12, b: 0.2, p: 0.38 }, alto: { th: 21, de: 0.2, b: 0.33, p: 0.6 } };
  L5.bpv = () => (L5.cfg.mode5D ? 3 : L5.cfg.enc3d);   // bits por voxel/celda
  const ppm = () => !L5.cfg.mode5D && L5.cfg.enc3d > 1; // modulación por posición
  // 4 posiciones dentro de la celda (vistas desde la cámara), en código Gray: dos posiciones vecinas
  // difieren en 1 solo bit, así que confundir una marca con la de al lado cuesta 1 bit y no 2
  const POS = (L5.POS = [[1, 0], [0, 1], [0, -1], [-1, 0]]); // 00 derecha, 01 abajo, 10 arriba, 11 izquierda
  L5.POS_NAMES = ['hacia la derecha', 'hacia abajo', 'hacia arriba', 'hacia la izquierda'];
  const shift = () => 0.24 * G.pitch;

  const grid = (L5.grid = []);
  const resetGrid = () => { grid.length = 0; for (let i = 0; i < N; i++) grid.push({ w: false, ori: 0, ret: 0, pos: 0, size: 0, age: 1, read: null, err: false }); };
  resetGrid();

  const idx = (L, r, c) => L * 64 + r * 8 + c;
  // orden de escritura: capa más profunda primero (el haz no atraviesa voxels ya escritos), serpentina
  const slot = (L5.slot = function (k) {
    const L = G.layers - 1 - Math.floor(k / 64), kk = k % 64, r = Math.floor(kk / 8);
    let c = kk % 8; if (r % 2) c = 7 - c;
    return { L, r, c, i: idx(L, r, c) };
  });
  const localPos = (L, r, c) => ({ u: (c - 3.5) * G.pitch, w: (r - 3.5) * G.pitch, y: (1.5 - L) * G.layerGap });
  const zFor = (L) => G.dataY + (1.5 - L) * G.layerGap - (G.cy0 - G.focusOff);

  function crc8(bytes) {
    let c = 0;
    for (const b of bytes) { c ^= b; for (let i = 0; i < 8; i++) c = c & 0x80 ? ((c << 1) ^ 0x07) & 0xff : (c << 1) & 0xff; }
    return c;
  }
  L5.capacity = () => Math.floor((N * L5.bpv()) / 8) - 2;

  function encodeText(text) {
    const cap = L5.capacity();
    let data = Array.from(new TextEncoder().encode(text));
    while (data.length > cap) { text = text.slice(0, -1); data = Array.from(new TextEncoder().encode(text)); }
    const bytes = [data.length].concat(data, [crc8(data)]);
    const bits = [];
    bytes.forEach((b) => { for (let i = 7; i >= 0; i--) bits.push((b >> i) & 1); });
    const symbols = [];
    if (L5.cfg.mode5D) {
      for (let i = 0; i < bits.length; i += 3) {
        const b0 = bits[i] || 0, b1 = bits[i + 1] || 0, b2 = bits[i + 2] || 0;
        symbols.push({ ori: b0 * 2 + b1, ret: b2 });
      }
    } else if (ppm()) {
      const n = L5.cfg.enc3d;
      for (let i = 0; i < bits.length; i += n) {
        const b0 = bits[i] || 0, b1 = bits[i + 1] || 0, b2 = n === 3 ? bits[i + 2] || 0 : 0;
        symbols.push({ pos: b0 * 2 + b1, size: b2 });
      }
    } else bits.forEach((b) => symbols.push({ bit: b }));
    return { text, bytes, bits, symbols };
  }
  function decodeBits(bits) {
    if (bits.length < 8) return { ok: false, text: '', reason: 'sin datos' };
    let n = 0; for (let i = 0; i < 8; i++) n = (n << 1) | bits[i];
    const need = (n + 2) * 8;
    const bytes = [];
    for (let k = 0; k + 8 <= Math.min(bits.length, need); k += 8) { let b = 0; for (let i = 0; i < 8; i++) b = (b << 1) | bits[k + i]; bytes.push(b); }
    const data = bytes.slice(1, 1 + n);
    const text = new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(data));
    if (bits.length < need) return { ok: false, partial: true, text, n };
    const ok = crc8(data) === bytes[n + 1];
    return { ok, text, n, reason: ok ? '' : 'CRC no coincide' };
  }

  // ---------- Dibujo de voxels ----------
  const m4 = new T.Matrix4(), q = new T.Quaternion(), p3 = new T.Vector3(), s3 = new T.Vector3(), col = new T.Color();
  const yAxis = new T.Vector3(0, 1, 0);
  function voxelMatrix(i, extraScale) {
    const g = grid[i];
    const L = Math.floor(i / 64), r = Math.floor((i % 64) / 8), c = i % 8;
    const lp = localPos(L, r, c);
    p3.set(lp.u, lp.y, lp.w);
    const grow = Math.min(1, g.age / 0.25);
    const e = extraScale || 1;
    if (L5.cfg.mode5D) {
      q.setFromAxisAngle(yAxis, (g.ori * 45 * Math.PI) / 180);
      const k = 0.85 + 0.3 * g.ret;
      s3.set(0.6 * k, 1.15 * k, 0.28 * k).multiplyScalar(grow * e);
    } else if (ppm()) {
      q.identity();
      p3.x += POS[g.pos][0] * shift(); p3.z += POS[g.pos][1] * shift();
      const k = L5.cfg.enc3d === 3 ? (g.size ? 1.15 : 0.68) : 0.8;
      s3.set(0.34 * k, 0.62 * k, 0.34 * k).multiplyScalar(grow * e);
    } else { q.identity(); s3.set(0.42, 0.75, 0.42).multiplyScalar(grow * e); }
    m4.compose(p3, q, s3);
    return m4;
  }
  const hueOf = (g) => col.setHSL(g.ori / 4, 1, g.ret ? 0.58 : 0.42);
  L5.voxelColorsMain = function () {
    const V = L5.voxels, pol = L5.ui && L5.ui.polView, t = performance.now() / 1000;
    for (let i = 0; i < N; i++) {
      const g = grid[i];
      if (!g.w) { V.setMatrixAt(i, m4.makeScale(0, 0, 0)); continue; }
      V.setMatrixAt(i, voxelMatrix(i));
      if (g.err) col.setRGB(1, 0.15 + 0.15 * Math.sin(t * 8), 0.15);
      else if (pol && L5.cfg.mode5D) hueOf(g);
      else if (pol && ppm()) col.setHSL(g.pos / 4, 1, g.size ? 0.6 : 0.45);
      else col.setRGB(0.25, 0.8, 1).multiplyScalar(0.8 + 0.25 * (g.ret || 0));
      if (g.age < 0.35) col.setRGB(1, 0.75, 0.85);
      V.setColorAt(i, col);
    }
    V.instanceMatrix.needsUpdate = true; if (V.instanceColor) V.instanceColor.needsUpdate = true;
  };
  // Vista del microscopio: intensidad según analizador y desenfoque por capa
  L5.voxelColorsMic = function () {
    const V = L5.voxels, st = S(), mic = L5.mic;
    const fy = G.cy0 - G.focusOff + st.Zoff;
    const bg = mic.bg;
    for (let i = 0; i < N; i++) {
      const g = grid[i];
      if (!g.w) continue;
      const L = Math.floor(i / 64);
      const vy = G.dataY + (1.5 - L) * G.layerGap;
      const dz = Math.abs(vy - fy) / G.layerGap;
      const att = Math.exp(-dz * dz * 2.4);
      let I;
      if (mic.mode === 'pol' && L5.cfg.mode5D) {
        const de = g.ret ? 0.95 : 0.5, th = g.ori * 45;
        I = 0.5 + 0.5 * de * Math.sin((2 * (st.rot.ana - th) * Math.PI) / 180);
      } else if (mic.mode === 'bright') I = 0.06;
      else if (mic.mode === 'dark') I = g.size ? 1 : 0.5;   // campo oscuro: la fisura grande dispersa más luz
      else I = 1;
      const v = bg + (I - bg) * att;
      col.setRGB(v, v, v * (mic.mode === 'live' ? 1.05 : 1));
      V.setColorAt(i, col);
      V.setMatrixAt(i, voxelMatrix(i, 1 + 1.6 * (1 - att)));
    }
    V.instanceMatrix.needsUpdate = true; if (V.instanceColor) V.instanceColor.needsUpdate = true;
  };
  L5.tickVoxels = function (dt) { for (const g of grid) if (g.w && g.age < 1) g.age += dt * S().speed; };

  L5.mic = { mode: 'live', bg: 0.1, rec: 0, tile: null, layer: null };
  L5.micCam = new T.PerspectiveCamera(26, 1, 0.4, 400);
  L5.updateMicCam = function () {
    const fy = G.cy0 - G.focusOff + S().Zoff;
    L5.micCam.position.set(0, fy + 19, 0);
    L5.micCam.up.set(0, 0, -1);
    L5.micCam.lookAt(0, fy, 0);
  };

  // ---------- Registro tipo G-code ----------
  const log = (L5.gcode = function (line, cls) { if (L5.ui) L5.ui.log(line, cls); });
  const phase = (name) => { L5.job.phase = name; if (L5.ui) L5.ui.onPhase(name); };
  const f3 = (v) => (v >= 0 ? ' ' : '') + v.toFixed(3);

  L5.job = { kind: null, phase: 'Listo', done: 0, total: 0, text: '', result: null, decoded: '' };

  async function home() {
    phase('Homing');
    log('G28 ; homing X Y Z (finales de carrera)');
    await L5.moveTo({ Zoff: G.home.Zoff });
    await L5.moveTo({ X: G.home.X, Y: G.home.Y }, 110);
    await Promise.all([L5.rotTo('hwp1', 0), L5.rotTo('hwp2', 0), L5.rotTo('ana', 0)]);
  }

  async function fire(sym, i) {
    const st = S();
    st.firing = 1;
    let line = 'M3 S100 ; pulso ns → microfractura';
    if (L5.cfg.mode5D) line = `M3 S${sym.ret ? 85 : 45} ; ráfaga fs → nanorrejilla θ=${sym.ori * 45}° δ=${sym.ret ? 'alta' : 'baja'}`;
    else if (ppm()) line = `M3 S${L5.cfg.enc3d === 3 ? (sym.size ? 100 : 55) : 80} ; pulso ns → marca corrida ${L5.POS_NAMES[sym.pos]}${L5.cfg.enc3d === 3 ? (sym.size ? ', grande' : ', chica') : ''}`;
    log(line, 'fire');
    await L5.wait(0.13);
    const g = grid[i]; g.w = true; g.age = 0; g.ori = sym.ori || 0; g.ret = sym.ret || 0; g.pos = sym.pos || 0; g.size = sym.size || 0; g.err = false; g.read = null;
    st.firing = 0;
    await L5.wait(0.03);
  }

  L5.clearCrystal = function () { resetGrid(); L5.job.result = null; L5.job.decoded = ''; if (L5.ui) L5.ui.drawBitmap(); };

  L5.runWrite = async function (text) {
    const st = S();
    if (st.busy) return;
    st.busy = true; st.abort = false;
    L5.clearCrystal();
    const enc = encodeText(text);
    const toWrite = [];
    enc.symbols.forEach((sym, k) => { if (L5.cfg.mode5D || ppm() || sym.bit) toWrite.push({ k, sym }); });
    Object.assign(L5.job, { kind: 'write', done: 0, total: toWrite.length, text: enc.text, enc, result: null, decoded: '' });
    if (L5.ui) L5.ui.onJob();
    log(`; ===== ESCRITURA ${L5.cfg.mode5D ? '5D' : '3D · ' + L5.bpv() + ' bit(s)/celda'} · ${enc.bytes.length} bytes (largo + datos + CRC8) · ${enc.bits.length} bits → ${toWrite.length} voxels =====`, 'hdr');
    try {
      await home();
      phase('Escritura');
      st.laser = 1; L5.mic.mode = 'live';
      log('M3 S0 ; láser armado, compuerta TTL cerrada');
      let curL = -1;
      for (const { k, sym } of toWrite) {
        const s = slot(k), lp = localPos(s.L, s.r, s.c);
        if (s.L !== curL) {
          curL = s.L;
          log(`G1 Z${f3(zFor(s.L))} F300 ; enfocar capa ${s.L + 1} (profundidad ${((1.5 - s.L) * -G.layerGap + G.layerGap * 1.5 + 5.5).toFixed(1)} u)`);
          await L5.moveTo({ Zoff: zFor(s.L) });
        }
        // con modulación por posición el disparo se corre un poco dentro de su celda
        const dx = ppm() ? POS[sym.pos][0] * shift() : 0, dz = ppm() ? POS[sym.pos][1] * shift() : 0;
        log(`G1 X${f3(-(lp.u + dx))} Y${f3(-(lp.w + dz))} F1200${ppm() ? ' ; celda + corrimiento' : ''}`);
        await L5.moveTo({ X: -(lp.u + dx), Y: -(lp.w + dz) }, 90);
        if (L5.cfg.mode5D) {
          const th = sym.ori * 45;
          log(`M280 P1 S${(th / 2).toFixed(1)} ; λ/2 a ${(th / 2).toFixed(1)}° → polarización ${th}°`);
          await Promise.all([L5.rotTo('hwp2', th / 2), L5.rotTo('hwp1', sym.ret ? 32 : 14)]);
        }
        await fire(sym, s.i);
        L5.job.done++;
        if (L5.ui) L5.ui.onProgress();
      }
      st.laser = 0;
      log('M5 ; láser desarmado');
      await validate(enc);
    } catch (e) {
      if (e.message !== 'abort') { console.error(e); log('; error: ' + e.message, 'err'); }
      else log('; ⏹ detenido por el usuario', 'err');
      phase('Detenido');
    } finally { st.busy = false; st.laser = 0; st.firing = 0; st.backlight = 0; L5.mic.mode = 'live'; L5.mic.tile = null; if (L5.ui) L5.ui.onJob(); }
  };

  // Medición de un voxel (con ruido óptico simulado)
  const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  function measure(i) {
    const g = grid[i], nz = NOISE[L5.cfg.noise];
    if (L5.cfg.mode5D) {
      const de = g.w ? (g.ret ? 0.9 : 0.45) + gauss() * nz.de : Math.abs(gauss() * 0.04);
      if (de < 0.2) return { w: false };
      let th = (g.ori * 45 + gauss() * nz.th) % 180; if (th < 0) th += 180;
      return { w: true, th, de, ori: Math.round(th / 45) % 4, ret: de > 0.67 ? 1 : 0 };
    }
    const b = (g.w ? 1 : 0) + gauss() * nz.b;
    if (ppm()) {
      if (b < 0.5) return { w: false };
      // centroide medido = corrimiento real + ruido → se elige la posición más cercana
      const mx = POS[g.pos][0] + gauss() * nz.p, mz = POS[g.pos][1] + gauss() * nz.p;
      let pos = 0, best = -1e9;
      POS.forEach(([x, z], k) => { const d = x * mx + z * mz; if (d > best) { best = d; pos = k; } });
      const s = (g.size ? 1 : 0.55) + gauss() * nz.b;
      return { w: true, pos, size: L5.cfg.enc3d === 3 && s > 0.775 ? 1 : 0, mx, mz };
    }
    return { w: b > 0.5, b, bit: b > 0.5 ? 1 : 0 };
  }

  async function scan(layers, onlyWritten, label) {
    const st = S();
    const dark = !L5.cfg.mode5D && L5.cfg.enc3d === 3;
    st.backlight = dark ? 2 : 1; // 2 = anillo de costado: la luz de fondo queda apagada
    L5.mic.mode = L5.cfg.mode5D ? 'pol' : dark ? 'dark' : 'bright';
    L5.mic.bg = L5.cfg.mode5D ? 0.5 : dark ? 0.07 : 0.82;
    log(`M106 S255 ; ${L5.cfg.mode5D ? 'luz de fondo con polarizador circular' : dark ? 'anillo LED de costado (campo oscuro): el brillo da el tamaño' : ppm() ? 'campo claro: se mide el centroide de cada marca' : 'luz de fondo, campo claro'} ON`);
    for (const L of layers) {
      L5.mic.layer = L;
      log(`G1 Z${f3(zFor(L))} F300 ; ${label}: capa ${L + 1}`);
      await L5.moveTo({ Zoff: zFor(L) });
      const tiles = [[0, 0], [0, 1], [1, 1], [1, 0]];
      for (const [tr, tc] of tiles) {
        const ids = [];
        for (let r = tr * 4; r < tr * 4 + 4; r++) for (let c = tc * 4; c < tc * 4 + 4; c++) ids.push(idx(L, r, c));
        if (onlyWritten && !ids.some((i) => grid[i].w || grid[i].expect)) continue;
        const u = (tc * 4 + 1.5 - 3.5) * G.pitch, w = (tr * 4 + 1.5 - 3.5) * G.pitch;
        L5.mic.tile = { L, tr, tc };
        log(`G1 X${f3(-u)} Y${f3(-w)} F900 ; mosaico ${tr * 2 + tc + 1}/4`);
        await L5.moveTo({ X: -u, Y: -w }, 80);
        if (L5.cfg.mode5D) {
          for (const a of [0, 45, 90, 135]) {
            log(`M280 P2 S${a} ; analizador ${a}° · captura`);
            await L5.rotTo('ana', a);
            L5.mic.rec = 1; await L5.wait(0.1); L5.mic.rec = 0;
          }
        } else { log('; captura campo claro'); L5.mic.rec = 1; await L5.wait(0.14); L5.mic.rec = 0; }
        for (const i of ids) grid[i].read = measure(i);
        if (L5.ui) { L5.ui.drawBitmap(); L5.ui.onProgress(); }
      }
      if (L5.onLayerRead) L5.onLayerRead(L);
    }
    st.backlight = 0; L5.mic.tile = null;
    log('M107 ; luz de fondo OFF');
  }

  // Reconstruye bits a partir de lo leído, en orden de escritura
  function bitsFromRead(maxK) {
    const bits = [];
    for (let k = 0; k < Math.min(N, maxK || N); k++) {
      const g = grid[slot(k).i], r = g.read;
      if (!r) break;
      if (L5.cfg.mode5D) { if (!r.w) break; bits.push(r.ori >> 1, r.ori & 1, r.ret); }
      else if (ppm()) { if (!r.w) break; bits.push(r.pos >> 1, r.pos & 1); if (L5.cfg.enc3d === 3) bits.push(r.size); }
      else bits.push(r.bit);
    }
    return bits;
  }

  async function validate(enc) {
    phase('Validación');
    log('; ===== VALIDACIÓN: re-lectura con la cámara coaxial =====', 'hdr');
    const usedK = enc.symbols.length;
    const layers = [];
    for (let k = 0; k < usedK; k++) { const L = slot(k).L; if (!layers.includes(L)) layers.push(L); }
    enc.symbols.forEach((sym, k) => { grid[slot(k).i].expect = true; });
    await scan(layers, true, 'validación');
    let symErr = 0, bitErr = 0;
    enc.symbols.forEach((sym, k) => {
      const g = grid[slot(k).i], r = g.read || {};
      let e = 0;
      if (L5.cfg.mode5D) {
        const ro = r.w ? r.ori : -1, rr = r.w ? r.ret : -1;
        if (ro !== sym.ori) e += ro < 0 ? 2 : ((ro ^ sym.ori) & 2 ? 1 : 0) + ((ro ^ sym.ori) & 1 ? 1 : 0);
        if (rr !== sym.ret) e += 1;
      } else if (ppm()) {
        if (!r.w) e = L5.cfg.enc3d;
        else {
          const x = r.pos ^ sym.pos; e = (x & 1) + ((x >> 1) & 1);
          if (L5.cfg.enc3d === 3 && r.size !== sym.size) e += 1;
        }
      } else if ((r.bit || 0) !== sym.bit) e = 1;
      g.err = e > 0; if (e) { symErr++; bitErr += e; }
    });
    const dec = decodeBits(bitsFromRead(usedK).slice(0, enc.bits.length));
    const res = { kind: 'validate', bits: enc.bits.length, bitErr, symErr, ber: bitErr / enc.bits.length, crcOk: dec.ok, text: dec.text, expected: enc.text };
    L5.job.result = res; L5.job.decoded = dec.text;
    log(bitErr === 0 && dec.ok ? `; ✔ VALIDADO · 0 errores en ${enc.bits.length} bits · CRC OK` : `; ✖ ${bitErr} bit(s) con error en ${symErr} voxel(s) · BER ${(res.ber * 100).toFixed(2)}% · CRC ${dec.ok ? 'OK' : 'FALLA'}`, bitErr === 0 && dec.ok ? 'ok' : 'err');
    phase(bitErr === 0 && dec.ok ? 'Validado ✔' : 'Validación con errores');
    if (L5.ui) L5.ui.onResult();
  }

  L5.runRead = async function () {
    const st = S();
    if (st.busy) return;
    if (!grid.some((g) => g.w)) { if (L5.ui) L5.ui.toast('El cristal está vacío: grabá un mensaje o cargá el cristal de ejemplo.'); return; }
    st.busy = true;
    grid.forEach((g) => { g.read = null; g.err = false; g.expect = false; });
    Object.assign(L5.job, { kind: 'read', done: 0, total: G.layers * 4, result: null, decoded: '' });
    if (L5.ui) L5.ui.onJob();
    log(`; ===== LECTURA ${L5.cfg.mode5D ? '5D (microscopía de polarización)' : ['', '3D · 1 bit (campo claro)', '3D · 2 bits (posición del centroide)', '3D · 3 bits (posición + brillo en campo oscuro)'][L5.cfg.enc3d]} =====`, 'hdr');
    try {
      await home();
      phase('Lectura');
      L5.onLayerRead = () => {
        const dec = decodeBits(bitsFromRead());
        L5.job.decoded = dec.text;
        if (L5.ui) L5.ui.onDecoded(dec);
      };
      const layers = [3, 2, 1, 0];
      // termina antes si la capa siguiente no tiene datos
      for (const L of layers) {
        if (!grid.slice(L * 64, L * 64 + 64).some((g) => g.w)) { log(`; capa ${L + 1} vacía → fin de datos`); break; }
        await scan([L], false, 'lectura');
      }
      const dec = decodeBits(bitsFromRead());
      L5.job.result = { kind: 'read', crcOk: dec.ok, text: dec.text, n: dec.n, reason: dec.reason };
      L5.job.decoded = dec.text;
      log(dec.ok ? `; ✔ LEÍDO · ${dec.n} bytes · CRC OK` : `; ✖ lectura incompleta o corrupta (${dec.reason || 'faltan bits'})`, dec.ok ? 'ok' : 'err');
      phase(dec.ok ? 'Leído ✔' : 'Lectura con errores');
      if (L5.ui) L5.ui.onResult();
    } catch (e) {
      if (e.message !== 'abort') { console.error(e); log('; error: ' + e.message, 'err'); }
      else log('; ⏹ detenido por el usuario', 'err');
      phase('Detenido');
    } finally { L5.onLayerRead = null; st.busy = false; st.backlight = 0; L5.mic.mode = 'live'; L5.mic.tile = null; if (L5.ui) L5.ui.onJob(); }
  };

  L5.loadExample = function (text) {
    L5.clearCrystal();
    const enc = encodeText(text);
    enc.symbols.forEach((sym, k) => {
      if (!L5.cfg.mode5D && !ppm() && !sym.bit) return;
      const g = grid[slot(k).i]; g.w = true; g.age = 1; g.ori = sym.ori || 0; g.ret = sym.ret || 0; g.pos = sym.pos || 0; g.size = sym.size || 0;
    });
    L5.job.text = enc.text;
    if (L5.ui) L5.ui.drawBitmap();
  };

  // para las calibraciones del armado (assembly.js)
  L5.simApi = { zFor, localPos, fire, idx, shift, home, phase, POS, measure };

  L5.stop = function () { const st = S(); if (!st.busy) return; L5.abortAll(); };
  L5.goHome = async function () { if (S().busy) return; S().busy = true; try { await home(); phase('Listo'); } catch (e) {} finally { S().busy = false; if (L5.ui) L5.ui.onJob(); } };
})();
