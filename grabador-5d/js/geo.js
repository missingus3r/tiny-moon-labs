/* Geometría y materiales base. Unidades: 1 = 1 mm.
   Ejes de la máquina: X = x de three, Y (adelante/atrás) = z de three, Z (vertical) = y de three. */
(function () {
  const T = THREE;
  const L5 = (window.L5 = window.L5 || {});

  const BASE = {
    alu:        { color: 0xc4cad2, metalness: 0.82, roughness: 0.34 },
    aluBlack:   { color: 0x23262b, metalness: 0.7,  roughness: 0.38 },
    chrome:     { color: 0xf2f4f7, metalness: 1.0,  roughness: 0.07 },
    steel:      { color: 0xa9aeb5, metalness: 0.9,  roughness: 0.3 },
    zinc:       { color: 0xb9bcc0, metalness: 0.85, roughness: 0.42 },
    brass:      { color: 0xd4a84a, metalness: 0.95, roughness: 0.28 },
    black:      { color: 0x1c1e22, metalness: 0.15, roughness: 0.62 },
    blackMetal: { color: 0x2c2f35, metalness: 0.6,  roughness: 0.42 },
    nemaCap:    { color: 0x9aa1aa, metalness: 0.85, roughness: 0.36 },
    gold28:     { color: 0xc8c2b4, metalness: 0.75, roughness: 0.38 },
    blueCap:    { color: 0x2a67c9, metalness: 0.1,  roughness: 0.5 },
    pcbRed:     { color: 0xb31f2a, metalness: 0.1,  roughness: 0.55 },
    pcbBlue:    { color: 0x1d5ea8, metalness: 0.1,  roughness: 0.55 },
    pcbGreen:   { color: 0x1b7a3c, metalness: 0.1,  roughness: 0.55 },
    pcbPurple:  { color: 0x5d3aa0, metalness: 0.1,  roughness: 0.55 },
    termGreen:  { color: 0x2f9e4f, metalness: 0.05, roughness: 0.6 },
    white:      { color: 0xe8ebee, metalness: 0.1,  roughness: 0.5 },
    lightGray:  { color: 0xc9cdd2, metalness: 0.2,  roughness: 0.55 },
    printOrange:{ color: 0xe0500a, metalness: 0.0,  roughness: 0.5 },
    printGray:  { color: 0x3d434b, metalness: 0.0,  roughness: 0.55 },
    yellow:     { color: 0xf2c200, metalness: 0.05, roughness: 0.45 },
    red:        { color: 0xd3191f, metalness: 0.05, roughness: 0.4 },
    cable:      { color: 0x15171a, metalness: 0.1,  roughness: 0.65 },
    cableGray:  { color: 0x8c9198, metalness: 0.1,  roughness: 0.6 },
    cableRed:   { color: 0xb3262b, metalness: 0.1,  roughness: 0.6 },
    wood:       { color: 0x7a5a3e, metalness: 0.0,  roughness: 0.82 },
    mirror:     { color: 0xffffff, metalness: 1.0,  roughness: 0.02 },
    led:        { color: 0xffffff, metalness: 0.0,  roughness: 0.3, emissive: 0xffffff, emissiveIntensity: 0.2 },
    screen:     { color: 0x000000, metalness: 0.0,  roughness: 0.25 },
    laptop:     { color: 0x3a3e45, metalness: 0.55, roughness: 0.4 },
    rubber:     { color: 0x101113, metalness: 0.0,  roughness: 0.9 },
  };

  // Un material por (parte, tipo): así se puede resaltar o aislar una parte sin tocar las demás.
  const cache = {};
  const byPart = {};
  function register(part, m) {
    m.userData.part = part;
    m.userData.orig = {
      transparent: m.transparent, opacity: m.opacity, depthWrite: m.depthWrite,
      emissive: m.emissive ? m.emissive.clone() : null,
      emissiveIntensity: m.emissiveIntensity !== undefined ? m.emissiveIntensity : 1,
    };
    (byPart[part] = byPart[part] || []).push(m);
    return m;
  }
  L5.M = function (part, name) {
    const k = part + '|' + name;
    if (!cache[k]) cache[k] = register(part, new T.MeshStandardMaterial(Object.assign({}, BASE[name])));
    return cache[k];
  };
  // Materiales especiales (vidrio, ópticas, texturas propias)
  L5.MX = function (part, name, factory) {
    const k = part + '|' + name;
    if (!cache[k]) cache[k] = register(part, factory());
    return cache[k];
  };
  L5.materialsOf = (part) => byPart[part] || [];
  L5.allMaterialParts = () => Object.keys(byPart);

  L5.V = { x: new T.Vector3(1, 0, 0), y: new T.Vector3(0, 1, 0), z: new T.Vector3(0, 0, 1),
           nx: new T.Vector3(-1, 0, 0), ny: new T.Vector3(0, -1, 0), nz: new T.Vector3(0, 0, -1) };

  L5.mesh = function (geo, mat, x, y, z) {
    const m = new T.Mesh(geo, mat);
    m.position.set(x || 0, y || 0, z || 0);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  };
  L5.box = (w, h, d, mat, x, y, z) => L5.mesh(new T.BoxGeometry(w, h, d), mat, x, y, z);
  // Cilindro con eje en 'x' | 'y' | 'z'
  L5.cyl = function (r, h, mat, axis, x, y, z, seg, r2) {
    const g = new T.CylinderGeometry(r2 !== undefined ? r2 : r, r, h, seg || 28);
    if (axis === 'x') g.rotateZ(-Math.PI / 2);
    if (axis === 'z') g.rotateX(Math.PI / 2);
    return L5.mesh(g, mat, x, y, z);
  };
  // Anillo extruido (tubo con agujero) a lo largo de z local
  L5.ring = function (rOut, rIn, depth, mat, seg) {
    const s = new T.Shape(); s.absarc(0, 0, rOut, 0, Math.PI * 2, false);
    const h = new T.Path(); h.absarc(0, 0, rIn, 0, Math.PI * 2, true); s.holes.push(h);
    const g = new T.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: seg || 32 });
    g.translate(0, 0, -depth / 2);
    return L5.mesh(g, mat);
  };

  // Orienta obj: z local -> along, y local -> up
  L5.basis = function (obj, along, up) {
    const z = along.clone().normalize();
    const y = up.clone().normalize();
    const x = new T.Vector3().crossVectors(y, z).normalize();
    y.crossVectors(z, x);
    obj.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(x, y, z));
    return obj;
  };

  // ---------- Perfil 2040 con ranuras en T ----------
  function profileShape(w, h) {
    const hw = w / 2, hh = h / 2, pts = [];
    function edge(ax, ay, bx, by) {
      const L = Math.hypot(bx - ax, by - ay), dx = (bx - ax) / L, dy = (by - ay) / L;
      const nx = -dy, ny = dx; // normal hacia adentro (recorrido antihorario)
      pts.push([ax, ay]);
      const n = Math.round(L / 20);
      for (let i = 0; i < n; i++) {
        const c = 10 + 20 * i, cx = ax + dx * c, cy = ay + dy * c;
        const P = (t, d) => [cx + dx * t + nx * d, cy + dy * t + ny * d];
        pts.push(P(-3.1, 0), P(-3.1, 1.8), P(-5.6, 1.8), P(-5.6, 6.1), P(5.6, 6.1), P(5.6, 1.8), P(3.1, 1.8), P(3.1, 0));
      }
    }
    edge(-hw, -hh, hw, -hh); edge(hw, -hh, hw, hh); edge(hw, hh, -hw, hh); edge(-hw, hh, -hw, -hh);
    const s = new T.Shape();
    s.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
    for (let i = 0; i < Math.round(w / 20); i++)
      for (let j = 0; j < Math.round(h / 20); j++) {
        const p = new T.Path(); p.absarc(-hw + 10 + 20 * i, -hh + 10 + 20 * j, 2.1, 0, Math.PI * 2, true); s.holes.push(p);
      }
    return s;
  }
  const profShape = profileShape(20, 40);
  const profGeo = {};
  // x local = 20 mm, y local = 40 mm, z local = largo
  L5.profile = function (part, len, along, wideDir, pos) {
    if (!profGeo[len]) {
      const g = new T.ExtrudeGeometry(profShape, { depth: len, bevelEnabled: false, curveSegments: 10 });
      g.translate(0, 0, -len / 2);
      profGeo[len] = g;
    }
    const m = L5.mesh(profGeo[len], L5.M(part, 'alu'));
    L5.basis(m, along, wideDir);
    m.position.copy(pos);
    m.userData.len = len;
    if (L5.tag) L5.tag(m, part);
    return m;
  };

  // Cuadrado con chaflán extruido en z local
  L5.chamferBox = function (w, depth, ch, mat) {
    const s = new T.Shape(), a = w / 2;
    s.moveTo(-a + ch, -a); s.lineTo(a - ch, -a); s.lineTo(a, -a + ch); s.lineTo(a, a - ch);
    s.lineTo(a - ch, a); s.lineTo(-a + ch, a); s.lineTo(-a, a - ch); s.lineTo(-a, -a + ch);
    const g = new T.ExtrudeGeometry(s, { depth, bevelEnabled: false });
    g.translate(0, 0, -depth / 2);
    return L5.mesh(g, mat);
  };

  // ---------- Texturas de canvas ----------
  L5.canvasTex = function (w, h, draw, repeat) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new T.CanvasTexture(c);
    t.encoding = T.sRGBEncoding;
    t.anisotropy = 8;
    if (repeat) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
    return t;
  };
  L5.label = function (text, w, h, opts) {
    opts = opts || {};
    return L5.canvasTex(w || 256, h || 64, (g, W, H) => {
      g.fillStyle = opts.bg || '#1b1e23'; g.fillRect(0, 0, W, H);
      g.fillStyle = opts.fg || '#e6e9ee';
      g.font = (opts.weight || '600') + ' ' + (opts.size || Math.round(H * 0.42)) + 'px system-ui, Segoe UI, sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      const lines = String(text).split('\n');
      lines.forEach((ln, i) => g.fillText(ln, W / 2, H / 2 + (i - (lines.length - 1) / 2) * H * 0.42));
    });
  };

  // Rosca del husillo: rayas diagonales que dejan ver el giro
  L5.threadTex = L5.canvasTex(64, 64, (g, W, H) => {
    g.fillStyle = '#9ea3aa'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#5d6168'; g.lineWidth = 10;
    for (let i = -2; i < 4; i++) { g.beginPath(); g.moveTo(0, i * 32); g.lineTo(W, i * 32 + 32); g.stroke(); }
    g.strokeStyle = '#d6d9dd'; g.lineWidth = 3;
    for (let i = -2; i < 4; i++) { g.beginPath(); g.moveTo(0, i * 32 + 12); g.lineTo(W, i * 32 + 44); g.stroke(); }
  });

  L5.ventTex = L5.canvasTex(256, 128, (g, W, H) => {
    g.fillStyle = '#b9bdc3'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#2a2d31';
    for (let y = 10; y < H - 6; y += 12) for (let x = 10 + ((y / 12) % 2) * 6; x < W - 6; x += 12) {
      g.beginPath(); g.arc(x, y, 3.6, 0, Math.PI * 2); g.fill();
    }
  });

  L5.glowTex = L5.canvasTex(128, 128, (g, W, H) => {
    const gr = g.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.18, 'rgba(255,170,190,0.9)');
    gr.addColorStop(0.45, 'rgba(255,40,80,0.35)'); gr.addColorStop(1, 'rgba(255,0,40,0)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
  });
})();
