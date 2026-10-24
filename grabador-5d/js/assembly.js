/* Modo armado del 3D económico: cada pieza aparece animada en su paso, tornillo a tornillo,
   y al final se corren las calibraciones con la máquina en movimiento. */
(function () {
  const T = THREE, L5 = window.L5, G = L5.G;
  const A = (L5.asm = { active: false, idx: 0, t: 0, running: false, auto: false, speed: 1, ghost: false, steps: [] });
  const ease = (x) => 1 - Math.pow(1 - x, 3);
  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const v3 = (x, y, z) => new T.Vector3(x, y, z);

  // ---------------- Definición de pasos ----------------
  const TOOLS = {
    allen4: 'Llave allen 4 mm (M5)', allen25: 'Llave allen 2,5 mm (M3)', allen2: 'Llave allen 2 mm (prisioneros)', escuadra: 'Escuadra',
    cinta: 'Cinta métrica', calibre: 'Calibre', sierra: 'Sierra con disco para aluminio', lima: 'Lima', impresora: 'Impresora 3D',
    nivel: 'Nivel', multimetro: 'Multímetro', pelacables: 'Pelacables', soldador: 'Soldador', calor: 'Pistola de calor',
    notebook: 'Notebook', alcohol: 'Alcohol isopropílico y guantes', destornillador: 'Destornillador chico', lentes: 'Lentes OD5+ 1064 nm',
  };
  const STEPS = [
    { key: 'prep', title: 'Preparación', tools: ['sierra', 'lima', 'calibre', 'impresora', 'cinta'],
      text: 'Cortá los perfiles 2040, las varillas de 8 mm y los husillos T8 según la lista de cortes, y sacales la rebaba con lima. Imprimí las piezas en PLA+/PETG (cuna del cubo, soportes, abrazaderas del aislador y jaula del dicroico: ~10 h de impresora). Antes de empezar, separá la tornillería por paso.',
      extra: () => `<div class="cut"><b>Perfiles 2040:</b> 2×440 · 2×260 · 2×360 · 420 · 380 mm<br><b>Varillas 8 mm:</b> 2×300 · 2×260 · 2×200 mm<br><b>Husillos T8:</b> 312 · 236 · 160 mm</div>`,
      cam: { target: v3(0, 120, 0), dist: 1150 } },
    { key: 'base1', title: 'Base: perfiles largos', tools: ['escuadra'],
      text: 'Apoyá los dos perfiles de 440 mm paralelos sobre una superficie plana, con la cara de 40 mm hacia arriba. Son el frente y el fondo de la base.' },
    { key: 'base2', title: 'Base: laterales y escuadras', tools: ['allen4', 'escuadra', 'cinta'],
      text: 'Poné las tuercas T en las ranuras antes de cerrar el marco. Ubicá los laterales de 260 mm entre los largos y fijá cada esquina con una escuadra (2 tuercas T + 2 tornillos M5×10). Apretá en cruz y medí las dos diagonales: tienen que dar igual (±0,5 mm).' },
    { key: 'columnas', title: 'Columnas del pórtico', tools: ['allen4', 'escuadra'],
      text: 'Las columnas de 360 mm se paran sobre los laterales, 60 mm detrás del centro. Llevan dos escuadras cada una, adelante y atrás. Controlá con la escuadra que queden a 90° de la base antes del apriete final.' },
    { key: 'travesanoInf', title: 'Travesaño inferior del eje Z', tools: ['allen4', 'cinta'],
      text: 'El perfil de 380 mm va entre las columnas a 200 mm de altura: sostiene la chumacera y los soportes de abajo del eje Z. Lleva 4 escuadras, una abajo y otra arriba de cada punta. Medí la altura en las dos columnas para que quede horizontal.' },
    { key: 'travesanoSup', title: 'Travesaño superior', tools: ['allen4', 'nivel'],
      text: 'El perfil de 420 mm apoya sobre las columnas y se fija con 2 escuadras por debajo. Arriba va el motor Z y adelante los soportes superiores de las varillas Z.' },
    { key: 'ejeY', title: 'Eje Y: soportes SK8 y varillas', tools: ['allen4', 'calibre'],
      text: 'Atornillá 4 soportes SK8 sobre los perfiles de adelante y de atrás (2 tornillos M5 + tuercas T cada uno) y pasá las varillas de 300 mm. Dejá los tornillos flojos: las varillas tienen que quedar paralelas, así que medí la separación en las dos puntas con el calibre.' },
    { key: 'carroY', title: 'Carro Y', tools: ['allen25'],
      text: 'Entran los 4 rodamientos SC8UU en las varillas. Abajo va la tuerca anti-backlash del husillo y arriba la placa del carro (tornillos M4 a los rodamientos). Deslizá el carro de punta a punta: si no se traba, recién ahí apretá los SK8.' },
    { key: 'motorY', title: 'Eje Y: husillo, chumacera y motor', tools: ['allen25', 'allen2'],
      text: 'Van en este orden: suplemento impreso y chumacera KFL08 atrás, el husillo T8 enroscado en la tuerca del carro, el acople 5×8 adelante, el soporte en L y el NEMA 17 (4 tornillos M3). Antes de apretar los prisioneros del acople, alineá el eje del motor con el husillo: si no, el husillo "cabecea".' },
    { key: 'ejeX', title: 'Eje X sobre el carro Y', tools: ['allen4', 'calibre'],
      text: 'Arriba de la placa del carro Y van 4 soportes SK8, atornillados directo a la placa, y las 2 varillas de 260 mm. Igual que en Y: paralelas y perpendiculares a las de abajo (usá la escuadra).' },
    { key: 'carroX', title: 'Carro X', tools: ['allen25'],
      text: 'Lleva 4 rodamientos SC8UU, la tuerca del husillo X y la placa del carro X, que es la que va a cargar el cubo.' },
    { key: 'motorX', title: 'Eje X: husillo, chumacera y motor', tools: ['allen25', 'allen2'],
      text: 'Mismo procedimiento que el eje Y: chumacera con suplemento, husillo de 236 mm, acople y motor X con su soporte.' },
    { key: 'ejeZ', title: 'Eje Z: soportes y varillas', tools: ['allen4', 'escuadra'],
      text: 'Atornillá 4 soportes SK8 a la cara frontal de los travesaños, con tuercas T, y colocá las 2 varillas verticales de 200 mm. Tienen que quedar a 90° de la mesa: controlalo con la escuadra en dos direcciones.' },
    { key: 'carroZ', title: 'Carro Z', tools: ['allen25'],
      text: 'Lleva 4 rodamientos SC8UU, la tuerca del husillo Z y la placa vertical del carro, donde después va el cabezal.' },
    { key: 'motorZ', title: 'Eje Z: husillo y motor', tools: ['allen25', 'allen2'],
      text: 'Abajo van la base impresa y la chumacera, después el husillo de 160 mm y el acople, y arriba el motor Z apuntando hacia abajo, con el soporte apoyado en el travesaño superior.' },
    { key: 'cabezal', title: 'Cabezal óptico', tools: ['allen25', 'alcohol'],
      text: 'Primero el soporte impreso del cabezal y la jaula con el espejo dicroico a 45°. Abajo va el objetivo 20× y al costado el brazo de la cámara (lente de tubo + cámara USB C-mount). Las ópticas se tocan solo por el borde y con guantes.' },
    { key: 'laser', title: 'Láser de fibra', tools: ['allen25', 'lentes'],
      text: 'El aislador del láser entra en las 2 abrazaderas impresas, encima del dicroico, y su haz baja derecho al objetivo. La fuente del láser se apoya en el banco. La fibra blindada se lleva hasta el cabezal con curvas amplias (radio de más de 10 cm): nunca se dobla ni se pisa.' },
    { key: 'mesa', title: 'Mesa del cristal', tools: ['alcohol'],
      text: 'Sobre el carro X van la luz de fondo LED, la cuna impresa de 4 topes y el cubo K9 de 50 mm. Limpiá el cubo con alcohol isopropílico y guantes: la grasa de los dedos ensucia la lectura.' },
    { key: 'finales', title: 'Finales de carrera', tools: ['destornillador'],
      text: 'El final de carrera Y va atrás, el X sobre el carro Y y el Z en el travesaño superior. En el homing, cada eje se mueve hasta tocar el suyo, y ese punto queda como cero.' },
    { key: 'electronica', title: 'Electrónica', tools: ['destornillador', 'multimetro'],
      text: 'Sobre separadores van el Arduino Mega y la RAMPS 1.4, con los 3 drivers TMC2209 (ojo con la orientación: el pin EN va arriba a la izquierda) y el ventilador de 40 mm encima. Después, la fuente de 12 V, la de 24 V del láser, el pulsador de emergencia y el notebook.' },
    { key: 'cableado', title: 'Cableado', tools: ['pelacables', 'soldador', 'calor', 'multimetro'],
      text: 'Conectá los motores con cable blindado de 4 hilos, los finales de carrera y la emergencia con dupont, el DB25 del láser, los 12 V a la RAMPS, los 24 V a la fuente del láser, los 220 V y los USB de la cámara y del Arduino. Cada empalme lleva termocontraíble. Antes de enchufar, revisá con el multímetro que no haya cortos.' },
    { key: 'seguridad', title: 'Cerramiento y seguridad', tools: ['allen4', 'lentes'],
      text: 'El cerramiento es de MDF opaco al IR y lleva un interruptor en la tapa que corta el láser si se abre. Junto con los lentes OD5+ para 1064 nm, desde ahora el láser solo se usa con la tapa cerrada. En los pasos siguientes la animación oculta el cerramiento para que se vea la máquina.' },
    // ---------- calibración ----------
    { key: 'c_home', calib: true, title: 'Calibración 1 · Encendido y homing', tools: ['multimetro', 'notebook'], view: 'general',
      text: 'Antes de encender: sin cortos en 12 V ni en 24 V, y la Vref de cada TMC2209 en ~0,8 V (≈1 A por motor). Cargá GRBL en el Mega, desbloqueá con $X y mandá $H: cada eje va hasta su final de carrera y ahí queda su cero.' },
    { key: 'c_escuadra', calib: true, title: 'Calibración 2 · Recorridos y escuadra', tools: ['cinta'], view: 'general',
      text: 'La mesa recorre las 4 esquinas del área de trabajo. Si algún carro frena o hace ruido, aflojá sus SK8, deslizalo de punta a punta y volvé a apretar. Después medí de nuevo las diagonales del marco.' },
    { key: 'c_pasos', calib: true, title: 'Calibración 3 · Pasos por milímetro', tools: ['calibre', 'notebook'], view: 'general',
      text: 'El valor teórico es 1600 pasos/mm: 200 pasos × 16 micropasos ÷ 2 mm del husillo. Mandá un movimiento de 50 mm, medilo con el calibre y corregí con: nuevo = actual × 50 / medido. Se hace en los 3 ejes.' },
    { key: 'c_foco', calib: true, title: 'Calibración 4 · Cero de foco (Z)', tools: ['notebook'], view: 'cristal',
      text: 'Con la cámara coaxial, Z baja de a pasos chicos hasta que la cara superior del cubo queda nítida (máximo contraste). Ese punto se guarda como Z = 0. Las capas se calculan desde ahí, corrigiendo porque en el vidrio el foco baja ~1,5 veces lo que baja el eje.' },
    { key: 'c_alineacion', calib: true, title: 'Calibración 5 · Alineación láser ↔ cámara', tools: ['lentes', 'notebook'], view: 'cristal',
      text: 'Se hace un disparo de prueba en una esquina del cubo y la cámara mide dónde quedó la marca respecto de su retícula. Ese desvío se guarda y se suma a todas las posiciones de grabado.' },
    { key: 'c_potencia', calib: true, title: 'Calibración 6 · Energía del pulso', tools: ['lentes', 'notebook'], view: 'cristal',
      text: 'Se graba una fila de prueba con 8 energías, de S30 a S100. Primero se busca el umbral (la energía mínima que deja marca) y después dos energías bien separadas para "chica" y "grande", que usa el modo de 3 bits. Se lee en campo oscuro.' },
    { key: 'c_posiciones', calib: true, title: 'Calibración 7 · Posiciones (modo 2 bits)', tools: ['notebook'], view: 'cristal',
      text: 'Se graban las 4 posiciones de prueba (derecha, abajo, arriba e izquierda) y se mide el centroide de cada marca. La separación entre posiciones tiene que ser más de 4 veces el ruido de la medición para que los errores sean despreciables.' },
    { key: 'c_final', calib: true, title: 'Calibración 8 · Prueba final', tools: ['notebook'], view: 'cristal',
      text: 'Se graba un mensaje real en modo 2 bits y se valida releyéndolo con la cámara. Si el CRC da OK, la máquina está lista para usar.' },
  ];

  // ---------------- Registro de piezas ----------------
  function collect() {
    const fsSet = new Set(L5.cfgObjs.fs);
    const byStep = {};
    STEPS.forEach((s) => (byStep[s.key] = []));
    L5.explodeList.forEach((e) => {
      if (!e.step || !byStep[e.step] || fsSet.has(e.obj)) return;
      const it = { type: 'obj', obj: e.obj, base: e.obj.position.clone(), subs: [] };
      // sub-piezas que se animan aparte: tornillos, tuercas, drivers...
      const walk = (o) => o.children.forEach((c) => {
        if (c.userData.asmSub) {
          const s = { type: c.userData.asmSub, obj: c, base: c.position.clone() };
          if (s.type === 'screw') { s.head = c.userData.head; s.tnut = c.userData.tnut || null; }
          it.subs.push(s);
        } else walk(c);
      });
      walk(e.obj);
      it.from = fromVector(e.obj);
      byStep[e.step].push(it);
    });
    L5.cables.forEach((c) => {
      if (!c.step || !byStep[c.step] || c.cfg === 'fs') return;
      byStep[c.step].push({ type: 'cable', cable: c, subs: [] });
    });
    // cerramiento: cada panel cae desde arriba
    L5.enclosure.children.forEach((p) => byStep.seguridad.push({ type: 'obj', obj: p, base: p.position.clone(), subs: [], from: v3(0, 160, 0), enc: true }));
    A.steps = STEPS.map((s) => Object.assign({}, s, { items: byStep[s.key] }));
  }

  // Dirección de entrada de cada pieza (en coordenadas del padre)
  function fromVector(o) {
    const part = o.userData.part;
    const z = v3(0, 0, 1).applyQuaternion(o.quaternion);
    const box = new T.Box3().setFromObject(o), size = box.getSize(new T.Vector3());
    if (part === 'varilla8' || o.geometry && part === 'varilla8') {
      const ax = size.x > size.y && size.x > size.z ? v3(1, 0, 0) : size.y > size.z ? v3(0, 1, 0) : v3(0, 0, 1);
      const len = Math.max(size.x, size.y, size.z);
      return ax.multiplyScalar(len * 0.95 * (ax.y ? 1 : -1));
    }
    if (o.children[0] && o.children[0].userData.part === 'husilloT8' && !part) return z.multiplyScalar(-Math.max(size.x, size.y, size.z) * 0.9);
    if (part === 'sc8uu') return z.multiplyScalar(70);
    if (part === 'nema17') return z.multiplyScalar(-70);
    if (part === 'soporteNema' || part === 'acople' || part === 'kfl08') return z.multiplyScalar(-45);
    if (part === 'perfil2040') return size.y > 200 ? v3(0, 260, 0) : v3(0, 140, 0);
    if (part === 'placa') return size.y > 60 ? v3(0, 0, 80) : v3(0, 90, 0);
    if (part === 'cuboSilice') return v3(0, 120, 0);
    if (part === 'laserNs' && o === L5.isoHead) return v3(0, 140, 0);
    return v3(0, 90, 0);
  }

  // ---------------- Fantasma de lo que falta ----------------
  const GH = new T.MeshBasicMaterial({ color: 0x7fb2ff, transparent: true, opacity: 0.07, depthWrite: false });
  GH.userData.ghost = true;
  function ghostify(o, on) {
    o.traverse((m) => {
      if (!m.isMesh) return;
      if (on) { if (!m.userData.asmOrig) { m.userData.asmOrig = m.material; m.material = GH; } }
      else if (m.userData.asmOrig) { m.material = m.userData.asmOrig; delete m.userData.asmOrig; }
    });
  }

  // ---------------- Estados de una pieza ----------------
  function setCable(c, p) {
    const g = c.mesh.geometry, n = g.index ? g.index.count : g.attributes.position.count;
    c.mesh.visible = p > 0;
    g.setDrawRange(0, p >= 1 ? Infinity : Math.floor((n * p) / 3) * 3);
  }
  function finalState(it) {
    if (it.type === 'cable') { setCable(it.cable, 1); return; }
    ghostify(it.obj, false);
    it.obj.visible = true; it.obj.position.copy(it.base);
    it.subs.forEach((s) => resetSub(s));
  }
  function resetSub(s) {
    s.obj.visible = true; s.obj.position.copy(s.base);
    if (s.type === 'screw') { s.head.visible = true; s.head.position.set(0, 0, 0); s.head.rotation.y = 0; if (s.tnut) { s.tnut.visible = true; s.tnut.scale.set(1, 1, 1); } }
    if (s.type === 'm3') s.obj.rotation.z = 0;
  }
  function hiddenState(it) {
    if (it.type === 'cable') { setCable(it.cable, 0); return; }
    it.obj.position.copy(it.base);
    it.subs.forEach((s) => resetSub(s));
    if (A.ghost) { it.obj.visible = true; ghostify(it.obj, true); }
    else { ghostify(it.obj, false); it.obj.visible = false; }
  }

  // ---------------- Línea de tiempo de un paso de armado ----------------
  function buildTimeline(st) {
    const acts = [];
    let t = 0.25;
    const act = (start, dur, apply, hide) => acts.push({ start, dur, apply, hide });
    st.items.forEach((it) => {
      if (it.type === 'cable') {
        act(t, 1.0, (p) => setCable(it.cable, ease(p)), () => setCable(it.cable, 0));
        t += 0.55; return;
      }
      act(t, 0.6, (p) => {
        if (p > 0) ghostify(it.obj, false);
        it.obj.visible = true;
        it.obj.position.copy(it.base).addScaledVector(it.from, 1 - ease(p));
      }, () => hiddenState(it));
      t += it.subs.length ? 0.6 : 0.42;
      it.subs.forEach((s) => {
        if (s.type === 'screw') {
          if (s.tnut) {
            const tn = s.tnut;
            act(t, 0.2, (p) => { tn.visible = true; const k = 0.2 + 0.8 * ease(p); tn.scale.set(k, k, k); }, () => { tn.visible = false; });
            t += 0.16;
          }
          const h = s.head;
          // el tornillo baja girando (rosca M5: 0,8 mm por vuelta, la vista exagera la altura)
          act(t, 0.42, (p) => { h.visible = true; h.position.y = 14 * (1 - ease(p)); h.rotation.y = (1 - p) * Math.PI * 6; }, () => { h.visible = false; });
          t += 0.34;
        } else if (s.type === 'm3') {
          const o = s.obj;
          act(t, 0.32, (p) => { o.visible = true; o.position.z = s.base.z + 10 * (1 - ease(p)); o.rotation.z = (1 - p) * Math.PI * 5; }, () => { o.visible = false; });
          t += 0.24;
        } else {
          const o = s.obj;
          act(t, 0.38, (p) => { o.visible = true; o.position.y = s.base.y + 28 * (1 - ease(p)); }, () => { o.visible = false; });
          t += 0.28;
        }
      });
    });
    return { acts, total: t + 0.5 };
  }
  function applyTimeline(tl, t) {
    // primero todo lo que todavía no empezó (ocultar), después lo que está en curso o terminado
    for (const a of tl.acts) if (t < a.start) a.hide();
    for (const a of tl.acts) if (t >= a.start) a.apply(clamp01((t - a.start) / a.dur));
  }

  // ---------------- Navegación ----------------
  let calibPromise = null;
  async function stopCalib() {
    if (calibPromise) { L5.abortAll(); try { await calibPromise; } catch (e) {} calibPromise = null; }
  }
  function setMachineNeutral() {
    const S = L5.state;
    S.X = 0; S.Y = 0; S.Zoff = 20; S.laser = 0; S.firing = 0; S.backlight = 0;
    S.rot.hwp1 = S.rot.hwp2 = S.rot.ana = 0;
  }

  A.goTo = async function (i, opts) {
    opts = opts || {};
    i = Math.max(0, Math.min(A.steps.length - 1, i));
    await stopCalib();
    A.idx = i; A.t = 0; A.done = false; A.pauseT = 0;
    const st = A.steps[i];
    if (!st.calib) { setMachineNeutral(); L5.clearCrystal(); }
    A.steps.forEach((s, j) => s.items.forEach((it) => (j < i ? finalState(it) : j > i ? hiddenState(it) : null)));
    L5.enclosure.visible = i >= stepIndex('seguridad') && i <= stepIndex('seguridad');
    if (!st.calib) {
      A.tl = buildTimeline(st);
      applyTimeline(A.tl, 0);
      A.running = opts.run !== false;
      flyToStep(st);
    } else {
      A.tl = null;
      st.items.forEach(finalState);
      A.running = true;
      if (st.view) L5.view(st.view);
      calibPromise = runCalib(st);
    }
    if (L5.ui && L5.ui.asmRender) L5.ui.asmRender();
  };
  const stepIndex = (k) => A.steps.findIndex((s) => s.key === k);

  function flyToStep(st) {
    if (st.cam) { L5.ui.flyTo(st.cam.target, st.cam.dist, v3(0.62, 0.5, 0.75)); return; }
    const box = new T.Box3(), tmp = new T.Box3();
    st.items.forEach((it) => {
      if (it.type === 'cable') { tmp.setFromObject(it.cable.mesh); if (!tmp.isEmpty()) box.union(tmp); return; }
      const vis = it.obj.visible, pos = it.obj.position.clone();
      it.obj.position.copy(it.base); it.obj.updateMatrixWorld(true);
      tmp.setFromObject(it.obj); if (!tmp.isEmpty()) box.union(tmp);
      it.obj.position.copy(pos); it.obj.visible = vis;
    });
    if (box.isEmpty()) return;
    const c = box.getCenter(new T.Vector3()), s = box.getSize(new T.Vector3()).length();
    L5.ui.flyTo(c, Math.max(160, s * 1.35 + 90), v3(0.62, 0.55, 0.78));
  }

  A.enter = function () {
    if (A.active) return;
    A.active = true;
    if (L5.state.busy) L5.stop();
    // primero pasar al 3D económico (cubo K9 de 50 mm, cuna más ancha) y recién después
    // tomar las posiciones finales de cada pieza: si no, el cubo queda a la altura del de 20 mm
    L5.ui.prepareAsm();
    collect();
    L5.ui.toast('Modo armado: 3D económico, desde cero. Usá ▶ para reproducir todo o los botones para ir paso a paso.');
    A.goTo(0, { run: true });
  };
  A.exit = async function () {
    if (!A.active) return;
    A.active = false; A.auto = false; A.running = false;
    await stopCalib();
    A.steps.forEach((s) => s.items.forEach(finalState));
    L5.enclosure.visible = !!(L5.ui && L5.ui.enclosure);
    setMachineNeutral(); L5.state.X = G.home.X; L5.state.Y = G.home.Y; L5.state.Zoff = G.home.Zoff;
    L5.clearCrystal();
    L5.ui.finishAsm();
  };
  A.setGhost = function (on) {
    A.ghost = on;
    A.steps.forEach((s, j) => { if (j > A.idx) s.items.forEach(hiddenState); });
    if (A.tl) applyTimeline(A.tl, A.t);
  };
  A.next = () => A.goTo(A.idx + 1);
  A.prev = () => A.goTo(A.idx - 1);
  A.toggleAuto = function () {
    A.auto = !A.auto;
    if (A.auto) {
      A.running = true;
      if (A.done && A.idx < A.steps.length - 1) A.next();
    }
    if (L5.ui && L5.ui.asmRender) L5.ui.asmRender();
  };

  A.frame = function (dt) {
    if (!A.active) return;
    const st = A.steps[A.idx];
    if (!st.calib && A.tl && A.running && !A.done) {
      A.t += dt * A.speed;
      applyTimeline(A.tl, A.t);
      if (A.t >= A.tl.total) { A.done = true; if (L5.ui.asmRender) L5.ui.asmRender(); }
    }
    if (A.done && A.auto && A.idx < A.steps.length - 1) {
      A.pauseT += dt * A.speed;
      if (A.pauseT > 0.9) A.next();
    }
    if (A.done && A.auto && A.idx === A.steps.length - 1) { A.auto = false; if (L5.ui.asmRender) L5.ui.asmRender(); }
    if (L5.ui.asmProgress) L5.ui.asmProgress(st.calib ? (A.done ? 1 : 0.5) : A.tl ? Math.min(1, A.t / A.tl.total) : 1);
  };

  // ---------------- Calibraciones ----------------
  const log = (s, c) => L5.gcode(s, c);
  const f3 = (v) => (v >= 0 ? ' ' : '') + v.toFixed(3);
  const fmt = (v, d) => v.toFixed(d === undefined ? 2 : d).replace('.', ',');

  async function runCalib(st) {
    const S = L5.state;
    S.busy = true; if (L5.ui) L5.ui.onJob();
    const prevSpeed = S.speed; S.speed = 2.5 * A.speed;
    try {
      log(`; ===== ${st.title.toUpperCase()} =====`, 'hdr');
      await CAL[st.key]();
      A.done = true;
    } catch (e) {
      if (e.message !== 'abort') { console.error(e); log('; error: ' + e.message, 'err'); }
    } finally {
      S.busy = false; S.laser = 0; S.firing = 0; S.backlight = 0; S.speed = prevSpeed;
      L5.mic.mode = 'live'; L5.mic.tile = null;
      if (L5.ui) { L5.ui.onJob(); if (L5.ui.asmRender) L5.ui.asmRender(); }
    }
  }
  const api = () => L5.simApi;
  const cellXY = (L, r, c, pos) => {
    const lp = api().localPos(L, r, c);
    const P = pos === undefined ? [0, 0] : api().POS[pos];
    return { X: -(lp.u + P[0] * api().shift()), Y: -(lp.w + P[1] * api().shift()) };
  };
  const CAL = {
    async c_home() {
      setMachineNeutral();
      log('; 12 V y 24 V sin cortos · Vref TMC2209 ≈ 0,80 V');
      log('$X ; desbloquear');
      log('$H ; homing');
      await api().home();
      log('; finales de carrera X, Y y Z tocados: cero de máquina OK', 'ok');
    },
    async c_escuadra() {
      const pts = [[-60, -60], [60, -60], [60, 60], [-60, 60], [0, 0]];
      for (const [x, y] of pts) { log(`G1 X${f3(x)} Y${f3(y)} F1500 ; esquina del área de trabajo`); await L5.moveTo({ X: x, Y: y, Zoff: 30 }, 60); }
      log('; recorrido completo sin trabas · diagonales del marco 512,4 / 512,6 mm', 'ok');
    },
    async c_pasos() {
      log('$100=1600 $101=1600 $102=1600 ; 200 pasos × 16 µpasos ÷ 2 mm');
      const meas = [['X', 49.82], ['Y', 50.06], ['Z', 19.94]];
      for (const [ax, m] of meas) {
        const dist = ax === 'Z' ? 20 : 50;
        log(`G91 G1 ${ax}${dist} F600 ; mover ${dist} mm y medir con calibre`);
        if (ax === 'X') { await L5.moveTo({ X: -25 }); await L5.moveTo({ X: 25 }, 40); }
        if (ax === 'Y') { await L5.moveTo({ Y: -25 }); await L5.moveTo({ Y: 25 }, 40); }
        if (ax === 'Z') { await L5.moveTo({ Zoff: 10 }); await L5.moveTo({ Zoff: 30 }); }
        const nv = (1600 * dist) / m;
        log(`; medido ${fmt(m)} mm → $10${'XYZ'.indexOf(ax)}=${fmt(nv, 1)}`, 'ok');
      }
      await L5.moveTo({ X: 0, Y: 0 });
    },
    async c_foco() {
      const S = L5.state;
      S.backlight = 1;
      const top = G.crystalY + G.crystalSize / 2 - (G.cy0 - G.focusOff);
      log('G1 X0 Y0 F1500 ; cámara sobre el centro del cubo');
      await L5.moveTo({ X: 0, Y: 0, Zoff: top + 8 });
      log('; barrido de foco: contraste de la imagen vs Z');
      const zs = [top + 5, top + 2, top + 0.6, top - 0.6, top - 2, top];
      for (const z of zs) {
        await L5.moveTo({ Zoff: z });
        L5.mic.rec = 1; await L5.wait(0.12); L5.mic.rec = 0;
        const c = Math.exp(-Math.pow(z - top, 2) / 2.2);
        log(`G1 Z${f3(z)} ; contraste ${fmt(c * 100, 0)} %`);
      }
      log(`G92 Z0 ; cara superior del cubo = Z0 (máquina Z${f3(top)})`, 'ok');
      S.backlight = 0;
    },
    async c_alineacion() {
      const S = L5.state;
      L5.clearCrystal();
      log(`G1 Z${f3(api().zFor(0))} ; capa de prueba`);
      await L5.moveTo({ Zoff: api().zFor(0) });
      const p = cellXY(0, 0, 0);
      log(`G1 X${f3(p.X)} Y${f3(p.Y)} ; esquina de prueba`);
      await L5.moveTo(p, 80);
      S.laser = 1;
      await api().fire({ bit: 1, pos: 0, size: 0 }, api().idx(0, 0, 0));
      S.laser = 0; S.backlight = 1; L5.mic.mode = 'bright'; L5.mic.bg = 0.82;
      L5.mic.rec = 1; await L5.wait(0.3); L5.mic.rec = 0;
      log('; marca encontrada a +0,8 px / −0,5 px de la retícula → offset láser-cámara guardado', 'ok');
      S.backlight = 0; L5.mic.mode = 'live';
    },
    async c_potencia() {
      const S = L5.state, encWas = L5.cfg.enc3d;
      L5.cfg.enc3d = 3;
      const Ls = [30, 40, 50, 60, 70, 80, 90, 100];
      await L5.moveTo({ Zoff: api().zFor(0) });
      for (let c = 0; c < 8; c++) {
        const s = Ls[c], p = cellXY(0, 7, c, 0);
        log(`G1 X${f3(p.X)} Y${f3(p.Y)}`);
        await L5.moveTo(p, 80);
        S.laser = 1; S.firing = 1;
        log(`M3 S${s} ; pulso de prueba`, 'fire');
        await L5.wait(0.13); S.firing = 0;
        if (s >= 50) { const g = L5.grid[api().idx(0, 7, c)]; g.w = true; g.age = 0; g.pos = 0; g.size = s >= 80 ? 1 : 0; }
        await L5.wait(0.05);
      }
      S.laser = 0; S.backlight = 2; L5.mic.mode = 'dark'; L5.mic.bg = 0.07;
      log('M106 ; anillo LED de costado (campo oscuro)');
      await L5.moveTo(cellXY(0, 7, 1), 80);
      L5.mic.rec = 1; await L5.wait(0.2); await L5.moveTo(cellXY(0, 7, 5), 80); await L5.wait(0.2); L5.mic.rec = 0;
      log('; S30–S40 sin marca · umbral S50 · S50–S70 chica · S80–S100 grande', 'ok');
      log('; elegidas: chica = S55, grande = S100 (brillo 0,55 vs 1,00)', 'ok');
      L5.cfg.enc3d = encWas; S.backlight = 0; L5.mic.mode = 'live';
    },
    async c_posiciones() {
      const S = L5.state;
      L5.cfg.enc3d = 2; if (L5.ui.setEnc) L5.ui.setEnc(2);
      await L5.moveTo({ Zoff: api().zFor(0) });
      for (let k = 0; k < 4; k++) {
        const p = cellXY(0, 5, k * 2, k);
        log(`G1 X${f3(p.X)} Y${f3(p.Y)} ; celda + corrimiento ${L5.POS_NAMES[k]}`);
        await L5.moveTo(p, 80);
        S.laser = 1;
        await api().fire({ pos: k, size: 0 }, api().idx(0, 5, k * 2));
      }
      S.laser = 0; S.backlight = 1; L5.mic.mode = 'bright'; L5.mic.bg = 0.82;
      await L5.moveTo(cellXY(0, 5, 3), 80);
      L5.mic.rec = 1; await L5.wait(0.35); L5.mic.rec = 0;
      const names = ['00 →', '01 ↓', '10 ↑', '11 ←'];
      api().POS.forEach((d, k) => log(`; posición ${names[k]} centroide medido (${fmt(d[0] * 6 + (Math.random() - 0.5) * 0.6, 1)} px, ${fmt(d[1] * 6 + (Math.random() - 0.5) * 0.6, 1)} px)`));
      log('; separación 6,0 px · ruido σ ≈ 0,3 px → 20σ: error despreciable', 'ok');
      S.backlight = 0; L5.mic.mode = 'live';
    },
    async c_final() {
      L5.cfg.enc3d = 2; if (L5.ui.setEnc) L5.ui.setEnc(2);
      L5.state.busy = false;
      await L5.runWrite('Armado OK · 3D económico · 2 bits por celda');
      const r = L5.job.result;
      log(r && r.crcOk && r.bitErr === 0 ? '; ✔ MÁQUINA CALIBRADA Y LISTA' : '; revisar: la prueba final tuvo errores', r && r.crcOk ? 'ok' : 'err');
    },
  };
})();
