/* Componentes: cada constructor devuelve un Group en su marco local. */
(function () {
  const T = THREE, L5 = window.L5;
  const M = L5.M, box = L5.box, cyl = L5.cyl;

  L5.tagged = {};
  // Marca un objeto como perteneciente a una parte del BOM
  const tag = (L5.tag = function (obj, part) {
    obj.userData.part = part;
    (L5.tagged[part] = L5.tagged[part] || []).push(obj);
    return obj;
  });

  // Cabeza de tornillo allen M5 (eje y local, apoyada en y=0) + tuerca T opcional debajo
  L5.screwM5 = function (withTnut) {
    const g = new T.Group();
    // la cabeza va en su propio grupo para poder animarla (bajar girando) sin mover la tuerca
    const hg = new T.Group();
    const head = tag(cyl(4.2, 4.6, M('tornilloM5', 'blackMetal'), 'y', 0, 2.3, 0, 16), 'tornilloM5');
    const hex = cyl(1.6, 0.8, M('tornilloM5', 'black'), 'y', 0, 4.3, 0, 6);
    head.add(hex); hex.position.set(0, 2.1, 0);
    head.add(cyl(2.5, 9, M('tornilloM5', 'steel'), 'y', 0, -6.8, 0, 12)); // vástago: queda dentro de la pieza
    hg.add(head); g.add(hg);
    g.userData.head = hg;
    if (withTnut) { const tn = tag(box(10, 4, 10, M('tuercaT', 'zinc'), 0, -4.2, 0), 'tuercaT'); g.add(tn); g.userData.tnut = tn; }
    g.userData.asmSub = 'screw';
    return g;
  };

  L5.sk8 = function () {
    const g = new T.Group(), m = M('sk8', 'alu');
    g.add(box(42, 6, 14, m, 0, 3, 0));
    g.add(box(20, 27, 14, m, 0, 19.5, 0));
    g.add(cyl(4.3, 14.4, M('sk8', 'black'), 'z', 0, 20, 0, 18));
    g.add(cyl(1.8, 8, M('sk8', 'blackMetal'), 'x', 13, 28, 0, 10));
    return tag(g, 'sk8');
  };

  // Rodamiento lineal con carcasa: varilla en z, cara de montaje en +y (y = 11)
  L5.sc8uu = function () {
    const g = new T.Group(), m = M('sc8uu', 'alu');
    g.add(box(34, 22, 30, m));
    g.add(cyl(4.4, 30.4, M('sc8uu', 'black'), 'z', 0, 0, 0, 18));
    [[-12, -9], [12, -9], [-12, 9], [12, 9]].forEach(([x, z]) => g.add(cyl(1.9, 0.6, M('sc8uu', 'black'), 'y', x, 11.1, z, 10)));
    return tag(g, 'sc8uu');
  };

  // Husillo T8: devuelve {group, spin}; spin gira alrededor de z local
  L5.leadscrew = function (len) {
    const g = new T.Group();
    const mat = L5.MX('husilloT8', 'thread', () => {
      const t = L5.threadTex.clone(); t.needsUpdate = true;
      t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(2, 1);
      return new T.MeshStandardMaterial({ map: t, metalness: 0.85, roughness: 0.35 });
    });
    const geo = new T.CylinderGeometry(4, 4, len, 20, 1, false);
    // UV a lo largo del eje para que la rosca repita cada 2 mm aprox. (visual)
    const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * len / 8);
    geo.rotateX(Math.PI / 2);
    const spin = L5.mesh(geo, mat);
    g.add(tag(spin, 'husilloT8'));
    return { group: g, spin };
  };

  // Tuerca anti-backlash (bronce) eje z
  L5.abNut = function () {
    const g = new T.Group(), m = M('husilloT8', 'brass');
    g.add(cyl(11, 3.5, m, 'z', 0, 0, 0, 24));
    g.add(cyl(5.2, 11, m, 'z', 0, 0, 7, 20));
    g.add(cyl(5.2, 5, m, 'z', 0, 0, 17, 20));
    for (let i = 0; i < 4; i++) g.add(cyl(5.8, 0.8, M('husilloT8', 'steel'), 'z', 0, 0, 12.2 + i * 0.9, 16));
    [0, 1, 2, 3].forEach((i) => { const a = i * Math.PI / 2 + Math.PI / 4; g.add(cyl(1.7, 3.8, M('husilloT8', 'black'), 'z', Math.cos(a) * 8, Math.sin(a) * 8, 0, 8)); });
    return tag(g, 'husilloT8');
  };

  // NEMA 17: cara frontal en z=0, eje hacia +z
  L5.nema17 = function () {
    const g = new T.Group();
    const cap = M('nema17', 'nemaCap'), blk = M('nema17', 'black');
    const f = L5.chamferBox(42, 8, 4.5, cap); f.position.z = -4; g.add(f);
    const b = L5.chamferBox(41.4, 24, 4.5, blk); b.position.z = -20; g.add(b);
    const r = L5.chamferBox(42, 8, 4.5, cap); r.position.z = -36; g.add(r);
    g.add(cyl(11, 2, cap, 'z', 0, 0, 1, 28));
    const spin = cyl(2.5, 22, M('nema17', 'steel'), 'z', 0, 0, 13, 14);
    spin.add(box(5.2, 0.6, 18, M('nema17', 'nemaCap'), 0, 2.2, 1)); // plano del eje (D-cut) visible al girar
    g.add(spin);
    g.add(box(16, 7, 10, M('nema17', 'white'), 0, -24, -34));
    const lbl = new T.Mesh(new T.PlaneGeometry(30, 14), L5.MX('nema17', 'lbl', () => new T.MeshStandardMaterial({ map: L5.label('NEMA 17\n42×42×40', 256, 120, { bg: '#e9ecef', fg: '#222' }), roughness: 0.6 })));
    lbl.position.set(0, 20.75, -20); lbl.rotation.x = -Math.PI / 2; g.add(lbl);
    // tornillos M3 de montaje
    [[-15.5, -15.5], [15.5, -15.5], [-15.5, 15.5], [15.5, 15.5]].forEach(([x, y]) => {
      const s = tag(cyl(2.7, 3, M('kitM3', 'blackMetal'), 'z', x, y, 1.5 + 5, 12), 'kitM3');
      s.userData.asmSub = 'm3';
      g.add(s);
    });
    g.userData.spin = spin;
    return tag(g, 'nema17');
  };

  // placa de 5 mm donde atornilla la cara del motor (plano xy local, z=-5..0, del lado del motor) + pie opcional
  L5.nemaBracket = function (footY) {
    const g = new T.Group(), m = M('soporteNema', 'blackMetal');
    const s = new T.Shape(); s.moveTo(-25, -25); s.lineTo(25, -25); s.lineTo(25, 25); s.lineTo(-25, 25);
    const h = new T.Path(); h.absarc(0, 0, 11.5, 0, Math.PI * 2, true); s.holes.push(h);
    const geo = new T.ExtrudeGeometry(s, { depth: 5, bevelEnabled: false });
    g.add(L5.mesh(geo, m)); // z 0..5 (lado del eje)
    if (footY !== undefined && footY !== null) g.add(box(36, 5, 40, m, 0, footY, 25));
    return tag(g, 'soporteNema');
  };

  L5.coupler = function () {
    const g = new T.Group(), m = M('acople', 'alu');
    g.add(cyl(9.5, 25, m, 'z', 0, 0, 0, 28));
    [-4, -1, 2, 5].forEach((z) => g.add(cyl(9.65, 0.9, M('acople', 'black'), 'z', 0, 0, z, 28)));
    g.add(cyl(1.6, 2, M('acople', 'blackMetal'), 'y', 0, 9.6, -9, 8));
    g.add(cyl(1.6, 2, M('acople', 'blackMetal'), 'y', 0, 9.6, 9, 8));
    return tag(g, 'acople');
  };

  L5.kfl08 = function () {
    const g = new T.Group();
    const s = new T.Shape();
    s.moveTo(-31, 0); s.quadraticCurveTo(-31, 8, -24, 9); s.lineTo(-10, 14); s.quadraticCurveTo(0, 17, 10, 14);
    s.lineTo(24, 9); s.quadraticCurveTo(31, 8, 31, 0); s.quadraticCurveTo(31, -8, 24, -9); s.lineTo(10, -14);
    s.quadraticCurveTo(0, -17, -10, -14); s.lineTo(-24, -9); s.quadraticCurveTo(-31, -8, -31, 0);
    [-24, 24].forEach((x) => { const p = new T.Path(); p.absarc(x, 0, 3.2, 0, Math.PI * 2, true); s.holes.push(p); });
    const geo = new T.ExtrudeGeometry(s, { depth: 5, bevelEnabled: false }); geo.translate(0, 0, -2.5);
    g.add(L5.mesh(geo, M('kfl08', 'zinc')));
    g.add(cyl(9, 9, M('kfl08', 'zinc'), 'z', 0, 0, 2, 24));
    g.add(cyl(5.5, 9.4, M('kfl08', 'steel'), 'z', 0, 0, 2, 20));
    return tag(g, 'kfl08');
  };

  // Escuadra para perfil: esquina en el origen, patas sobre +x y +y, ancho en z
  L5.cornerBracket = function () {
    const g = new T.Group(), m = M('escuadra', 'zinc');
    g.add(box(20, 4, 18, m, 10, 2, 0));
    g.add(box(4, 20, 18, m, 2, 10, 0));
    const gus = box(3, 22, 18, m, 9, 9, 0); gus.scale.set(1, 1, 0.12); gus.rotation.z = Math.PI / 4; g.add(gus);
    const s1 = L5.screwM5(true); s1.position.set(13, 4, 0); g.add(s1);
    const s2 = L5.screwM5(true); s2.position.set(4, 13, 0); s2.rotation.z = -Math.PI / 2; g.add(s2);
    return tag(g, 'escuadra');
  };

  L5.endstop = function () {
    const g = new T.Group();
    g.add(box(40, 1.6, 16, M('endstop', 'pcbRed')));
    g.add(box(13, 6.5, 6, M('endstop', 'black'), 6, 4, 2));
    const lev = box(16, 0.6, 4, M('endstop', 'steel'), 3, 7.6, 2); lev.rotation.z = 0.12; g.add(lev);
    g.add(box(8, 6, 5, M('endstop', 'white'), -14, 3.8, -3));
    const led = box(2, 1, 1.4, L5.MX('endstop', 'led', () => new T.MeshStandardMaterial({ color: 0x330000, emissive: 0xff2020, emissiveIntensity: 0.1 })), -4, 1.3, 5);
    g.add(led); g.userData.led = led;
    return tag(g, 'endstop');
  };

  L5.estop = function () {
    const g = new T.Group();
    g.add(box(68, 60, 68, M('estop', 'yellow'), 0, 30, 0));
    g.add(cyl(14, 8, M('estop', 'black'), 'y', 0, 64, 0, 24));
    g.add(cyl(21, 9, M('estop', 'red'), 'y', 0, 72, 0, 32, 18));
    const lbl = new T.Mesh(new T.PlaneGeometry(56, 18), L5.MX('estop', 'lbl', () => new T.MeshStandardMaterial({ map: L5.label('EMERGENCIA', 256, 80, { bg: '#f2c200', fg: '#111' }) })));
    lbl.position.set(0, 30, 34.2); g.add(lbl);
    return tag(g, 'estop');
  };

  L5.fan40 = function () {
    const g = new T.Group(), m = M('fan40', 'black');
    const s = new T.Shape(); s.moveTo(-20, -20); s.lineTo(20, -20); s.lineTo(20, 20); s.lineTo(-20, 20);
    const h = new T.Path(); h.absarc(0, 0, 18.5, 0, Math.PI * 2, true); s.holes.push(h);
    const geo = new T.ExtrudeGeometry(s, { depth: 10, bevelEnabled: false }); geo.translate(0, 0, -5);
    g.add(L5.mesh(geo, m));
    const rotor = new T.Group();
    rotor.add(cyl(7, 8, m, 'z', 0, 0, 0, 20));
    for (let i = 0; i < 7; i++) {
      const b = box(10, 2.2, 1, m, 0, 0, 0); b.geometry.translate(12, 0, 0);
      b.rotation.set(0.45, 0, (i / 7) * Math.PI * 2); rotor.add(b);
    }
    g.add(rotor); g.userData.rotor = rotor;
    return tag(g, 'fan40');
  };

  // 28BYJ-48: eje hacia +z, cuerpo detrás
  L5.byj48 = function () {
    const g = new T.Group();
    g.add(cyl(14, 19, M('byj48', 'gold28'), 'z', 0, 0, -9.5, 28));
    g.add(box(42, 7, 0.8, M('byj48', 'gold28'), 0, 0, -0.4));
    g.add(box(15, 17, 16, M('byj48', 'blueCap'), 0, -15, -9));
    const spin = cyl(2.5, 9, M('byj48', 'brass'), 'z', 0, 8, 4.5, 12);
    g.add(cyl(4.5, 1.5, M('byj48', 'gold28'), 'z', 0, 8, 0.5, 16));
    g.add(spin); g.userData.spin = spin;
    return tag(g, 'byj48');
  };

  L5.uln2003 = function () {
    const g = new T.Group();
    g.add(box(35, 1.6, 32, M('byj48', 'pcbGreen')));
    g.add(box(20, 5, 7, M('byj48', 'black'), -2, 3.3, -4));
    g.add(box(13, 6, 6, M('byj48', 'white'), 8, 3.8, 10));
    const leds = [];
    for (let i = 0; i < 4; i++) {
      const lm = new T.MeshStandardMaterial({ color: 0x300000, emissive: 0xff1a1a, emissiveIntensity: 0.05 });
      L5.MX('byj48', 'uled' + Math.random(), () => lm);
      const l = box(2, 1.2, 2, lm, -12 + i * 4, 1.4, 11); g.add(l); leds.push(lm);
    }
    g.userData.leds = leds;
    return tag(g, 'byj48');
  };

  L5.tmc2209 = function () {
    const g = new T.Group();
    g.add(box(15.3, 1.6, 20.4, M('tmc2209', 'pcbPurple')));
    const hs = new T.Group();
    hs.add(box(9, 1.5, 9, M('tmc2209', 'aluBlack'), 0, 1.6, 0));
    for (let i = 0; i < 5; i++) hs.add(box(1, 4.5, 9, M('tmc2209', 'aluBlack'), -4 + i * 2, 4.5, 0));
    hs.position.y = 0.8; g.add(hs);
    [-6.3, 6.3].forEach((x) => g.add(box(2.5, 9, 20, M('tmc2209', 'black'), x, -5, 0)));
    return tag(g, 'tmc2209');
  };

  // Arduino Mega + RAMPS 1.4 (con 3 TMC2209 y ventilador montado aparte)
  L5.megaRamps = function () {
    const g = new T.Group();
    g.add(box(101.6, 1.6, 53.3, M('mega_ramps', 'pcbBlue'), 0, 0.8, 0));
    g.add(box(16, 11, 12, M('mega_ramps', 'steel'), -50, 7, -14));   // USB-B
    g.add(box(13, 11, 9, M('mega_ramps', 'black'), -51, 7, 15));     // jack
    // espaciadores
    [[-45, -22], [45, -22], [-45, 22], [45, 22]].forEach(([x, z]) => g.add(cyl(2.5, 12, M('mega_ramps', 'brass'), 'y', x, 7, z, 8)));
    g.add(box(101, 1.6, 60, M('mega_ramps', 'pcbRed'), 2, 13.4, 2));
    g.add(box(18, 10, 12, M('mega_ramps', 'termGreen'), -42, 19, -24));   // bornera 12V
    g.add(box(28, 10, 12, M('mega_ramps', 'termGreen'), -42, 19, 22));
    for (let i = 0; i < 6; i++) g.add(box(2.4, 8, 10, M('mega_ramps', 'black'), 30 + (i % 3) * 3, 18, -18 + Math.floor(i / 3) * 3));
    // zócalos de drivers: 5 posiciones, X Y Z ocupadas
    const slots = [];
    for (let i = 0; i < 5; i++) {
      const x = -24 + i * 17;
      g.add(box(15, 9, 3, M('mega_ramps', 'black'), x, 18.6, -8));
      g.add(box(15, 9, 3, M('mega_ramps', 'black'), x, 18.6, 8));
      slots.push(new T.Vector3(x, 28, 0));
    }
    g.userData.slots = slots;
    return tag(g, 'mega_ramps');
  };

  L5.psu = function (part, text) {
    part = part || 'fuente12v';
    const g = new T.Group();
    const topMat = L5.MX(part, 'vent', () => new T.MeshStandardMaterial({ map: L5.ventTex, metalness: 0.7, roughness: 0.45 }));
    const side = M(part, 'lightGray');
    const mats = [side, side, topMat, side, side, side];
    const b = L5.mesh(new T.BoxGeometry(199, 50, 98), mats, 0, 25, 0); g.add(b);
    g.add(box(18, 14, 92, M(part, 'black'), 105, 11, 0));
    for (let i = 0; i < 9; i++) g.add(cyl(2.4, 3, M(part, 'steel'), 'y', 105, 19.5, -38 + i * 9.5, 10));
    const lbl = new T.Mesh(new T.PlaneGeometry(80, 26), L5.MX(part, 'lbl', () => new T.MeshStandardMaterial({ map: L5.label(text || '12V 10A\n120 W', 256, 84, { bg: '#c9cdd2', fg: '#111' }) })));
    lbl.position.set(-40, 25, 49.2); g.add(lbl);
    const led = box(3, 3, 1, L5.MX(part, 'led', () => new T.MeshStandardMaterial({ color: 0x002200, emissive: 0x22ff44, emissiveIntensity: 1.4 })), 60, 35, 49.3);
    g.add(led);
    return tag(g, part);
  };

  // Enfriador de agua para el láser de femtosegundos (frente en +z local)
  L5.chiller = function () {
    const g = new T.Group();
    g.add(box(170, 300, 260, M('chiller', 'white'), 0, 150, -130));
    g.add(box(172, 12, 262, M('chiller', 'blackMetal'), 0, 6, -130));
    const vent = L5.MX('chiller', 'vent', () => new T.MeshStandardMaterial({ map: L5.ventTex, metalness: 0.5, roughness: 0.5 }));
    const gr = new T.Mesh(new T.PlaneGeometry(130, 120), vent); gr.position.set(0, 90, 0.3); g.add(gr);
    g.add(box(70, 30, 3, M('chiller', 'black'), 0, 245, 1));
    const disp = new T.Mesh(new T.PlaneGeometry(58, 20), L5.MX('chiller', 'disp', () => new T.MeshBasicMaterial({ map: L5.label('22.0°C', 160, 56, { bg: '#031a0a', fg: '#34ff7a', size: 34 }), toneMapped: false })));
    disp.position.set(0, 245, 2.7); g.add(disp);
    const lbl = new T.Mesh(new T.PlaneGeometry(120, 26), L5.MX('chiller', 'lbl', () => new T.MeshStandardMaterial({ map: L5.label('CHILLER ±0,1 °C', 300, 64, { bg: '#e8ebee', fg: '#1b1e23' }) })));
    lbl.position.set(0, 200, 0.4); g.add(lbl);
    [[-30, 0x2a6fe8], [30, 0xd33a2a]].forEach(([x, c]) => g.add(cyl(7, 18, L5.MX('chiller', 'nip' + c, () => new T.MeshStandardMaterial({ color: c, roughness: 0.5 })), 'z', x, 40, 9, 16)));
    return tag(g, 'chiller');
  };

  // Fuente de láser de fibra pulsado (Raycus/Cloudray): frente en +z local, salida de fibra a la derecha
  L5.fiberSource = function () {
    const g = new T.Group();
    g.add(box(230, 90, 300, M('laserNs', 'blackMetal'), 0, 45, -150));
    g.add(box(232, 6, 302, M('laserNs', 'black'), 0, 3, -150));
    const vent = L5.MX('laserNs', 'vent', () => new T.MeshStandardMaterial({ map: L5.ventTex, metalness: 0.6, roughness: 0.45 }));
    [-1, 1].forEach((s) => { const p = new T.Mesh(new T.PlaneGeometry(180, 60), vent); p.position.set(s * 115.3, 45, -150); p.rotation.y = s * Math.PI / 2; g.add(p); });
    g.add(box(230, 90, 3, M('laserNs', 'aluBlack'), 0, 45, 1.5));
    g.add(cyl(9, 16, M('laserNs', 'alu'), 'z', 70, 45, 10, 20));          // salida de fibra
    g.add(box(40, 12, 8, M('laserNs', 'steel'), -40, 50, 5));             // conector DB25
    g.add(box(24, 22, 8, M('laserNs', 'black'), -85, 45, 5));             // alimentación 24 V
    const lbl = new T.Mesh(new T.PlaneGeometry(110, 36), L5.MX('laserNs', 'lbl', () => new T.MeshStandardMaterial({ map: L5.label('FIBER LASER\n1064 nm · 20 W', 300, 98, { bg: '#1b1e23', fg: '#ffb24a', size: 30 }), roughness: 0.5 })));
    lbl.position.set(5, 50, 3.2); g.add(lbl);
    const led = box(4, 4, 1, L5.MX('laserNs', 'led', () => new T.MeshStandardMaterial({ color: 0x220000, emissive: 0xff3030, emissiveIntensity: 1.2 })), -100, 72, 3.3);
    g.add(led);
    g.userData.fiberOut = new T.Vector3(70, 45, 18);
    g.userData.db25 = new T.Vector3(-40, 50, 9);
    g.userData.power = new T.Vector3(-85, 45, 9);
    return tag(g, 'laserNs');
  };

  // Cabezal de salida del láser de fibra (aislador + colimador). Salida abajo en y=0, fibra arriba.
  L5.isolatorHead = function () {
    const g = new T.Group();
    g.add(cyl(14, 70, M('laserNs', 'aluBlack'), 'y', 0, 35, 0, 28));
    g.add(cyl(14.4, 8, M('laserNs', 'brass'), 'y', 0, 74, 0, 28));
    g.add(cyl(12, 30, M('laserNs', 'aluBlack'), 'y', 0, 93, 0, 28));
    g.add(cyl(6, 18, M('laserNs', 'alu'), 'y', 0, 117, 0, 18));
    g.add(cyl(10, 6, M('laserNs', 'alu'), 'y', 0, 3, 0, 24));
    const lbl = new T.Mesh(new T.CylinderGeometry(14.05, 14.05, 24, 28, 1, true), L5.MX('laserNs', 'iso', () => new T.MeshStandardMaterial({ map: L5.label('ISOLATOR  1064 nm   ◀ BEAM', 512, 48, { bg: '#16181b', fg: '#ffb24a', size: 24 }), roughness: 0.5 })));
    lbl.position.y = 40; g.add(lbl);
    return tag(g, 'laserNs');
  };

  // Montura giratoria impresa con lámina (HWP o analizador). Disco en plano xy, eje óptico z.
  L5.rotMount = function (discPart, discColor, withMotor) {
    const g = new T.Group();
    const housing = L5.ring(17, 12.5, 9, M('filamento', 'printOrange')); g.add(tag(housing, 'filamento'));
    const rotor = new T.Group();
    const gearRing = L5.ring(12.4, 10.5, 7, M('filamento', 'printGray')); rotor.add(tag(gearRing, 'filamento'));
    for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; const t = box(1.6, 1.6, 6, M('filamento', 'printGray'), Math.cos(a) * 12.6, Math.sin(a) * 12.6, 0); t.rotation.z = a; rotor.add(t); }
    const disc = cyl(10.5, 1.2, L5.MX(discPart, 'disc', () => new T.MeshPhysicalMaterial({ color: discColor, metalness: 0, roughness: 0.05, transmission: 0.55, transparent: true, opacity: 0.75, ior: 1.5 })), 'z', 0, 0, 0, 36);
    rotor.add(tag(disc, discPart));
    const mark = box(19, 1.2, 1.6, M(discPart, 'white'), 0, 0, 0.3); rotor.add(tag(mark, discPart));
    g.add(rotor);
    if (withMotor !== 'head') g.add(tag(box(10, 50, 9, M('filamento', 'printOrange'), 0, -37, 0), 'filamento'));
    let motor = null;
    if (withMotor) {
      motor = L5.byj48(); motor.position.set(22, 8, -6); motor.rotation.z = Math.PI; g.add(motor);
    }
    g.userData.rotor = rotor; g.userData.motor = motor;
    return g;
  };

  // Montura cinemática 25 mm + espejo; normal del espejo = +z local
  L5.mirrorMount = function (mirrorPart, mirrorMatName) {
    const g = new T.Group(), m = M('montura', 'aluBlack');
    g.add(box(40, 40, 6, m, 0, 0, -9));
    g.add(box(40, 40, 6, m, 0, 0, -1));
    [[14, 14], [-14, 14], [14, -14]].forEach(([x, y]) => g.add(cyl(3.2, 10, M('montura', 'brass'), 'z', x, y, -15, 14)));
    const mir = cyl(12.7, 4, mirrorMatName ? L5.MX(mirrorPart, 'glass', mirrorMatName) : M(mirrorPart, 'mirror'), 'z', 0, 0, 3, 40);
    g.add(tag(mir, mirrorPart));
    return tag(g, 'montura');
  };

  L5.pbs = function () {
    const g = new T.Group();
    const glass = L5.MX('pbs', 'glass', () => new T.MeshPhysicalMaterial({ color: 0xbfe8ff, roughness: 0.02, transmission: 0.9, transparent: true, opacity: 0.55, ior: 1.5 }));
    g.add(box(25.4, 25.4, 25.4, glass));
    const d = box(35.6, 25, 0.5, M('pbs', 'mirror'), 0, 0, 0); d.rotation.y = Math.PI / 4; d.material.transparent = true; d.material.opacity = 0.5;
    g.add(d);
    g.add(box(31, 6, 31, M('filamento', 'printOrange'), 0, -15.7, 0));
    tag(g.children[2], 'filamento');
    return tag(g, 'pbs');
  };

  L5.beamDump = function () {
    const g = new T.Group(), m = M('beamDump', 'aluBlack');
    g.add(box(22, 30, 22, m, 0, 15, 0));
    for (let i = 0; i < 5; i++) g.add(box(26, 2, 26, m, 0, 4 + i * 6, 0));
    g.add(cyl(6, 2, M('beamDump', 'black'), 'x', -11.2, 18, 0, 20));
    return tag(g, 'beamDump');
  };

  // Cubo del cabezal: jaula impresa + espejo dicroico a 45°
  L5.dichroicCube = function () {
    const g = new T.Group(), m = M('filamento', 'printOrange');
    const e = 30, t = 3;
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      g.add(tag(box(e, t, t, m, 0, sy * (e - t) / 2, sx * (e - t) / 2), 'filamento'));
      g.add(tag(box(t, e, t, m, sx * (e - t) / 2, 0, sy * (e - t) / 2), 'filamento'));
      g.add(tag(box(t, t, e, m, sx * (e - t) / 2, sy * (e - t) / 2, 0), 'filamento'));
    }
    const dm = L5.MX('dicroico', 'glass', () => new T.MeshPhysicalMaterial({ color: 0x66d9ff, metalness: 0.35, roughness: 0.04, transparent: true, opacity: 0.6, transmission: 0.4, iridescence: 1, iridescenceIOR: 1.6 }));
    const plate = box(34, 1.2, 25, dm); plate.rotation.z = Math.PI / 4; g.add(tag(plate, 'dicroico'));
    return g;
  };

  // Objetivo de microscopio, eje hacia -y (punta abajo), tope en y=0
  L5.objective = function () {
    const g = new T.Group();
    g.add(cyl(10, 5, M('objetivo', 'brass'), 'y', 0, -2.5, 0, 28));
    g.add(cyl(12, 14, M('objetivo', 'black'), 'y', 0, -12, 0, 32));
    g.add(cyl(12.1, 1.2, M('objetivo', 'red'), 'y', 0, -8, 0, 32));
    g.add(cyl(11, 6, M('objetivo', 'chrome'), 'y', 0, -22, 0, 32));
    g.add(cyl(5, 8, M('objetivo', 'black'), 'y', 0, -29, 0, 28, 10));
    g.add(cyl(3.6, 0.6, L5.MX('objetivo', 'lens', () => new T.MeshPhysicalMaterial({ color: 0x9ec9ff, roughness: 0, metalness: 0.2, transmission: 0.6, transparent: true, opacity: 0.8 })), 'y', 0, -33.1, 0, 24));
    const lbl = new T.Mesh(new T.CylinderGeometry(12.05, 12.05, 6, 32, 1, true), L5.MX('objetivo', 'lbl', () => {
      const tx = L5.label('20×  NA 0.40  ·  WD 20   ∞/0   LWD', 512, 48, { bg: '#16181b', fg: '#e8e8e8', size: 26 });
      return new T.MeshStandardMaterial({ map: tx, roughness: 0.5 });
    }));
    lbl.position.y = -14.5; g.add(lbl);
    return tag(g, 'objetivo');
  };

  // Brazo de cámara a lo largo de +x desde el cubo
  L5.cameraArm = function () {
    const g = new T.Group();
    const tube = cyl(12, 50, M('lenteTubo', 'black'), 'x', 50, 0, 0, 28);
    g.add(tag(tube, 'lenteTubo'));
    g.add(tag(cyl(10, 0.8, L5.MX('lenteTubo', 'lens', () => new T.MeshPhysicalMaterial({ color: 0xa8d0ff, roughness: 0, transmission: 0.7, transparent: true, opacity: 0.7 })), 'x', 25.4, 0, 0, 28), 'lenteTubo'));
    const cam = new T.Group();
    cam.add(box(45, 42, 42, M('camara', 'blackMetal'), 0, 0, 0));
    cam.add(cyl(13, 6, M('camara', 'alu'), 'x', -25, 0, 0, 28));
    cam.add(box(2, 7, 11, M('camara', 'steel'), 23, 0, 0));
    const lbl = new T.Mesh(new T.PlaneGeometry(36, 16), L5.MX('camara', 'lbl', () => new T.MeshStandardMaterial({ map: L5.label('USB CAM\nC-mount', 256, 112, { bg: '#2c2f35', fg: '#ff9a3d' }) })));
    lbl.position.set(0, 0, 21.2); cam.add(lbl);
    cam.position.set(100, 0, 0);
    g.add(tag(cam, 'camara'));
    return g;
  };

  L5.backlight = function () {
    const g = new T.Group();
    g.add(tag(L5.ring(17, 12.5, 6, M('filamento', 'printGray')), 'filamento'));
    g.children[0].rotation.x = Math.PI / 2; g.children[0].position.y = 3;
    const ledMat = L5.MX('backlight', 'led', () => new T.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff6e8, emissiveIntensity: 0.15, roughness: 0.4 }));
    const disc = cyl(12.4, 3, ledMat, 'y', 0, 2.5, 0, 36); g.add(tag(disc, 'backlight'));
    g.userData.led = ledMat;
    return g;
  };

  L5.crystal = function () {
    const mat = L5.MX('cuboSilice', 'glass', () => new T.MeshPhysicalMaterial({
      color: 0xffffff, metalness: 0, roughness: 0.0, transmission: 1, thickness: 20, ior: 1.46,
      attenuationColor: new T.Color(0xcfeaff), attenuationDistance: 45,
      transparent: true, opacity: 1, specularIntensity: 1, envMapIntensity: 1.4, side: T.FrontSide,
      depthWrite: false, // si escribe profundidad tapa a los voxels de adentro
    }));
    const m = L5.mesh(new T.BoxGeometry(20, 20, 20), mat); m.castShadow = false;
    const edges = new T.LineSegments(new T.EdgesGeometry(m.geometry), new T.LineBasicMaterial({ color: 0x7cc8ff, transparent: true, opacity: 0.9 }));
    m.add(edges);
    return tag(m, 'cuboSilice');
  };

  // Láser en caja; salida en +z local a la altura y=60 (origen en el piso)
  L5.laserBox = function (labelTex) {
    const g = new T.Group();
    g.add(box(80, 70, 180, M('laserFs', 'white'), 0, 50, -90));
    g.add(box(82, 12, 182, M('laserFs', 'blackMetal'), 0, 9, -90));
    for (let i = 0; i < 9; i++) g.add(box(2, 10, 150, M('laserFs', 'alu'), -32 + i * 8, 90, -95));
    g.add(box(80, 70, 2, M('laserFs', 'blackMetal'), 0, 50, 0.5));
    g.add(cyl(9, 12, M('laserFs', 'alu'), 'z', 0, 60, 6, 24));
    g.add(cyl(4, 12.2, M('laserFs', 'black'), 'z', 0, 60, 6, 20));
    const lblMat = L5.MX('laserFs', 'lbl', () => new T.MeshStandardMaterial({ map: labelTex, roughness: 0.5 }));
    const lbl = new T.Mesh(new T.PlaneGeometry(150, 50), lblMat); lbl.position.set(40.2, 50, -90); lbl.rotation.y = Math.PI / 2; g.add(lbl);
    const lbl2 = new T.Mesh(new T.PlaneGeometry(150, 50), lblMat); lbl2.position.set(-40.2, 50, -90); lbl2.rotation.y = -Math.PI / 2; g.add(lbl2);
    const warn = new T.Mesh(new T.PlaneGeometry(30, 26), L5.MX('laserFs', 'warn', () => new T.MeshStandardMaterial({ map: L5.label('⚠ CLASE 4', 128, 110, { bg: '#f2c200', fg: '#111', size: 30 }) })));
    warn.position.set(28, 72, 1.6); g.add(warn);
    return tag(g, 'laserFs');
  };

  L5.notebook = function (screenTex) {
    const g = new T.Group();
    const mat = M('notebook', 'laptop');
    g.add(box(330, 16, 228, mat, 0, 8, 0));
    g.add(box(290, 1, 100, M('notebook', 'black'), 0, 16.6, -40));
    g.add(box(100, 1, 62, M('notebook', 'blackMetal'), 0, 16.6, 66));
    const lid = new T.Group(); lid.position.set(0, 16, -114);
    lid.add(box(330, 220, 7, mat, 0, 110, -3.5));
    const scr = new T.Mesh(new T.PlaneGeometry(308, 196), L5.MX('notebook', 'screen', () => new T.MeshBasicMaterial({ map: screenTex, toneMapped: false })));
    scr.position.set(0, 112, 0.2); lid.add(scr);
    lid.rotation.x = -0.32;
    g.add(lid);
    return tag(g, 'notebook');
  };

  L5.glasses = function () {
    const g = new T.Group();
    const lens = L5.MX('lentesLaser', 'lens', () => new T.MeshPhysicalMaterial({ color: 0x2bd96b, roughness: 0.1, transmission: 0.4, transparent: true, opacity: 0.75 }));
    g.add(box(150, 46, 3, lens, 0, 30, 0));
    g.add(box(152, 6, 6, M('lentesLaser', 'black'), 0, 54, 0));
    [-74, 74].forEach((x) => g.add(box(4, 6, 130, M('lentesLaser', 'black'), x, 50, -64)));
    return tag(g, 'lentesLaser');
  };
})();
