/* Arranque: renderer, escena, luces, cámara orbital y bucle principal. */
(function () {
  const T = THREE, L5 = window.L5;
  const host = document.getElementById('app');

  const renderer = new T.WebGLRenderer({ antialias: true, preserveDrawingBuffer: /[?&]snap/.test(location.search) });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.82;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);
  L5.renderer = renderer;

  const scene = new T.Scene();
  scene.background = new T.Color(0x0e1116);
  L5.scene = scene;
  const pm = new T.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new T.RoomEnvironment(), 0.04).texture;

  scene.add(new T.HemisphereLight(0xdfe8f5, 0x2b2420, 0.25));
  const key = new T.DirectionalLight(0xffffff, 1.25);
  key.position.set(500, 900, 650); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -750, right: 650, top: 650, bottom: -550, near: 100, far: 2400 });
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.6;
  scene.add(key);
  const fill = new T.DirectionalLight(0x9fc4ff, 0.45); fill.position.set(-700, 400, -300); scene.add(fill);

  const camera = new T.PerspectiveCamera(38, 1, 1, 6000);
  camera.position.set(640, 720, 900);
  L5.camera = camera;
  const controls = new T.OrbitControls(camera, renderer.domElement);
  controls.target.set(10, 190, -10);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.minDistance = 12; controls.maxDistance = 2800;
  controls.zoomSpeed = 1.2;
  L5.controls = controls;

  L5.buildMachine(scene);
  L5.initUI();

  L5.onResize = function () {
    const r = host.getBoundingClientRect();
    renderer.setSize(r.width, r.height, false);
    renderer.domElement.style.width = r.width + 'px';
    renderer.domElement.style.height = r.height + 'px';
    camera.aspect = r.width / r.height; camera.updateProjectionMatrix();
  };
  window.addEventListener('resize', L5.onResize);
  L5.onResize();
  // la cámara inicial está pensada para pantalla ancha: en un celular se arranca desde la vista general
  if (matchMedia('(max-width: 760px)').matches) L5.view('general');

  const micEl = document.getElementById('mic');
  const micView = document.getElementById('micView');
  const polMat = L5.MX('polarizador', 'film');
  const film = { color: polMat.color.clone(), opacity: polMat.opacity };
  // El material con transmisión no funciona bien en un viewport recortado: en la vista del microscopio se usa uno simple
  const crystalMat = L5.crystalMesh.material;
  const crystalMicMat = new T.MeshBasicMaterial({ color: 0x9fb6c8, transparent: true, opacity: 0.06, depthWrite: false });

  function renderMic() {
    if (micEl.hidden) return;
    const cr = renderer.domElement.getBoundingClientRect(), r = micView.getBoundingClientRect();
    const x = r.left - cr.left, y = cr.bottom - r.bottom, w = r.width, h = r.height;
    if (w < 10 || x + w < 0) return;
    L5.updateMicCam();
    L5.micCam.aspect = w / h; L5.micCam.updateProjectionMatrix();
    // fondo visto a través del cristal: luz de fondo + polarizador
    const bg = L5.state.backlight ? L5.mic.bg : 0.04;
    polMat.color.setScalar(bg); polMat.emissive.setScalar(bg * 0.9); polMat.opacity = 1;
    L5.voxelColorsMic();
    const beamWas = L5.beamMat.opacity;
    L5.crystalMesh.material = crystalMicMat;
    renderer.setScissorTest(true);
    renderer.setViewport(x, y, w, h); renderer.setScissor(x, y, w, h);
    const bgc = scene.background; scene.background = new T.Color(bg * 0.6, bg * 0.6, bg * 0.62);
    renderer.render(scene, L5.micCam);
    scene.background = bgc;
    renderer.setScissorTest(false);
    const full = renderer.getSize(new T.Vector2());
    renderer.setViewport(0, 0, full.x, full.y);
    L5.crystalMesh.material = crystalMat;
    polMat.color.copy(film.color); polMat.emissive.setScalar(0); polMat.opacity = film.opacity;
    L5.beamMat.opacity = beamWas;
  }

  const clock = new T.Clock();
  function frame(fixedDt) {
    const real = Math.min(0.05, clock.getDelta());
    const dt = typeof fixedDt === 'number' ? fixedDt : real;
    L5.tick(dt);
    L5.tickVoxels(dt);
    L5.voxelColorsMain();
    L5.updateCables();
    L5.ui.frame(dt);
    controls.update();
    renderer.render(scene, camera);
    renderMic();
  }
  renderer.setAnimationLoop(() => frame());
  // Para pruebas sin requestAnimationFrame (pestaña en segundo plano): avanza n cuadros de dt fijo
  L5.step = async function (n, dt) { for (let i = 0; i < n; i++) { frame(dt || 1 / 30); await new Promise((r) => { const c = new MessageChannel(); c.port1.onmessage = () => r(); c.port2.postMessage(0); }); } };
})();
