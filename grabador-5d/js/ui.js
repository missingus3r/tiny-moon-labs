/* Interfaz: selección, aislamiento, etiquetas, lista de partes con precios, consola y pantallas. */
(function () {
  const T = THREE, L5 = window.L5, G = L5.G;
  const $ = (s) => document.querySelector(s);
  const ui = (L5.ui = { showBeam: true, polView: false, labels: false, selected: null, hover: null, isolated: null, hideOthers: false, explode: 0 });
  const fmt = (n) => '$ ' + Math.round(n).toLocaleString('es-UY');
  const fmtUsd = (n) => 'US$ ' + Math.round(n).toLocaleString('es-UY');
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---------- BOM ----------
  const HAVE_KEY = 'l5-have-v1';
  let have = {};
  try { have = JSON.parse(localStorage.getItem(HAVE_KEY) || '{}'); } catch (e) { have = {}; }
  if (have.notebook === undefined) have.notebook = true;
  const saveHave = () => { try { localStorage.setItem(HAVE_KEY, JSON.stringify(have)); } catch (e) {} };

  const items = () => L5.BOM.items.filter((it) => !it.cfg || (it.cfg === 'fs') === L5.cfg.mode5D);
  const itemByKey = (k) => L5.BOM.items.find((it) => it.key === k && (!it.cfg || (it.cfg === 'fs') === L5.cfg.mode5D)) || L5.BOM.items.find((it) => it.key === k);
  // el mismo cubo 3D representa la sílice (5D) o el K9 (3D)
  const keyAlias = (k) => (k === 'cuboSilice' && !L5.cfg.mode5D ? 'cuboK9' : k);
  const modelKey = (k) => (k === 'cuboK9' ? 'cuboSilice' : k);
  // Visible de verdad: ni el objeto ni sus padres ocultos, ni material fantasma/transparente del todo
  function shown(o) {
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    if (mats.some((m) => m && (m.visible === false || m.userData.ghost || (m.transparent && m.opacity < 0.02)))) return false;
    for (; o; o = o.parent) if (!o.visible) return false;
    return true;
  }
  const shownTagged = (k) => (L5.tagged[k] || []).filter((o) => {
    let ok = true;
    o.traverse((m) => { if (ok && m.isMesh && m.userData.origMat) ok = false; });
    for (let p = o; p; p = p.parent) if (!p.visible) return false;
    return ok;
  });
  ui.cheapOptics = true;
  // Datos efectivos del ítem según la opción de óptica elegida
  const eff = (it, cheap) => {
    const useAlt = it.alt && (cheap === undefined ? ui.cheapOptics : cheap);
    return useAlt ? Object.assign({}, it, it.alt, { verified: false, spec: it.alt.name + ' · ' + it.spec.replace(/^Thorlabs [^\s,:]+[,:]?\s*/, '') }) : it;
  };
  const packs = (it) => (it.pack ? Math.ceil(it.qty / it.pack) : 0);
  const subtotal = (it, cheap) => {
    const e = eff(it, cheap);
    if (e.pack && e.packPrice) return packs(e) * e.packPrice;
    return (e.unit_price_uyu || 0) * e.qty;
  };
  const qtyText = (it) => (it.pack ? `${it.qty} → ${packs(it)} pack${packs(it) > 1 ? 's' : ''} ×${it.pack}` : `${it.qty}`);

  function renderBOM() {
    const cats = [];
    items().forEach((it) => { if (!cats.includes(it.cat)) cats.push(it.cat); });
    let html = '', n = 0, total = 0, missing = 0, imported = 0, local = 0, laser = 0, other = 0, estim = 0;
    cats.forEach((cat) => {
      const list = items().filter((it) => it.cat === cat);
      const catSum = list.reduce((a, it) => a + subtotal(it), 0);
      html += `<tr class="cat"><td colspan="5">${esc(cat)}</td><td class="num">${fmt(catSum)}</td><td></td></tr>`;
      list.forEach((it0) => {
        n++; it0.n = n;
        const it = eff(it0);
        const st = subtotal(it0); total += st; if (!have[it.key]) missing += st;
        if ((it.source || '').startsWith('import')) imported += st; else local += st;
        if (it.key === 'laserFs' || it.key === 'laserNs') laser += st;
        if (!it.verified) estim += st;
        other += subtotal(it0, !ui.cheapOptics);
        const modeled = shownTagged(modelKey(it.key)).length > 0;
        const unitP = it.pack && it.packPrice ? `${fmt(it.packPrice)}<span class="u">/pack</span>` : fmt(it.unit_price_uyu || 0);
        html += `<tr data-key="${it.key}" class="${ui.selected === modelKey(it.key) ? 'sel' : ''} ${have[it.key] ? 'have' : ''}">
          <td><input type="checkbox" data-have="${it.key}" ${have[it.key] ? 'checked' : ''} title="Ya lo tengo"></td>
          <td class="idx">${n}</td>
          <td><div class="pn">${esc(it.name)}${modeled ? '' : ' <span class="b nm" title="Sin modelo 3D">sin 3D</span>'}</div><div class="ps">${esc(it.spec)}</div></td>
          <td class="num">${esc(qtyText(it))}<span class="u">${esc(it.unit || 'u')}</span></td>
          <td class="num dim">${unitP}</td>
          <td class="num">${fmt(st)}</td>
          <td>${it.link ? `<a href="${esc(it.link)}" target="_blank" rel="noopener" title="${esc(it.source || '')}">↗</a>` : ''}<span class="b ${it.verified ? 'ok' : 'est'}" title="${it.verified ? 'Precio de un listado concreto' : 'Precio estimado'}">${it.verified ? '✓' : '≈'}</span></td>
        </tr>`;
      });
    });
    $('#bomBody').innerHTML = html;
    const fx = L5.BOM.fx.usd_uyu;
    $('#tot').innerHTML = `
      <div><span>Total del sistema</span><b>${fmt(total)}</b></div>
      <div><span>≈ en dólares (${fx.toFixed(2)} UYU/USD)</span><b>${fmtUsd(total / fx)}</b></div>
      <div><span>Sin el láser</span><b>${fmt(total - laser)} · ${fmtUsd((total - laser) / fx)}</b></div>
      <div><span>Comprado en Uruguay</span><b>${fmt(local)}</b></div>
      <div><span>Importado (sin flete ni impuestos)</span><b>${fmt(imported)}</b></div>
      <div><span>Con óptica ${ui.cheapOptics ? 'Thorlabs' : 'genérica'} sería</span><b>${fmt(other)}</b></div>
      <div><span>Parte estimada (≈)</span><b>${fmt(estim)}</b></div>
      <div class="miss"><span>Falta comprar (sin lo tildado)</span><b>${fmt(missing)}</b></div>`;
    L5.totals = { total, laser, local, imported, other, estim, missing };
  }

  // ---------- Selección / resaltado / aislamiento ----------
  function setEmissive(part, on) {
    L5.materialsOf(part).forEach((m) => {
      if (!m.emissive) return;
      const o = m.userData.orig;
      if (on) { m.emissive.setHex(0x2f7dff); m.emissiveIntensity = on === 'hover' ? 0.35 : 0.6; }
      else { m.emissive.copy(o.emissive); m.emissiveIntensity = o.emissiveIntensity; }
    });
  }
  function applyIsolation() {
    const iso = ui.isolated;
    L5.allMaterialParts().forEach((p) => {
      L5.materialsOf(p).forEach((m) => {
        const o = m.userData.orig;
        const ghost = iso && p !== iso;
        const was = m.transparent;
        if (ghost) { m.transparent = true; m.opacity = ui.hideOthers ? 0 : 0.06; m.depthWrite = false; }
        else { m.transparent = o.transparent; m.opacity = o.opacity; m.depthWrite = o.depthWrite; }
        m.visible = !(ghost && ui.hideOthers);
        if (was !== m.transparent) m.needsUpdate = true;
      });
    });
    L5.voxels.visible = !iso || iso === 'cuboSilice';
    L5.crystalMesh.children.forEach((c) => { if (c.isLineSegments) c.visible = !iso || iso === 'cuboSilice'; });
    $('#isoBtn').classList.toggle('on', !!iso);
    $('#cardIso').textContent = iso ? 'Mostrar todo' : 'Aislar';
  }
  L5.select = function (part, opts) {
    opts = opts || {};
    part = part ? modelKey(part) : null;
    if (ui.selected && ui.selected !== part) setEmissive(ui.selected, false);
    ui.selected = part;
    if (part) setEmissive(part, true);
    if (ui.isolated && part && ui.isolated !== part) { ui.isolated = part; applyIsolation(); }
    showCard(part);
    document.querySelectorAll('#bomBody tr[data-key]').forEach((tr) => tr.classList.toggle('sel', modelKey(tr.dataset.key) === part));
    if (part && opts.scroll) { const tr = document.querySelector(`#bomBody tr[data-key="${keyAlias(part)}"]`); if (tr) tr.scrollIntoView({ block: 'nearest' }); }
    if (part && opts.focus) focusPart(part);
  };
  L5.isolate = function (part) {
    part = part ? modelKey(part) : null;
    ui.isolated = ui.isolated === part ? null : part;
    applyIsolation();
    if (ui.isolated) focusPart(ui.isolated);
  };

  function showCard(part) {
    const card = $('#card');
    if (!part) { card.hidden = true; return; }
    const it0 = itemByKey(keyAlias(part)), it = it0 && eff(it0);
    card.hidden = false;
    const modeled = shownTagged(part).length > 0;
    if (!it) { $('#cardBody').innerHTML = `<h3>${esc(part)}</h3>`; return; }
    $('#cardBody').innerHTML = `
      <div class="cn">#${it.n || '–'} · ${esc(it.cat)}</div>
      <h3>${esc(it.name)}</h3>
      <div class="cs">${esc(it.spec)}</div>
      <div class="cg">
        <span>Cantidad</span><b>${esc(qtyText(it))} ${esc(it.unit || 'u')}</b>
        <span>${it.pack ? 'Precio por pack' : 'Precio unitario'}</span><b>${fmt(it.pack && it.packPrice ? it.packPrice : it.unit_price_uyu || 0)}${it.currency === 'USD' ? ` <i>(US$ ${esc(it.price)})</i>` : ''}</b>
        <span>Subtotal</span><b>${fmt(subtotal(it0))}</b>
        <span>Fuente</span><b>${esc(it.source || '—')} <em class="b ${it.verified ? 'ok' : 'est'}">${it.verified ? 'listado real' : 'estimado'}</em></b>
      </div>
      ${it.note ? `<div class="cnote">${esc(it.note)}</div>` : ''}
      ${it.link ? `<a class="buy" href="${esc(it.link)}" target="_blank" rel="noopener">Ver en ${esc((it.source || 'tienda').replace(/^import: /, ''))} ↗</a>` : ''}
      ${modeled ? '' : '<div class="cnote">Esta parte no tiene modelo 3D (consumible o kit).</div>'}`;
  }

  // ---------- Cámara: enfocar parte / vistas ----------
  const camAnim = { t: 1, fromP: new T.Vector3(), toP: new T.Vector3(), fromT: new T.Vector3(), toT: new T.Vector3() };
  function flyTo(target, dist, dir, follow) {
    const cam = L5.camera, ctl = L5.controls;
    ui.follow = follow ? { obj: follow.obj, local: follow.local, last: follow.obj.localToWorld(follow.local.clone()) } : null;
    const d = dir ? dir.clone().normalize() : cam.position.clone().sub(ctl.target).normalize();
    camAnim.fromP.copy(cam.position); camAnim.fromT.copy(ctl.target);
    camAnim.toT.copy(target); camAnim.toP.copy(target).addScaledVector(d, dist);
    camAnim.t = 0;
  }
  function partBox(part) {
    const b = new T.Box3(), tmp = new T.Box3();
    shownTagged(part).forEach((o) => { tmp.setFromObject(o); if (!tmp.isEmpty()) b.union(tmp); });
    return b;
  }
  function focusPart(part) {
    const b = partBox(part);
    if (b.isEmpty()) return;
    const c = b.getCenter(new T.Vector3()), s = b.getSize(new T.Vector3()).length();
    flyTo(c, Math.max(35, s * 1.6 + 25));
  }
  L5.view = function (name) {
    const V = {
      general: [new T.Vector3(10, 190, -10), 1250, new T.Vector3(0.62, 0.5, 0.75)],
      cristal: [null, 88, new T.Vector3(0.45, 0.8, 0.85)],
      cabezal: [null, 260, new T.Vector3(0.75, 0.25, 0.8)],
      optica: L5.cfg.mode5D ? [new T.Vector3(300, 250, -60), 760, new T.Vector3(0.95, 0.3, 0.55)] : [new T.Vector3(200, 220, -110), 760, new T.Vector3(0.75, 0.35, 0.8)],
      electronica: [new T.Vector3(-420, 40, -40), 520, new T.Vector3(-0.2, 0.75, 0.85)],
    }[name];
    let tgt = V[0], follow = null;
    if (name === 'cristal') { follow = { obj: L5.xg, local: new T.Vector3(0, G.crystalY + 2, 0) }; V[1] = 88 * Math.pow(G.crystalSize / 20, 0.8); }
    if (name === 'cabezal') follow = { obj: L5.zg, local: new T.Vector3(40, G.cy0 - 110, 0) };
    if (follow) tgt = follow.obj.localToWorld(follow.local.clone());
    flyTo(tgt, V[1], V[2], follow);
  };

  // ---------- Etiquetas ----------
  let labelEls = {};
  const labelAnchor = {};
  function buildLabels() {
    const host = $('#labels'); host.innerHTML = ''; labelEls = {};
    items().forEach((it) => {
      const mk = modelKey(it.key);
      const vis = shownTagged(mk);
      if (!vis.length) return;
      labelAnchor[mk] = vis[0];
      const el = document.createElement('div');
      el.className = 'lbl'; el.innerHTML = `<b>${it.n}</b>${esc(it.short || it.name)}`;
      el.onclick = (e) => { e.stopPropagation(); L5.select(mk, { focus: true, scroll: true }); };
      host.appendChild(el); labelEls[mk] = el;
    });
  }
  const tmpV = new T.Vector3(), tmpBox = new T.Box3();
  function updateLabels() {
    const host = $('#labels');
    host.style.display = ui.labels ? 'block' : 'none';
    if (!ui.labels) return;
    const r = L5.renderer.domElement.getBoundingClientRect();
    Object.keys(labelEls).forEach((k) => {
      const el = labelEls[k], o = labelAnchor[k];
      const show = (!ui.isolated || ui.isolated === k) && shown(o);
      tmpBox.setFromObject(o); tmpBox.getCenter(tmpV);
      tmpV.project(L5.camera);
      if (!show || tmpV.z > 1) { el.style.display = 'none'; return; }
      el.style.display = '';
      el.style.transform = `translate(${r.left + (tmpV.x * 0.5 + 0.5) * r.width}px, ${r.top + (-tmpV.y * 0.5 + 0.5) * r.height}px)`;
      el.classList.toggle('sel', k === ui.selected);
    });
  }

  // ---------- Picking ----------
  const ray = new T.Raycaster(), mouse = new T.Vector2();
  // (el raycaster de Three no mira si un padre está oculto, por eso pick() usa shown())
  function pick(ev) {
    const r = L5.renderer.domElement.getBoundingClientRect();
    mouse.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(mouse, L5.camera);
    const hits = ray.intersectObjects(L5.root.children, true);
    let enclosure = null; // el cerramiento solo se elige si no hay otra pieza detrás
    for (const h of hits) {
      let o = h.object, p = null;
      if (o.isSprite || o.isLine || o.isLineSegments || !shown(o)) continue;
      if (o === L5.voxels) { p = 'cuboSilice'; }
      while (o && !p) { if (o.userData && o.userData.part) p = o.userData.part; o = o.parent; }
      if (!p) { if (h.object === L5.bench) break; continue; }
      if (ui.isolated && p !== ui.isolated) continue;
      if (p === 'cerramiento' && ui.isolated !== 'cerramiento') { enclosure = enclosure || p; continue; }
      return p;
    }
    return enclosure;
  }
  function bindPicking() {
    const el = L5.renderer.domElement;
    let down = null, pending = null;
    el.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
    el.addEventListener('pointerup', (e) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return;
      const p = pick(e);
      L5.select(p, { scroll: true });
      if (p) switchTabIfNeeded();
    });
    el.addEventListener('dblclick', (e) => { const p = pick(e); if (p) L5.select(p, { focus: true, scroll: true }); });
    el.addEventListener('pointermove', (e) => { pending = e; });
    el.addEventListener('pointerleave', () => { pending = null; setHover(null); $('#tip').style.display = 'none'; });
    ui._hoverTick = () => {
      if (!pending) return;
      const e = pending; pending = null;
      const p = pick(e);
      setHover(p);
      const tip = $('#tip');
      if (p) {
        const it = itemByKey(keyAlias(p));
        tip.innerHTML = `<b>${esc(it ? eff(it).name : p)}</b>${it ? `<span>${esc(qtyText(it))} ${esc(it.unit || 'u')} · ${fmt(subtotal(it))}</span>` : ''}`;
        tip.style.display = 'block'; tip.style.left = e.clientX + 14 + 'px'; tip.style.top = e.clientY + 12 + 'px';
        el.style.cursor = 'pointer';
      } else { tip.style.display = 'none'; el.style.cursor = ''; }
    };
  }
  function setHover(p) {
    if (ui.hover === p) return;
    if (ui.hover && ui.hover !== ui.selected) setEmissive(ui.hover, false);
    ui.hover = p;
    if (p && p !== ui.selected) setEmissive(p, 'hover');
  }
  function switchTabIfNeeded() { /* la ficha flotante ya muestra la info; no forzamos cambio de pestaña */ }

  // ---------- Consola / estado ----------
  const logEl = () => $('#log');
  const logLines = [];
  ui.log = function (line, cls) {
    logLines.push(line); if (logLines.length > 300) logLines.shift();
    const d = document.createElement('div'); d.textContent = line; if (cls) d.className = cls;
    const el = logEl(); el.appendChild(d);
    while (el.childNodes.length > 220) el.removeChild(el.firstChild);
    el.scrollTop = el.scrollHeight;
  };
  ui.onPhase = (name) => { $('#phase').textContent = name; };
  ui.onProgress = function () {
    const j = L5.job;
    let pct = 0;
    if (j.kind === 'write') pct = j.phase === 'Escritura' ? (j.done / Math.max(1, j.total)) * 80 : j.phase === 'Validación' ? 80 + readPct() * 20 : j.phase.startsWith('Valid') ? 100 : 0;
    if (j.kind === 'read') pct = readPct() * 100;
    $('#bar').style.width = Math.min(100, pct).toFixed(1) + '%';
  };
  function readPct() {
    const w = L5.grid.filter((g) => g.w || g.expect).length || 1;
    return Math.min(1, L5.grid.filter((g) => g.read && (g.w || g.expect)).length / w);
  }
  ui.onJob = function () {
    const busy = L5.state.busy;
    ['#btnWrite', '#btnRead', '#btnHome', '#btnExample', '#btnClear'].forEach((s) => ($(s).disabled = busy));
    document.querySelectorAll('[name=sys], [name=enc3d]').forEach((r) => (r.disabled = busy));
    document.body.classList.toggle('ppm', !L5.cfg.mode5D && L5.cfg.enc3d > 1);
    $('#btnStop').disabled = !busy;
    ui.onProgress(); ui.drawBitmap();
  };
  ui.onResult = function () {
    const r = L5.job.result, box = $('#result');
    if (!r) { box.hidden = true; return; }
    box.hidden = false;
    if (r.kind === 'validate') {
      const ok = r.bitErr === 0 && r.crcOk;
      box.className = 'result ' + (ok ? 'ok' : 'bad');
      box.innerHTML = ok
        ? `<b>✔ Escritura validada</b><span>${r.bits} bits re-leídos sin errores · CRC-8 correcto</span><code>${esc(r.text)}</code>`
        : `<b>✖ Validación con errores</b><span>${r.bitErr} bit(s) mal en ${r.symErr} voxel(s) · BER ${(r.ber * 100).toFixed(2)}% · CRC ${r.crcOk ? 'OK' : 'falla'}</span><span class="h">En vidrio no se puede borrar: se graba de nuevo en otra zona o se agrega corrección de errores (Reed-Solomon).</span><code>${esc(r.text)}</code>`;
    } else {
      box.className = 'result ' + (r.crcOk ? 'ok' : 'bad');
      box.innerHTML = r.crcOk ? `<b>✔ Lectura correcta</b><span>${r.n} bytes · CRC-8 correcto</span><code>${esc(r.text)}</code>` : `<b>✖ Lectura con errores</b><span>${esc(r.reason || 'faltan datos')}</span><code>${esc(r.text)}</code>`;
    }
  };
  ui.onDecoded = function (dec) { $('#decoded').textContent = dec.text || '…'; };
  ui.toast = function (msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 3800); };

  // Mapa de bits: 4 capas de 8×8
  ui.drawBitmap = function () {
    const cv = $('#bitmap'), g = cv.getContext('2d');
    const W = cv.width, H = cv.height, cell = 9, gap = 1, lw = 8 * (cell + gap), pad = (W - 4 * lw) / 5;
    g.clearRect(0, 0, W, H);
    g.font = '600 10px system-ui'; g.fillStyle = '#8b95a3'; g.textAlign = 'center';
    const tile = L5.mic.tile;
    for (let L = 0; L < 4; L++) {
      const ox = pad + L * (lw + pad), oy = 16;
      g.fillStyle = '#8b95a3'; g.fillText('capa ' + (L + 1), ox + lw / 2, 11);
      for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
        const i = L * 64 + r * 8 + c, v = L5.grid[i];
        const x = ox + c * (cell + gap), y = oy + r * (cell + gap);
        let fill = '#1a1f26';
        const ppmCell = !L5.cfg.mode5D && L5.cfg.enc3d > 1;
        if (v.w && !ppmCell) fill = L5.cfg.mode5D ? `hsl(${v.ori * 90},95%,${v.ret ? 58 : 38}%)` : '#cfe6ff';
        if (v.read && !v.w && v.read.w) fill = '#ff3b3b';
        g.fillStyle = fill; g.fillRect(x, y, cell, cell);
        if (v.w && ppmCell) {
          // punto corrido hacia su posición (y más grande si es "grande")
          const d = L5.POS[v.pos], rr = L5.cfg.enc3d === 3 ? (v.size ? 2.6 : 1.6) : 2.1;
          g.fillStyle = `hsl(${v.pos * 90},95%,60%)`;
          g.beginPath(); g.arc(x + cell / 2 + d[0] * cell * 0.24, y + cell / 2 + d[1] * cell * 0.24, rr, 0, Math.PI * 2); g.fill();
        }
        if (v.read) {
          g.strokeStyle = v.err ? '#ff3b3b' : '#3ddc84'; g.lineWidth = 1.4;
          g.strokeRect(x + 0.7, y + 0.7, cell - 1.4, cell - 1.4);
        }
      }
      if (tile && tile.L === L) {
        g.strokeStyle = '#ffffff'; g.lineWidth = 1.5;
        g.strokeRect(ox + tile.tc * 4 * (cell + gap) - 1, oy + tile.tr * 4 * (cell + gap) - 1, 4 * (cell + gap) + 1, 4 * (cell + gap) + 1);
      }
    }
  };

  // ---------- Pantalla del notebook ----------
  function drawScreen() {
    const cv = L5.screenCanvas, g = cv.getContext('2d'), W = cv.width, H = cv.height;
    const S = L5.state, j = L5.job;
    g.fillStyle = '#0c1016'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#161c25'; g.fillRect(0, 0, W, 40);
    g.fillStyle = '#ff8a2a'; g.font = '700 20px system-ui'; g.fillText('VOXEL·5D  writer', 16, 27);
    g.fillStyle = '#8b95a3'; g.font = '14px monospace'; g.fillText('GRBL 1.1h · COM3 · USB-CAM 0', W - 300, 26);
    g.fillStyle = '#e6edf3'; g.font = '600 18px system-ui';
    g.fillText(`${j.kind === 'read' ? 'LECTURA' : j.kind === 'write' ? 'ESCRITURA + VALIDACIÓN' : 'EN ESPERA'}  ·  ${j.phase}`, 16, 70);
    g.fillStyle = '#222b36'; g.fillRect(16, 84, W - 32, 14);
    g.fillStyle = '#ff8a2a'; g.fillRect(16, 84, (W - 32) * (parseFloat($('#bar').style.width) || 0) / 100, 14);
    g.font = '15px monospace'; g.fillStyle = '#9fb3c8';
    g.fillText(`X ${S.X.toFixed(3)}  Y ${S.Y.toFixed(3)}  Z ${S.Zoff.toFixed(3)}   λ/2 ${S.rot.hwp2.toFixed(1)}°  ana ${S.rot.ana.toFixed(0)}°`, 16, 124);
    // mini mapa
    const bm = $('#bitmap'); g.drawImage(bm, 16, 140, 430, 430 * bm.height / bm.width);
    g.font = '13px monospace';
    const lines = logLines.slice(-12);
    lines.forEach((ln, i) => { g.fillStyle = ln.startsWith('; ✔') ? '#3ddc84' : ln.startsWith('; ✖') || ln.startsWith('; ⏹') ? '#ff6b6b' : ln.startsWith('M3') ? '#ff8aa0' : '#7d8b9b'; g.fillText(ln.slice(0, 62), 16, 250 + i * 18); });
    g.fillStyle = '#e6edf3'; g.font = '600 15px system-ui';
    g.fillText('Texto: ' + (j.decoded || j.text || '').slice(0, 46), 470, 160);
    L5.screenTex.needsUpdate = true;
  }

  // ---------- DRO ----------
  function updateDRO() {
    const S = L5.state, A = L5.motionActive;
    const set = (id, v, on) => { const el = document.getElementById(id); el.textContent = v; el.parentNode.classList.toggle('mv', !!on); };
    set('droX', S.X.toFixed(3), A.X); set('droY', S.Y.toFixed(3), A.Y); set('droZ', S.Zoff.toFixed(3), A.Z);
    set('droH1', S.rot.hwp1.toFixed(1) + '°', A.hwp1); set('droH2', S.rot.hwp2.toFixed(1) + '°', A.hwp2); set('droA', S.rot.ana.toFixed(0) + '°', A.ana);
    const las = $('#droL');
    las.textContent = S.firing ? 'DISPARO' : S.laser ? 'ARMADO' : 'APAGADO';
    las.parentNode.className = 'd ' + (S.firing ? 'fire' : S.laser ? 'arm' : '');
    const mic = L5.mic;
    $('#micInfo').textContent = mic.mode === 'pol' ? `polarización · analizador ${S.rot.ana.toFixed(0)}°` : mic.mode === 'bright' ? 'campo claro' : (S.laser ? 'escritura en vivo' : 'vista en vivo');
    $('#micRec').style.opacity = mic.rec ? 1 : 0.15;
    const fy = G.cy0 - G.focusOff + S.Zoff;
    const L = Math.round(1.5 - (fy - G.dataY) / G.layerGap);
    $('#micFoot').textContent = (L >= 0 && L <= 3 ? `foco: capa ${L + 1}` : 'foco: fuera del cristal') + (mic.tile ? ` · mosaico ${mic.tile.tr * 2 + mic.tile.tc + 1}/4` : '');
  }

  // ---------- Explosionado ----------
  let explodeReady = false;
  function prepExplode() {
    L5.root.updateMatrixWorld(true);
    // Se abre hacia afuera en planta y hacia ARRIBA según la altura de cada pieza:
    // la componente vertical nunca es negativa, así nada atraviesa la mesa (y = 0)
    const C = new T.Vector3(40, 0, -20), b = new T.Box3(), c = new T.Vector3();
    L5.explodeList.forEach((e) => {
      e.base = e.obj.position.clone();
      b.setFromObject(e.obj); b.getCenter(c);
      e.dir = new T.Vector3((c.x - C.x) * 0.6, Math.max(0, c.y) * 0.9 + 12, (c.z - C.z) * 0.6);
    });
    explodeReady = true;
  }
  function applyExplode() {
    if (!explodeReady) prepExplode();
    const k = ui.explode;
    L5.explodeList.forEach((e) => e.obj.position.copy(e.base).addScaledVector(e.dir, k));
    L5.cables.forEach((c) => { c.mesh.visible = k < 0.02 && c.on !== false; });
  }

  // ---------- Inicialización ----------
  L5.initUI = function () {
    // pestañas
    document.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => {
      if (b.dataset.tab === 'asm') L5.asm.enter(); else if (L5.asm.active) L5.asm.exit();
      document.querySelectorAll('.tabs button').forEach((x) => x.classList.toggle('on', x === b));
      document.querySelectorAll('.tab').forEach((t) => (t.hidden = t.id !== 'tab-' + b.dataset.tab));
      document.body.classList.toggle('wide', b.dataset.tab === 'parts');
      L5.onResize();
    }));
    // sistema 5D / 3D
    document.querySelectorAll('[name=sys]').forEach((r) => r.addEventListener('change', () => applySystem(r.value === '5d')));
    $('#noise').addEventListener('change', (e) => (L5.cfg.noise = e.target.value));
    document.querySelectorAll('[name=opt]').forEach((r) => r.addEventListener('change', () => {
      ui.cheapOptics = r.value === 'cheap';
      renderBOM(); if (ui.selected) showCard(ui.selected);
    }));
    const msg = $('#msg');
    // Cambia de diseño: piezas en 3D, cubo, lista de partes, etiquetas y codificación
    function applySystem(m5) {
      L5.cfg.mode5D = m5;
      if (ui.explode > 0) { ui.explode = 0; $('#explode').value = 0; applyExplode(); }
      explodeReady = false;
      if (ui.isolated) L5.isolate(null);
      L5.clearCrystal();
      L5.applyConfig(m5, ui.compare);
      document.body.classList.toggle('m3d', !m5);
      document.querySelectorAll('[name=sys]').forEach((x) => (x.checked = (x.value === '5d') === m5));
      computeModelQty();
      updateCap(); renderBOM(); buildLabels(); ui.drawBitmap(); ui.onResult(); ui.onJob();
      renderDiff();
      if (ui.selected) { if (shownTagged(ui.selected).length) showCard(ui.selected); else L5.select(null); }
    }
    ui.applySystem = applySystem;
    ui.setEnc = (n) => { L5.cfg.enc3d = n; document.querySelectorAll('[name=enc3d]').forEach((x) => (x.checked = +x.value === n)); updateCap(); ui.onJob(); };
    const updateCap = () => {
      const cap = L5.capacity(), used = new TextEncoder().encode(msg.value).length;
      $('#cap').textContent = `${used}/${cap} bytes · ${L5.cfg.mode5D ? '3 bits/voxel (θ 2 bits + δ 1 bit)' : ['', '1 bit/celda (hay o no hay marca)', '2 bits/celda (posición de la marca)', '3 bits/celda (posición 2 + tamaño 1)'][L5.cfg.enc3d]}`;
      $('#cap').classList.toggle('over', used > cap);
    };
    msg.addEventListener('input', updateCap); updateCap();
    // codificación del 3D económico: mismo hardware, otro método de grabado/lectura
    document.querySelectorAll('[name=enc3d]').forEach((r) => r.addEventListener('change', () => {
      if (L5.state.busy) return;
      L5.cfg.enc3d = parseInt(r.value, 10);
      L5.clearCrystal(); updateCap(); ui.onResult(); ui.onJob(); $('#decoded').textContent = '…';
      ui.toast([
        '',
        '1 bit: cada celda tiene o no tiene marca.',
        '2 bits: mismo hardware. Solo cambia el G-code (corre cada disparo) y el decodificador (mide el centroide).',
        '3 bits: mismo hardware. Usa el anillo LED de costado en campo oscuro para medir el tamaño de cada marca.',
      ][L5.cfg.enc3d]);
    }));
    $('#btnWrite').onclick = () => { $('#result').hidden = true; $('#decoded').textContent = '…'; L5.runWrite(msg.value || 'HOLA'); };
    $('#btnRead').onclick = () => { $('#result').hidden = true; $('#decoded').textContent = '…'; L5.runRead(); };
    $('#btnStop').onclick = () => L5.stop();
    $('#btnHome').onclick = () => L5.goHome();
    $('#btnExample').onclick = () => { L5.job.result = null; ui.onResult(); $('#decoded').textContent = '…'; L5.loadExample(L5.cfg.mode5D ? 'Archivo 5D · Montevideo 2026 · vidrio de sílice, 1000 años' : 'Archivo 3D · MVD 2026'); ui.toast('Cristal de ejemplo cargado. Probá "Leer cristal".'); };
    $('#btnClear').onclick = () => { L5.clearCrystal(); ui.onResult(); $('#decoded').textContent = '…'; };
    const sp = $('#speed');
    const setSpeed = () => { L5.state.speed = Math.pow(2, parseFloat(sp.value)); $('#speedV').textContent = '×' + (L5.state.speed < 10 ? L5.state.speed.toFixed(1) : Math.round(L5.state.speed)); };
    sp.addEventListener('input', setSpeed); setSpeed();
    $('#clearLog').onclick = () => { logEl().innerHTML = ''; };

    // barra de herramientas
    document.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => L5.view(b.dataset.view)));
    const tog = (id, key, after) => { const b = $(id); b.classList.toggle('on', !!ui[key]); b.addEventListener('click', () => { ui[key] = !ui[key]; b.classList.toggle('on', ui[key]); if (after) after(); }); };
    tog('#tBeam', 'showBeam');
    tog('#tPol', 'polView');
    tog('#tLbl', 'labels');
    ui.enclosure = false; tog('#tEnc', 'enclosure', () => { L5.enclosure.visible = ui.enclosure; });
    ui.mic = true; tog('#tMic', 'mic', () => { $('#mic').hidden = !ui.mic; });
    ui.compare = false; tog('#tCmp', 'compare', () => {
      L5.applyConfig(L5.cfg.mode5D, ui.compare);
      if (ui.compare) ui.toast(L5.cfg.mode5D ? 'En rojo: lo que suma el 3D económico. En verde: lo que solo tiene el 5D.' : 'En rojo: lo que el 3D económico se ahorra del 5D. En verde: lo que agrega.');
    });
    $('#explode').addEventListener('input', (e) => { ui.explode = parseFloat(e.target.value); applyExplode(); });
    $('#isoBtn').onclick = () => { if (ui.isolated) L5.isolate(null); else if (ui.selected) L5.isolate(ui.selected); else ui.toast('Seleccioná una parte (clic en el modelo o en la lista) y después Aislar.'); };
    $('#hideOthers').addEventListener('change', (e) => { ui.hideOthers = e.target.checked; applyIsolation(); });

    // ficha
    $('#cardClose').onclick = () => L5.select(null);
    $('#cardFocus').onclick = () => ui.selected && focusPart(ui.selected);
    $('#cardIso').onclick = () => { if (ui.isolated) L5.isolate(null); else if (ui.selected) L5.isolate(ui.selected); };

    // BOM
    $('#bomBody').addEventListener('click', (e) => {
      if (e.target.matches('input[data-have]')) { have[e.target.dataset.have] = e.target.checked; saveHave(); renderBOM(); return; }
      if (e.target.closest('a')) return;
      const tr = e.target.closest('tr[data-key]'); if (!tr) return;
      L5.select(tr.dataset.key, { focus: true });
    });
    $('#bomSearch').addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      document.querySelectorAll('#bomBody tr[data-key]').forEach((tr) => { tr.style.display = !q || tr.textContent.toLowerCase().includes(q) ? '' : 'none'; });
    });
    window.addEventListener('keydown', (e) => {
      if (e.target.matches('input, textarea')) return;
      if (e.key === 'Escape') { if (ui.isolated) L5.isolate(null); else L5.select(null); }
      if (e.key.toLowerCase() === 'i' && ui.selected) L5.isolate(ui.selected);
      if (e.key.toLowerCase() === 'f' && ui.selected) focusPart(ui.selected);
    });

    $('#fxNote').textContent = `Tipo de cambio: ${L5.BOM.fx.usd_uyu.toFixed(2)} UYU/USD (${L5.BOM.fx.source || ''}${L5.BOM.fx.date ? ', ' + L5.BOM.fx.date : ''}). Precios con IVA según publicación; importados sin envío ni aduana salvo que se indique.`;
    L5.applyConfig(L5.cfg.mode5D, false);
    computeModelQty();
    renderBOM(); buildLabels(); bindPicking(); ui.drawBitmap(); ui.onJob(); renderDiff(); ui.initAsm();
    ui.log('; listo — elegí "Grabar y validar" o cargá el cristal de ejemplo y "Leer cristal"', 'hdr');
  };

  // cantidades de tornillería tomadas del modelo
  function computeModelQty() {
    const count = (k) => shownTagged(k).length;
    const set = (k, n, extra) => { const it = L5.BOM.items.find((i) => i.key === k); if (it && n) { it.qty = n + (extra || 0); it.spec = it.spec.replace(/\s*\(modelo:.*\)$/, '') + ` (modelo: ${n}${extra ? ' + ' + extra + ' de repuesto' : ''})`; } };
    set('escuadra', count('escuadra'), 4);
    set('tornilloM5', count('tornilloM5'), 10);
    set('tuercaT', count('tuercaT'), 10);
  }

  // Resumen de diferencias entre los dos diseños (debajo del selector de sistema)
  function renderDiff() {
    const el = $('#diff'); if (!el) return;
    const save = L5.cfg.mode5D;
    const tot = {};
    for (const m of [true, false]) {
      L5.cfg.mode5D = m;
      tot[m ? 'fs' : 'ns'] = items().reduce((a, it) => a + subtotal(it), 0);
    }
    L5.cfg.mode5D = save;
    const only = (cfg) => L5.BOM.items.filter((it) => it.cfg === cfg).map((it) => it.short || it.name).join(', ');
    const fx = L5.BOM.fx.usd_uyu;
    el.innerHTML = `
      <div class="dc ${save ? 'on' : ''}"><b>5D real</b><span>${fmt(tot.fs)} · ${fmtUsd(tot.fs / fx)}</span><small>Solo en este: ${esc(only('fs'))}</small></div>
      <div class="dc ${save ? '' : 'on'}"><b>3D económico</b><span>${fmt(tot.ns)} · ${fmtUsd(tot.ns / fx)}</span><small>Solo en este: ${esc(only('ns'))}</small></div>`;
  }

  // ---------- Pestaña Armado ----------
  ui.flyTo = (target, dist, dir) => flyTo(target, dist, dir);
  ui.prepareAsm = function () {
    if (L5.cfg.mode5D) ui.applySystem(false);
    if (ui.compare) { ui.compare = false; $('#tCmp').classList.remove('on'); L5.applyConfig(false, false); }
    if (ui.explode > 0) { ui.explode = 0; $('#explode').value = 0; applyExplode(); }
    if (ui.isolated) L5.isolate(null);
    L5.select(null);
    if (ui.enclosure) { ui.enclosure = false; $('#tEnc').classList.remove('on'); }
    ['#tCmp', '#explode', '#tEnc'].forEach((s) => ($(s).disabled = true));
    document.body.classList.add('asm');
  };
  ui.finishAsm = function () {
    ['#tCmp', '#explode', '#tEnc'].forEach((s) => ($(s).disabled = false));
    document.body.classList.remove('asm');
    L5.applyConfig(L5.cfg.mode5D, ui.compare);
    ui.onJob(); ui.drawBitmap();
  };
  const TOOL_NAMES = {
    allen4: 'Llave allen 4 mm (M5)', allen25: 'Llave allen 2,5 mm (M3)', allen2: 'Allen 2 mm (prisioneros)', escuadra: 'Escuadra',
    cinta: 'Cinta métrica', calibre: 'Calibre', sierra: 'Sierra para aluminio', lima: 'Lima', impresora: 'Impresora 3D', nivel: 'Nivel',
    multimetro: 'Multímetro', pelacables: 'Pelacables', soldador: 'Soldador', calor: 'Pistola de calor', notebook: 'Notebook',
    alcohol: 'Alcohol isopropílico + guantes', destornillador: 'Destornillador chico', lentes: 'Lentes OD5+',
  };
  function stepParts(st) {
    const cnt = {}, order = [], lens = [];
    const add = (p, n) => { if (!cnt[p]) { cnt[p] = 0; order.push(p); } cnt[p] += n || 1; };
    st.items.forEach((it) => {
      if (it.type === 'cable') { add(it.cable.part); return; }
      it.obj.traverse((o) => { const p = o.userData.part; if (!p) return; if (p === 'perfil2040') lens.push(o.userData.len); add(p); });
    });
    return order.map((p) => {
      const item = L5.BOM.items.find((i) => i.key === (p === 'cuboSilice' ? 'cuboK9' : p));
      const name = item ? item.short || item.name : p;
      if (p === 'perfil2040') return `<li><b>${lens.length}×</b> Perfil 2040 <small>(${lens.join(', ')} mm)</small></li>`;
      if (p === 'filamento') return '<li><b>·</b> Piezas impresas</li>';
      const cableish = ['cableMotor', 'dupont', 'cable220', 'fuente24v', 'db25', 'camara', 'mega_ramps'].includes(p) && st.key === 'cableado';
      return `<li><b>${cnt[p]}×</b> ${esc(name)}${cableish ? ' <small>(tramo)</small>' : ''}</li>`;
    }).join('');
  }
  ui.asmRender = function () {
    const A = L5.asm, st = A.steps[A.idx];
    if (!st) return;
    const nBuild = A.steps.filter((s) => !s.calib).length;
    $('#asmCount').textContent = `Paso ${A.idx + 1} de ${A.steps.length}`;
    $('#asmPhase').textContent = st.calib ? 'Calibración' : A.idx === 0 ? 'Preparación' : `Armado ${A.idx}/${nBuild - 1}`;
    $('#asmTitle').textContent = st.title;
    $('#asmText').textContent = st.text;
    $('#asmExtra').innerHTML = st.extra ? st.extra() : '';
    $('#asmTools').innerHTML = (st.tools || []).map((t) => `<span class="chip">${esc(TOOL_NAMES[t] || t)}</span>`).join('');
    const parts = stepParts(st);
    $('#asmParts').innerHTML = parts ? `<label class="lab">Piezas de este paso</label><ul>${parts}</ul>` : '';
    $('#asmPlay').textContent = A.auto ? '⏸ Pausa' : '▶ Reproducir todo';
    $('#asmPrev').disabled = A.idx === 0;
    $('#asmNext').disabled = A.idx === A.steps.length - 1;
    $('#asmList').innerHTML = A.steps.map((s, i) => `<li data-i="${i}" class="${i < A.idx ? 'done' : i === A.idx ? 'cur' : ''} ${s.calib ? 'cal' : ''}"><span>${i + 1}</span>${esc(s.title)}</li>`).join('');
    // desplaza solo la lista (scrollIntoView movería todo el panel y escondería los controles)
    const list = $('#asmList'), cur = list.querySelector('li.cur');
    if (cur) list.scrollTop = Math.max(0, cur.offsetTop - list.clientHeight / 2);
  };
  ui.asmProgress = function (p) {
    const A = L5.asm;
    $('#asmBar').style.width = (((A.idx + p) / A.steps.length) * 100).toFixed(1) + '%';
    $('#asmStepBar').style.width = (p * 100).toFixed(0) + '%';
  };
  ui.initAsm = function () {
    $('#asmPlay').onclick = () => L5.asm.toggleAuto();
    $('#asmNext').onclick = () => L5.asm.next();
    $('#asmPrev').onclick = () => L5.asm.prev();
    $('#asmFirst').onclick = () => L5.asm.goTo(0);
    $('#asmReplay').onclick = () => L5.asm.goTo(L5.asm.idx);
    $('#asmSpeed').addEventListener('change', (e) => { L5.asm.speed = parseFloat(e.target.value); });
    $('#asmGhost').addEventListener('change', (e) => L5.asm.setGhost(e.target.checked));
    $('#asmList').addEventListener('click', (e) => { const li = e.target.closest('li[data-i]'); if (li) L5.asm.goTo(+li.dataset.i); });
  };

  let scrT = 0;
  ui.frame = function (dt) {
    if (ui._hoverTick) ui._hoverTick();
    if (L5.asm && L5.asm.active) L5.asm.frame(dt);
    if (L5.diffBoxes.length) L5.updateDiffBoxes();
    if (ui.selected) {
      const k = 0.45 + 0.25 * Math.sin(performance.now() / 260);
      L5.materialsOf(ui.selected).forEach((m) => { if (m.emissive) m.emissiveIntensity = k; });
    }
    if (ui.follow) {
      // la cámara acompaña al carro (vista Cristal / Cabezal)
      const p = ui.follow.obj.localToWorld(ui.follow.local.clone());
      const d = p.clone().sub(ui.follow.last); ui.follow.last.copy(p);
      if (d.lengthSq() > 0) {
        L5.camera.position.add(d); L5.controls.target.add(d);
        camAnim.toP.add(d); camAnim.toT.add(d); camAnim.fromP.add(d); camAnim.fromT.add(d);
      }
    }
    if (camAnim.t < 1) {
      camAnim.t = Math.min(1, camAnim.t + dt / 0.7);
      const e = 1 - Math.pow(1 - camAnim.t, 3);
      L5.camera.position.lerpVectors(camAnim.fromP, camAnim.toP, e);
      L5.controls.target.lerpVectors(camAnim.fromT, camAnim.toT, e);
    }
    updateLabels(); updateDRO();
    scrT += dt; if (scrT > 0.25) { scrT = 0; drawScreen(); if (L5.state.busy) ui.drawBitmap(); }
  };
})();
