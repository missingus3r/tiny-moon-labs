/* Ensamble completo de la máquina, estado de movimiento, haz láser y cables. */
(function () {
  const T = THREE, L5 = window.L5;
  const M = L5.M, box = L5.box, cyl = L5.cyl, V = L5.V, tag = L5.tag;
  const vec = (x, y, z) => new T.Vector3(x, y, z);

  // Constantes geométricas (mm)
  const G = (L5.G = {
    cy0: 300,            // altura nominal del centro del carro Z
    focusOff: 178,       // foco = centro carro Z - 178
    crystalY: 110.6,     // centro del cubo (sobre el carro X)
    dataY: 110.6,        // centro del bloque de voxels
    crystalSize: 20,
    pitch: 1.8,          // paso entre voxels en la vista (exagerado: real ~10 µm)
    layerGap: 3,         // separación entre capas en la vista (real ~50 µm)
    grid: 8, layers: 4,
    lead: 2,             // husillo T8 paso 2 mm
    home: { X: -55, Y: 55, Zoff: 38 },
  });

  L5.explodeList = [];
  L5.spinners = [];        // {mesh, axis:'x'|'y'|'z', fn: () => ángulo}

  L5.buildMachine = function (scene) {
    const root = new T.Group(); scene.add(root); L5.root = root;
    const put =(obj, parent, x, y, z) => {
      if (x !== undefined) obj.position.set(x, y, z);
      (parent || root).add(obj);
      L5.explodeList.push({ obj, step: L5.asmStep }); // step = paso de armado (ver assembly.js)
      return obj;
    };
    const step = (k) => (L5.asmStep = k);
    const bracketAt = (parent, corner, a, b) => {
      const br = L5.cornerBracket();
      L5.basis(br, new T.Vector3().crossVectors(a, b), b);
      return put(br, parent, corner.x, corner.y, corner.z);
    };
    const rod = (parent, len, axis, x, y, z) => put(tag(cyl(4, len, M('varilla8', 'chrome'), axis, 0, 0, 0, 24), 'varilla8'), parent, x, y, z);
    // piezas exclusivas de cada diseño: fs = 5D real, ns = 3D económico
    L5.cfgObjs = { fs: [], ns: [] };
    const fs = (o) => (L5.cfgObjs.fs.push(o), o);
    const ns = (o) => (L5.cfgObjs.ns.push(o), o);

    // ---------- Banco de trabajo (no es parte del BOM) ----------
    const bench = box(1300, 30, 720, new T.MeshStandardMaterial({ color: 0x5f4632, roughness: 0.85, metalness: 0 }), -80, -15, -20);
    bench.castShadow = false; root.add(bench); L5.bench = bench;

    // ---------- Estructura de perfiles 2040 ----------
    // (el orden de las llamadas es el orden de armado dentro de cada paso)
    const P = 'perfil2040';
    step('base1');
    put(L5.profile(P, 440, V.x, V.z, vec(0, 10, 150)));
    put(L5.profile(P, 440, V.x, V.z, vec(0, 10, -150)));
    step('base2');
    put(L5.profile(P, 260, V.z, V.x, vec(-200, 10, 0)));
    put(L5.profile(P, 260, V.z, V.x, vec(200, 10, 0)));
    // escuadras (cada una con 2 tornillos M5 y 2 tuercas T)
    bracketAt(root, vec(-180, 10, 130), V.x, V.nz);
    bracketAt(root, vec(180, 10, 130), V.nx, V.nz);
    bracketAt(root, vec(-180, 10, -130), V.x, V.z);
    bracketAt(root, vec(180, 10, -130), V.nx, V.z);
    step('columnas');
    put(L5.profile(P, 360, V.y, V.z, vec(-200, 200, -80)));
    put(L5.profile(P, 360, V.y, V.z, vec(200, 200, -80)));
    for (const sx of [-1, 1]) {
      bracketAt(root, vec(sx * 200, 20, -60), V.z, V.y);
      bracketAt(root, vec(sx * 200, 20, -100), V.nz, V.y);
    }
    step('travesanoInf');
    put(L5.profile(P, 380, V.x, V.y, vec(0, 220, -70)));
    for (const sx of [-1, 1]) {
      bracketAt(root, vec(sx * 190, 200, -70), sx > 0 ? V.nx : V.x, V.ny);
      bracketAt(root, vec(sx * 190, 240, -70), sx > 0 ? V.nx : V.x, V.y);
    }
    step('travesanoSup');
    put(L5.profile(P, 420, V.x, V.y, vec(0, 400, -70)));
    for (const sx of [-1, 1]) bracketAt(root, vec(sx * 190, 380, -70), sx > 0 ? V.nx : V.x, V.ny);
    step(null);
    fs(put(L5.profile(P, 480, V.y, V.z, vec(340, 240, 40))));   // poste del periscopio
    fs(bracketAt(root, vec(330, 0, 40), V.nx, V.y));
    fs(bracketAt(root, vec(350, 0, 40), V.x, V.y));

    const sk8At = (parent, pos, along, up, tnut) => {
      const s = L5.sk8();
      for (const x of [-15, 15]) { const sc = L5.screwM5(tnut); sc.position.set(x, 6, 0); s.add(sc); }
      L5.basis(s, along, up);
      return put(s, parent, pos.x, pos.y, pos.z);
    };
    const sc8At = (parent, pos, along, up) => { const s = L5.sc8uu(); L5.basis(s, along, up); return put(s, parent, pos.x, pos.y, pos.z); };
    const spinScrew = (parent, len, along, up, pos, fn) => {
      const ls = L5.leadscrew(len); L5.basis(ls.group, along, up);
      put(ls.group, parent, pos.x, pos.y, pos.z);
      L5.spinners.push({ mesh: ls.spin, fn });
      return ls;
    };
    const motorAt = (parent, faceAlong, up, pos, fn, footY) => {
      const br = L5.nemaBracket(footY); L5.basis(br, faceAlong, up); put(br, parent, pos.x, pos.y, pos.z);
      const mo = L5.nema17(); L5.basis(mo, faceAlong, up); put(mo, parent, pos.x, pos.y, pos.z);
      L5.spinners.push({ mesh: mo.userData.spin, fn });
      return mo;
    };
    const couplerAt = (parent, along, up, pos, fn) => {
      const c = L5.coupler(); L5.basis(c, along, up); put(c, parent, pos.x, pos.y, pos.z);
      L5.spinners.push({ mesh: c, fn, wrap: true, along, up });
      return c;
    };
    const kflAt = (parent, along, up, pos) => { const k = L5.kfl08(); L5.basis(k, along, up); return put(k, parent, pos.x, pos.y, pos.z); };
    const printed = (parent, w, h, d, x, y, z) => put(tag(box(w, h, d, M('filamento', 'printOrange'), x, y, z), 'filamento'), parent);

    const S = L5.state;
    const angY = () => (S.Y / G.lead) * Math.PI * 2;
    const angX = () => (S.X / G.lead) * Math.PI * 2;
    const angZ = () => (S.Zoff / G.lead) * Math.PI * 2;

    // ---------- Eje Y (fijo sobre la base) ----------
    step('ejeY');
    for (const x of [-70, 70]) for (const z of [-150, 150]) sk8At(root, vec(x, 20, z), V.z, V.y, true);
    rod(root, 300, 'z', -70, 40, 0);
    rod(root, 300, 'z', 70, 40, 0);

    // ---------- Carro Y ----------
    const yg = (L5.yg = new T.Group()); root.add(yg);
    step('carroY');
    for (const x of [-70, 70]) for (const z of [-45, 45]) sc8At(yg, vec(x, 40, z), V.z, V.y);
    const nutY = L5.abNut(); put(nutY, yg, 0, 40, -8);
    put(tag(box(280, 6, 140, M('placa', 'alu'), 0, 54, 0), 'placa'), yg);

    step('motorY');
    printed(root, 44, 6, 12, 0, 23, -150);
    kflAt(root, V.z, V.y, vec(0, 40, -152));
    spinScrew(root, 312, V.z, V.y, vec(0, 40, 6), angY);
    couplerAt(root, V.nz, V.y, vec(0, 40, 168), angY);
    L5.motorY = motorAt(root, V.nz, V.y, vec(0, 40, 186), angY, -17.5);

    step('ejeX');
    for (const x of [-123, 123]) for (const z of [-40, 40]) sk8At(yg, vec(x, 57, z), V.x, V.y, false);
    rod(yg, 260, 'x', 0, 77, -40);
    rod(yg, 260, 'x', 0, 77, 40);

    // ---------- Carro X (lleva el cristal) ----------
    const xg = (L5.xg = new T.Group()); yg.add(xg);
    step('carroX');
    for (const x of [-30, 30]) for (const z of [-40, 40]) sc8At(xg, vec(x, 77, z), V.x, V.y);
    const nutX = L5.abNut(); L5.basis(nutX, V.x, V.y); put(nutX, xg, -8, 77, 0);
    put(tag(box(120, 6, 120, M('placa', 'alu'), 0, 91, 0), 'placa'), xg);

    step('motorX');
    printed(yg, 12, 6, 40, -128, 60, 0);
    kflAt(yg, V.x, V.y, vec(-128, 77, 0));
    spinScrew(yg, 236, V.x, V.y, vec(-8, 77, 0), angX);
    couplerAt(yg, V.nx, V.y, vec(118, 77, 0), angX);
    L5.motorX = motorAt(yg, V.nx, V.y, vec(136, 77, 0), angX, -17.5);

    step('mesa');
    const bl = L5.backlight(); put(bl, xg, 0, 94, 0); L5.backlightMat = bl.userData.led;
    const polMat = L5.MX('polarizador', 'film', () => new T.MeshStandardMaterial({ color: 0x23272e, roughness: 0.3, metalness: 0.1, transparent: true, opacity: 0.72 }));
    fs(put(tag(box(26, 0.6, 26, polMat, 0, 100.3, 0), 'polarizador'), xg));
    L5.cradle = [];
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const c = printed(xg, 4, 8, 4, sx * 12, 104.6, sz * 12); c.userData.s = [sx, sz]; L5.cradle.push(c); }
    const crystal = L5.crystal(); put(crystal, xg, 0, G.crystalY, 0); L5.crystalMesh = crystal;

    // ---------- Eje Z (fijo en el pórtico) ----------
    step('ejeZ');
    for (const x of [-45, 45]) for (const y of [220, 400]) sk8At(root, vec(x, y, -60), V.y, V.z, true);
    rod(root, 200, 'y', -45, 313, -40);
    rod(root, 200, 'y', 45, 313, -40);

    // ---------- Carro Z + cabezal óptico ----------
    const zg = (L5.zg = new T.Group()); root.add(zg);
    const cy = G.cy0;
    step('carroZ');
    for (const x of [-45, 45]) for (const dy of [-35, 35]) sc8At(zg, vec(x, cy + dy, -40), V.y, V.z);
    const nutZ = L5.abNut(); L5.basis(nutZ, V.y, V.z); put(nutZ, zg, 0, cy - 8, -40);
    put(tag(box(140, 110, 6, M('placa', 'alu'), 0, cy, -26), 'placa'), zg);

    step('motorZ');
    printed(root, 60, 4, 60, 0, 242, -50);
    kflAt(root, V.y, V.z, vec(0, 246, -40));
    spinScrew(root, 160, V.y, V.z, vec(0, 326, -40), angZ);
    couplerAt(root, V.y, V.z, vec(0, 412.5, -40), angZ);
    L5.motorZ = motorAt(root, V.ny, V.z, vec(0, 425, -40), angZ, null);

    step('finales');
    const esY = L5.endstop(); put(esY, root, 100, 20.8, -142); L5.esY = esY;
    const esX = L5.endstop(); L5.basis(esX, V.z, V.y); put(esX, yg, -96, 58, 56); L5.esX = esX;
    const esZ = L5.endstop(); L5.basis(esZ, V.y, V.z); put(esZ, root, 72, 392, -59); L5.esZ = esZ;

    step('cabezal');
    printed(zg, 44, 160, 8, 0, cy - 50, -19);
    put(L5.dichroicCube(), zg, 0, cy - 110, 0);
    fs(put(tag(cyl(8, 50, M('filamento', 'printGray'), 'y', 0, 0, 0, 24), 'filamento'), zg, 0, cy - 70, 0)); // entrada del haz
    put(L5.objective(), zg, 0, cy - 125, 0);
    const ana = L5.rotMount('polarizador', 0x30343a, 'head'); L5.basis(ana, V.x, V.y); fs(put(ana, zg, 20, cy - 110, 0));
    L5.anaRotor = ana.userData.rotor;
    const anaMotor = L5.byj48(); L5.basis(anaMotor, V.x, V.y); fs(put(anaMotor, zg, 20, cy - 110 + 24, -2));
    L5.anaMotor = anaMotor;
    put(L5.cameraArm(), zg, 0, cy - 110, 0);
    // 3D económico: el cabezal del láser de fibra va atornillado arriba del cubo, sin periscopio
    step('laser');
    const iso = L5.isolatorHead(); ns(put(iso, zg, 0, cy - 95, 0)); L5.isoHead = iso;
    for (const dy of [-70, -28]) {
      ns(put(tag(L5.ring(19, 14.5, 10, M('filamento', 'printOrange')), 'filamento'), zg, 0, cy + dy, 0)).rotation.x = Math.PI / 2;
      ns(printed(zg, 12, 10, 8, 0, cy + dy, -18));
    }

    // ---------- Banco óptico: láser + control de polarización y energía ----------
    step(null);
    L5.laserLabelTex = L5.label('LÁSER fs 1030 nm\n≤500 fs · 5 µJ', 512, 170, { bg: '#f1f3f5', fg: '#16191d', size: 46 });
    fs(put(L5.laserBox(L5.laserLabelTex), root, 340, 0, -100));
    const hwp1 = L5.rotMount('hwp', 0x8fe3ff, true); fs(put(hwp1, root, 340, 60, -76)); L5.hwp1Rotor = hwp1.userData.rotor; L5.hwp1Motor = hwp1.userData.motor;
    fs(put(L5.pbs(), root, 340, 60, -53));
    fs(printed(root, 14, 41.3, 14, 340, 20.65, -53));
    const dump = L5.beamDump(); fs(put(dump, root, 384, 42, -53));
    fs(printed(root, 14, 42, 14, 384, 21, -53));
    const hwp2 = L5.rotMount('hwp', 0x8fe3ff, true); fs(put(hwp2, root, 340, 60, -28)); L5.hwp2Rotor = hwp2.userData.rotor; L5.hwp2Motor = hwp2.userData.motor;
    const mirAt = (pos, normal, up) => { const m = L5.mirrorMount('espejo'); L5.basis(m, normal, up); return fs(put(m, root, pos.x, pos.y, pos.z)); };
    mirAt(vec(340, 60, 0), vec(0, 1, -1), V.x);
    mirAt(vec(340, 470, 0), vec(-1, -1, 0), V.z);
    mirAt(vec(0, 470, 0), vec(1, -1, 0), V.z);
    fs(printed(root, 16, 16, 26, 340, 46, 16));
    fs(printed(root, 16, 16, 26, 350, 482, 14));
    fs(printed(root, 20, 64, 20, -40, 452, -70));
    fs(printed(root, 20, 12, 80, -40, 490, -36));
    fs(printed(root, 44, 12, 20, -22, 490, 6));
    const chiller = L5.chiller(); fs(put(chiller, root, 482, 0, -100)); L5.chillerObj = chiller;
    // 3D económico: fuente del láser de fibra + fuente de 24 V
    step('laser');
    const fsrc = L5.fiberSource(); fsrc.rotation.y = -Math.PI / 2; ns(put(fsrc, root, 252, 0, -190)); L5.fiberSrc = fsrc;
    step('electronica');
    const psu24 = L5.psu('fuente24v', '24V 6,5A\n150 W'); psu24.rotation.y = Math.PI / 2; ns(put(psu24, root, 515, 0, 60)); L5.psu24 = psu24;

    // ---------- Electrónica ----------
    const ramps = L5.megaRamps(); put(ramps, root, -340, 0, -30); L5.ramps = ramps;
    L5.drivers = [];
    // asmSub 'pop': en el armado aparecen de a una sobre la placa
    for (let i = 0; i < 3; i++) { const d = L5.tmc2209(); const p = ramps.userData.slots[i]; d.position.copy(p); d.userData.asmSub = 'pop'; ramps.add(d); L5.drivers.push(d); }
    const fp1 = tag(box(6, 20, 6, M('filamento', 'printOrange'), -30, 37, 0), 'filamento'); fp1.userData.asmSub = 'pop'; ramps.add(fp1);
    const fp2 = tag(box(6, 20, 6, M('filamento', 'printOrange'), 16, 37, 0), 'filamento'); fp2.userData.asmSub = 'pop'; ramps.add(fp2);
    const fan = L5.fan40(); L5.basis(fan, V.ny, V.z); fan.position.set(-7, 52, 0); fan.userData.asmSub = 'pop'; ramps.add(fan); L5.fanRotor = fan.userData.rotor;
    step(null);
    L5.ulns = [];
    [[-250, -150], [-250, -105], [-205, -150]].forEach(([x, z]) => { const u = L5.uln2003(); fs(put(u, root, x, 1, z)); L5.ulns.push(u); });
    step('electronica');
    const psu = L5.psu(); put(psu, root, -400, 0, -205); L5.psu = psu;
    put(L5.estop(), root, -300, 0, 170);
    step('seguridad');
    put(L5.glasses(), root, -400, 0, 245).rotation.y = 0.35;
    step('electronica');

    // Pantalla del notebook (se dibuja desde ui.js)
    const scr = document.createElement('canvas'); scr.width = 768; scr.height = 488;
    L5.screenCanvas = scr;
    L5.screenTex = new T.CanvasTexture(scr); L5.screenTex.encoding = T.sRGBEncoding;
    const nb = L5.notebook(L5.screenTex); put(nb, root, -575, 0, 95); nb.rotation.y = 0.55;
    L5.notebookObj = nb;
    step(null);

    // ---------- Cerramiento (oculto por defecto) ----------
    const enc = new T.Group(); enc.visible = false; L5.enclosure = enc; root.add(enc);
    // MDF opaco al IR; se dibuja semitransparente para poder ver adentro
    const acr = L5.MX('cerramiento', 'acr', () => new T.MeshStandardMaterial({ color: 0x3a2c20, roughness: 0.9, transparent: true, opacity: 0.32, depthWrite: false, side: T.DoubleSide }));
    const W = [-245, 425], H = [0, 520], D = [-300, 265];
    const cxe = (W[0] + W[1]) / 2, cye = (H[0] + H[1]) / 2, cze = (D[0] + D[1]) / 2;
    const sw = W[1] - W[0], sh = H[1] - H[0], sd = D[1] - D[0];
    [[sw, sh, 3, cxe, cye, D[1]], [sw, sh, 3, cxe, cye, D[0]], [3, sh, sd, W[0], cye, cze], [3, sh, sd, W[1], cye, cze], [sw, 3, sd, cxe, H[1], cze]].forEach(([w, h, d, x, y, z]) => {
      const p = box(w, h, d, acr, x, y, z); p.castShadow = false; enc.add(tag(p, 'cerramiento'));
    });

    // ---------- Voxels dentro del cristal ----------
    const n = G.grid * G.grid * G.layers;
    const vg = new T.SphereGeometry(1, 14, 10);
    const vm = new T.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, transparent: true, opacity: 0.95 });
    const voxels = new T.InstancedMesh(vg, vm, n);
    voxels.instanceMatrix.setUsage(T.DynamicDrawUsage);
    const zero = new T.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < n; i++) { voxels.setMatrixAt(i, zero); voxels.setColorAt(i, new T.Color(0xffffff)); }
    voxels.frustumCulled = false; voxels.castShadow = false;
    voxels.position.set(0, G.dataY, 0);
    xg.add(voxels); // no cuelga del cristal: así el cubo puede cambiar de tamaño sin escalar los voxels
    L5.voxels = voxels;

    // ---------- Haz láser ----------
    const beamMat = new T.MeshBasicMaterial({ color: 0xff2b55, transparent: true, opacity: 0.0, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false });
    L5.beamMat = beamMat;
    const segGeo = new T.CylinderGeometry(0.9, 0.9, 1, 10, 1, true);
    const mkSeg = () => { const m = new T.Mesh(segGeo, beamMat); m.renderOrder = 5; root.add(m); return m; };
    L5.beamSegs = [mkSeg(), mkSeg(), mkSeg(), mkSeg(), mkSeg(), mkSeg()];
    L5.dumpSeg = mkSeg();
    const coneGeo = new T.CylinderGeometry(0.15, 3.2, 1, 20, 1, true); coneGeo.translate(0, 0.5, 0);
    L5.beamCone = new T.Mesh(coneGeo, beamMat); L5.beamCone.renderOrder = 6; root.add(L5.beamCone);
    const flash = new T.Sprite(new T.SpriteMaterial({ map: L5.glowTex, color: 0xffffff, blending: T.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0, toneMapped: false }));
    flash.scale.set(9, 9, 1); flash.renderOrder = 7; root.add(flash); L5.flash = flash;
    L5.flashLight = new T.PointLight(0xff6688, 0, 80, 2); root.add(L5.flashLight);

    // ---------- Cables ----------
    L5.cables = [];
    const cable = (part, matName, r, getA, getB, waypoints, moving, cfg) => {
      const c = { part, mat: M(part, matName), r, getA, getB, waypoints, moving, cfg, step: L5.asmStep, mesh: null, key: '' };
      L5.cables.push(c); buildCable(c, true); return c;
    };
    const wp = (x, y, z) => () => vec(x, y, z);
    const lw = (obj, x, y, z) => () => obj.localToWorld(vec(x, y, z));
    const rampsPin = (i) => lw(ramps, 34, 20, -18 + i * 7);
    root.updateMatrixWorld(true);
    step('cableado');
    cable('cableMotor', 'cable', 2.2, lw(L5.motorY, 0, -27, -34), rampsPin(1), [wp(0, 6, 236), wp(-120, 5, 250), wp(-262, 5, 150), wp(-300, 6, 20)]);
    cable('cableMotor', 'cable', 2.2, lw(L5.motorX, 0, -27, -34), rampsPin(0), [() => L5.yg.localToWorld(vec(176, 50, 30)), wp(240, 6, 150), wp(60, 5, 252), wp(-140, 5, 250), wp(-280, 5, 120)], true);
    cable('cableMotor', 'cable', 2.2, lw(L5.motorZ, 0, -27, -34), rampsPin(2), [wp(0, 480, -110), wp(-225, 470, -110), wp(-228, 8, -118), wp(-300, 6, -80)]);
    cable('camara', 'cableGray', 2.6, lw(zg, 123, cy - 110, 0), lw(nb, 160, 9, 30), [() => zg.localToWorld(vec(150, cy - 60, -10)), wp(225, 470, -120), wp(232, 6, -135), wp(-120, 5, -330), wp(-480, 5, -250)], true);
    cable('cableMotor', 'cable', 1.6, lw(anaMotor, 0, -15, -18), lw(L5.ulns[2], 10, 4, 14), [() => zg.localToWorld(vec(60, cy - 40, -14)), wp(220, 465, -112), wp(226, 6, -128), wp(-120, 5, -300)], true, 'fs');
    cable('cableMotor', 'cable', 1.6, lw(L5.hwp1Motor, 0, -15, -18), lw(L5.ulns[0], 10, 4, 14), [wp(300, 6, -80), wp(200, 5, -320), wp(-240, 5, -300)], false, 'fs');
    cable('cableMotor', 'cable', 1.6, lw(L5.hwp2Motor, 0, -15, -18), lw(L5.ulns[1], 10, 4, 14), [wp(296, 6, -36), wp(190, 5, -310), wp(-236, 5, -290)], false, 'fs');
    // mangueras del chiller (5D)
    cable('chiller', 'cable', 4, lw(chiller, -30, 40, 18), wp(381, 40, -150), [wp(450, 12, -70), wp(400, 10, -120)], false, 'fs');
    cable('chiller', 'cableRed', 4, lw(chiller, 30, 40, 18), wp(381, 40, -175), [wp(515, 12, -66), wp(420, 10, -150)], false, 'fs');
    // fibra blindada del láser (3D económico): acompaña al cabezal cuando sube y baja
    cable('laserNs', 'blackMetal', 3.2, lw(iso, 0, 125, 0), lw(fsrc, 70, 45, 18), [() => zg.localToWorld(vec(0, cy + 95, 8)), wp(70, 475, -15), wp(214, 410, -112), wp(236, 160, -122)], true, 'ns').step = 'laser';
    cable('db25', 'cableGray', 2.2, lw(fsrc, -40, 50, 9), rampsPin(3), [wp(222, 6, -238), wp(-100, 5, -340), wp(-300, 6, -120)], false, 'ns');
    cable('fuente24v', 'cableRed', 2.2, lw(psu24, 110, 15, -25), lw(fsrc, -85, 45, 9), [wp(470, 6, -70), wp(300, 6, -300)], false, 'ns');
    cable('fuente24v', 'cable', 3, lw(psu24, 110, 15, 30), wp(566, -2, -150), [wp(520, 6, -90)], false, 'ns');
    cable('dupont', 'cableRed', 1.1, lw(esY, -14, 4, -3), rampsPin(4), [wp(60, 22, -175), wp(-200, 5, -190)]);
    cable('dupont', 'cableRed', 1.1, lw(esZ, -14, 4, -3), rampsPin(5), [wp(110, 430, -88), wp(-218, 440, -92), wp(-222, 6, -100)]);
    cable('dupont', 'cableRed', 1.1, lw(esX, -14, 4, -3), rampsPin(3), [() => L5.yg.localToWorld(vec(-150, 50, 60)), wp(-250, 6, 160)], true);
    cable('dupont', 'cable', 1.4, wp(380, 20, -200), rampsPin(3), [wp(400, 6, -240), wp(300, 6, -300), wp(-100, 5, -340), wp(-300, 6, -120)], false, 'fs'); // compuerta TTL del láser
    cable('cable220', 'cableRed', 2.4, lw(psu, 110, 15, -30), lw(ramps, -45, 20, -24), [wp(-260, 8, -190)]);
    cable('cable220', 'cable', 2.4, lw(psu, 110, 15, -10), lw(ramps, -45, 20, -20), [wp(-266, 8, -186)]);
    cable('cable220', 'cable', 3.4, lw(psu, 110, 15, 30), wp(-560, 0, -385), [wp(-250, 6, -170), wp(-300, 5, -300), wp(-500, 5, -360)]);
    cable('dupont', 'cableRed', 1.2, lw(ramps, 40, 16, 20), wp(-300, 64, 170), [wp(-300, 5, 90)]);
    cable('mega_ramps', 'cableGray', 2.4, lw(ramps, -58, 7, -14), lw(nb, 160, 9, 0), [wp(-420, 5, -40)]);

    return root;
  };

  function buildCable(c, force) {
    const a = c.getA(), b = c.getB();
    const pts = [a].concat(c.waypoints.map((f) => f()), [b]);
    const key = pts.map((p) => p.x.toFixed(1) + ',' + p.y.toFixed(1) + ',' + p.z.toFixed(1)).join('|');
    if (!force && key === c.key) return;
    c.key = key;
    const curve = new T.CatmullRomCurve3(pts, false, 'centripetal');
    const geo = new T.TubeGeometry(curve, Math.max(40, pts.length * 22), c.r, 7, false);
    if (c.mesh) { c.mesh.geometry.dispose(); c.mesh.geometry = geo; }
    else { c.mesh = tag(L5.mesh(geo, c.mat), c.part); c.mesh.castShadow = false; L5.root.add(c.mesh); }
  }
  L5.updateCables = function () { for (const c of L5.cables) if (c.moving && c.on !== false) buildCable(c); };

  // ---------- Cambio de diseño: 5D real (fs) ↔ 3D económico (ns) ----------
  const GHOST = new T.MeshBasicMaterial({ color: 0xff4d4d, transparent: true, opacity: 0.16, depthWrite: false });
  GHOST.userData.ghost = true;
  function setState(o, st) {
    o.visible = st !== 'off';
    o.traverse((m) => {
      if (!m.isMesh) return;
      if (st === 'ghost') { if (!m.userData.origMat) m.userData.origMat = m.material; m.material = GHOST; }
      else if (m.userData.origMat) { m.material = m.userData.origMat; delete m.userData.origMat; }
    });
  }
  function setCrystal(size) {
    G.crystalSize = size;
    G.crystalY = 100.6 + size / 2;
    // con el cubo grande los datos van a 10 mm de la cara superior (el objetivo enfoca a ~20 mm)
    G.dataY = size <= 20 ? G.crystalY : 100.6 + size - 10;
    L5.crystalMesh.scale.setScalar(size / 20);
    L5.crystalMesh.position.y = G.crystalY;
    const cm = L5.crystalMesh.material; if (cm.thickness !== undefined) cm.thickness = size;
    L5.voxels.position.y = G.dataY;
    L5.cradle.forEach((c) => { const [sx, sz] = c.userData.s; c.position.x = sx * (size / 2 + 2); c.position.z = sz * (size / 2 + 2); });
  }
  L5.diffBoxes = [];
  L5.applyConfig = function (mode5D, compare) {
    const cur = mode5D ? 'fs' : 'ns', other = mode5D ? 'ns' : 'fs';
    L5.cfgObjs[cur].forEach((o) => setState(o, 'on'));
    L5.cfgObjs[other].forEach((o) => setState(o, compare ? 'ghost' : 'off'));
    const exploded = L5.ui && L5.ui.explode > 0.02;
    L5.cables.forEach((c) => {
      c.on = !c.cfg || c.cfg === cur;
      c.mesh.visible = c.on && !exploded;
      if (c.on) buildCable(c, true);
    });
    setCrystal(mode5D ? 20 : 50);
    // recuadros verdes: lo que tiene este diseño y el otro no
    L5.diffBoxes.forEach((b) => { L5.root.remove(b); b.geometry.dispose(); });
    L5.diffBoxes = [];
    if (compare) L5.cfgObjs[cur].forEach((o) => {
      const b = new T.BoxHelper(o, 0x3ddc84); b.material.transparent = true; b.material.opacity = 0.9; b.userData.target = o;
      L5.root.add(b); L5.diffBoxes.push(b);
    });
  };
  L5.updateDiffBoxes = function () { for (const b of L5.diffBoxes) b.update(); };

  // ---------- Estado y movimiento ----------
  L5.state = {
    X: G.home.X, Y: G.home.Y, Zoff: G.home.Zoff,
    rot: { hwp1: 0, hwp2: 0, ana: 0 },
    laser: 0, firing: 0, backlight: 0, speed: 1, busy: false, abort: false,
  };
  const tasks = [];
  L5.abortAll = function () {
    for (const t of tasks.splice(0)) t.reject(new Error('abort'));
  };
  L5.moveTo = function (tgt, feed) {
    const S = L5.state;
    const from = { X: S.X, Y: S.Y, Zoff: S.Zoff };
    const to = { X: tgt.X !== undefined ? tgt.X : S.X, Y: tgt.Y !== undefined ? tgt.Y : S.Y, Zoff: tgt.Zoff !== undefined ? tgt.Zoff : S.Zoff };
    const dxy = Math.hypot(to.X - from.X, to.Y - from.Y), dz = Math.abs(to.Zoff - from.Zoff);
    const dur = Math.max(dxy / (feed || 70), dz / 22, 0.05);
    return new Promise((resolve, reject) => tasks.push({ kind: 'move', from, to, t: 0, dur, resolve, reject }));
  };
  L5.rotTo = function (name, deg) {
    const S = L5.state, from = S.rot[name];
    const dur = Math.max(Math.abs(deg - from) / 200, 0.04);
    return new Promise((resolve, reject) => tasks.push({ kind: 'rot', name, from, to: deg, t: 0, dur, resolve, reject }));
  };
  L5.wait = function (sec) {
    return new Promise((resolve, reject) => tasks.push({ kind: 'wait', t: 0, dur: sec, resolve, reject }));
  };
  L5.motionActive = { X: false, Y: false, Z: false, hwp1: false, hwp2: false, ana: false };

  const ease = (x) => x * x * (3 - 2 * x);
  L5.tick = function (dt) {
    const S = L5.state, A = L5.motionActive;
    A.X = A.Y = A.Z = A.hwp1 = A.hwp2 = A.ana = false;
    const sdt = dt * S.speed;
    for (let i = tasks.length - 1; i >= 0; i--) {
      const t = tasks[i];
      t.t = Math.min(1, t.t + sdt / t.dur);
      const k = ease(t.t);
      if (t.kind === 'move') {
        S.X = t.from.X + (t.to.X - t.from.X) * k;
        S.Y = t.from.Y + (t.to.Y - t.from.Y) * k;
        S.Zoff = t.from.Zoff + (t.to.Zoff - t.from.Zoff) * k;
        A.X = A.X || t.to.X !== t.from.X; A.Y = A.Y || t.to.Y !== t.from.Y; A.Z = A.Z || t.to.Zoff !== t.from.Zoff;
      } else if (t.kind === 'rot') {
        S.rot[t.name] = t.from + (t.to - t.from) * k; A[t.name] = true;
      }
      if (t.t >= 1) { tasks.splice(i, 1); t.resolve(); }
    }
    // aplicar al modelo
    L5.yg.position.z = S.Y;
    L5.xg.position.x = S.X;
    L5.zg.position.y = S.Zoff;
    for (const s of L5.spinners) {
      const a = s.fn();
      if (s.wrap) {
        s.mesh.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(
          new T.Vector3().crossVectors(s.up, s.along).normalize(), s.up.clone(), s.along.clone()));
        s.mesh.rotateZ(a);
      } else s.mesh.rotation.z = a;
    }
    const d2r = Math.PI / 180;
    L5.hwp1Rotor.rotation.z = S.rot.hwp1 * d2r;
    L5.hwp2Rotor.rotation.z = S.rot.hwp2 * d2r;
    L5.anaRotor.rotation.z = S.rot.ana * d2r;
    L5.hwp1Motor.userData.spin.rotation.z = -S.rot.hwp1 * d2r * 3;
    L5.hwp2Motor.userData.spin.rotation.z = -S.rot.hwp2 * d2r * 3;
    L5.anaMotor.userData.spin.rotation.z = -S.rot.ana * d2r * 3;
    L5.fanRotor.rotation.z += dt * 30;
    // LEDs de los ULN2003 cuando su motor gira
    const act = [A.hwp1, A.hwp2, A.ana];
    L5.ulns.forEach((u, i) => u.userData.leds.forEach((m, j) => { m.emissiveIntensity = act[i] ? (Math.sin(performance.now() / 40 + j * 1.6) > 0 ? 2.2 : 0.1) : 0.05; }));
    // finales de carrera
    const hit = (m, on) => { m.userData.led.material.emissiveIntensity = on ? 2.5 : 0.08; };
    hit(L5.esX, S.X <= G.home.X + 0.3); hit(L5.esY, S.Y >= G.home.Y - 0.3); hit(L5.esZ, S.Zoff >= G.home.Zoff - 0.3);
    L5.backlightMat.emissiveIntensity = S.backlight === 1 ? 2.4 : 0.15;
    updateBeam(dt);
  };

  // Recorrido del haz: láser → HWP1 → PBS → HWP2 → M1 → M2 → M3 → cabezal → objetivo → foco
  const tmpA = new T.Vector3(), tmpB = new T.Vector3(), up = new T.Vector3(0, 1, 0);
  function seg(mesh, a, b, r) {
    tmpA.subVectors(b, a); const len = tmpA.length();
    mesh.position.copy(a).addScaledVector(tmpA, 0.5);
    mesh.quaternion.setFromUnitVectors(up, tmpA.normalize());
    mesh.scale.set(r || 1, len, r || 1);
  }
  L5.focusWorld = function (out) {
    return (out || new T.Vector3()).set(0, G.cy0 - G.focusOff + L5.state.Zoff, 0);
  };
  function updateBeam(dt) {
    const S = L5.state;
    const show = L5.ui && L5.ui.showBeam;
    const target = S.firing > 0 ? 0.95 : (S.laser ? 0.22 : 0);
    L5.beamMat.opacity += (((show ? target : 0)) - L5.beamMat.opacity) * Math.min(1, dt * 18);
    const vis = L5.beamMat.opacity > 0.01;
    const m5 = !L5.cfg || L5.cfg.mode5D;
    // 5D: el haz entra por arriba desde el periscopio · 3D: sale del aislador montado sobre el cubo
    const zt = G.cy0 + (m5 ? -45 : -95) + S.Zoff, fy = G.cy0 - G.focusOff + S.Zoff, tip = G.cy0 - 125 - 33.4 + S.Zoff;
    const pts = [vec(340, 60, -88), vec(340, 60, 0), vec(340, 470, 0), vec(0, 470, 0), vec(0, zt, 0), vec(0, tip, 0)];
    for (let i = 0; i < 5; i++) { seg(L5.beamSegs[i], pts[i], pts[i + 1], 1); L5.beamSegs[i].visible = vis && (m5 || i === 4); }
    L5.beamSegs[5].visible = false;
    seg(L5.dumpSeg, vec(340, 60, -53), vec(373, 60, -53), 0.7); L5.dumpSeg.visible = vis && S.laser && m5;
    L5.beamCone.position.set(0, fy, 0); L5.beamCone.scale.set(1, tip - fy, 1); L5.beamCone.visible = vis;
    const f = S.firing;
    L5.flash.position.set(0, fy, 0);
    L5.flash.material.opacity = f > 0 ? 0.6 + Math.random() * 0.4 : 0;
    const s = 5 + f * 7 * (0.6 + Math.random() * 0.4); L5.flash.scale.set(s, s, 1);
    L5.flashLight.position.set(0, fy, 0); L5.flashLight.intensity = f > 0 ? 3 + Math.random() * 2 : 0;
  }
})();
