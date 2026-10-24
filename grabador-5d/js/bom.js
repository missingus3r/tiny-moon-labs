/* Lista de materiales (BOM) con precios del mercado uruguayo, relevados el 23/10/2026.
   unit_price_uyu = precio por unidad de compra; si hay pack, se compran packs enteros (pack + packPrice).
   alt = alternativa genérica/económica (AliExpress), usada cuando se elige "óptica económica". */
window.L5 = window.L5 || {};
L5.BOM = {
  fx: { usd_uyu: 41.25, source: 'BROU billete venta', date: '23/10/2026' },
  items: [],
};
(function () {
  const FX = L5.BOM.fx.usd_uyu;
  const ML = 'MercadoLibre UY', ml = (q) => 'https://listado.mercadolibre.com.uy/' + q;
  const snip = 'Precio tomado del resumen del buscador (ML pide iniciar sesión para ver la ficha): confirmar al comprar.';
  const add = (o) => {
    if (o.currency === 'USD') o.unit_price_uyu = o.price * FX;
    else if (o.unit_price_uyu === undefined) o.unit_price_uyu = o.price;
    if (o.packPriceUsd) o.packPrice = o.packPriceUsd * FX;
    if (o.alt && o.alt.currency === 'USD') o.alt.unit_price_uyu = o.alt.price * FX;
    L5.BOM.items.push(Object.assign({ unit: 'u', verified: true, source: ML, currency: 'UYU' }, o));
  };

  // ---------------- Estructura ----------------
  add({ key: 'perfil2040', cat: 'Estructura', name: 'Perfil aluminio 2040 V-slot anodizado', short: 'Perfil 2040',
    spec: 'Barras de 1 m. Cortes: 440+440 · 360+360+260 · 420+380 · 260 (+480 del poste del periscopio en el 5D)', qty: 4, unit: 'm', price: 1435,
    link: 'https://www.mercadolibre.com.uy/perfil-2040-aluminio-anodizado-impresora-3d-grabadora-laser/up/MLUU2439934358', note: 'Barra de 100 cm a $1.435. ' + snip });
  add({ key: 'escuadra', cat: 'Estructura', name: 'Escuadra en L acero inox para perfil serie 20', short: 'Escuadra',
    spec: 'Esquinero en L, ranura 6 mm', qty: 20, pack: 10, packPrice: 295.4, price: 295.4, unit_price_uyu: 29.54, verified: false,
    link: 'https://www.mercadolibre.com.uy/escuadra-en-l-de-acero-inoxidable-304-para-perfil-2020-pack/up/MLUU4361460831',
    note: '$295,40 por pack con envío internacional; no se ve cuántas trae: se asumen 10 por pack.' });
  add({ key: 'placa', cat: 'Estructura', name: 'Placa para carros X, Y y Z', short: 'Placa carro',
    spec: 'Acrílico 6 mm cortado a medida (~280×140, 120×120, 140×110)', qty: 3, price: 350, verified: false, link: ml('acrilico-6mm-corte-a-medida'),
    note: 'Estimado desde una cotización de acrílico 6 mm 60×90 cm a $4.300. Aluminio 6 mm es más rígido: consultar Aluminios del Uruguay (shop.aluminios.com).' });
  add({ key: 'filamento', cat: 'Estructura', name: 'Filamento PLA+ 1 kg 1,75 mm', short: 'Piezas impresas',
    spec: 'Jaula del cabezal, monturas giratorias, soportes y cuna del cubo', qty: 1, price: 19.5, currency: 'USD',
    link: 'https://articulo.mercadolibre.com.uy/MLU-603598465-filamento-pla-fabrix-1kg-175mm-para-impresora-3d-_JM',
    note: 'Alternativa leída en vivo: PLA+ 3nMax 1 kg a US$15,5 en Macrotec. ' + snip });

  // ---------------- Tornillería ----------------
  add({ key: 'tuercaT', cat: 'Tornillería', name: 'Tuerca T (martillo) M5 serie 20', short: 'Tuerca T',
    spec: 'M5, acero al carbono, ranura 6 mm', qty: 60, pack: 50, packPrice: 1651, price: 1651, unit_price_uyu: 33.02,
    link: 'https://articulo.mercadolibre.com.uy/MLU-454632534-gota-en-t-tuerca-m5-hilo-acero-al-carbono-de-50pcs-para-20-s-_JM', note: 'Pack de 50 a $1.651. ' + snip });
  add({ key: 'tornilloM5', cat: 'Tornillería', name: 'Tornillo allen M5×10', short: 'Tornillo M5',
    spec: 'Cabeza allen, bolsa de 10', qty: 60, pack: 10, packPriceUsd: 1.9, price: 1.9, currency: 'USD',
    link: 'https://www.mercadolibre.com.uy/tornillo-hexagonal-allen-m5---5-x-10-mm-10-unidades-100651/up/MLUU2437433587', note: 'US$1,90 la bolsa de 10. ' + snip });
  add({ key: 'kitM3', cat: 'Tornillería', name: 'Kit tornillos allen M3 surtidos', short: 'Kit M3',
    spec: '380 piezas inox: motores, rodamientos, PCBs', qty: 1, price: 828.71,
    link: 'https://www.mercadolibre.com.uy/juego-tornillos-allen-m3-acero-inoxidable-380pz/up/MLUU5008369627', note: 'Envío internacional; se vio en oferta a $505. ' + snip });

  // ---------------- Movimiento ----------------
  add({ key: 'varilla8', cat: 'Movimiento', name: 'Varilla lisa rectificada cromada 8 mm', short: 'Varilla 8 mm',
    spec: 'Barras de 1 m. Cortes: 300+300+260 · 260+200+200 mm', qty: 2, unit: 'm', price: 15, currency: 'USD',
    link: 'https://articulo.mercadolibre.com.uy/MLU-468466424-impresora-3d-varilla-tshl-8x1000mm-100130-_JM', note: 'US$15 la barra de 1 m. ' + snip });
  add({ key: 'sk8', cat: 'Movimiento', name: 'Soporte de varilla SK8', short: 'SK8', spec: 'Aluminio, eje 8 mm', qty: 12, price: 208,
    link: 'https://articulo.mercadolibre.com.uy/MLU-467630673-impresora-3d-soporte-sk8-varilla-8-mm-agarre-barra-100265-_JM', note: 'Por unidad. ' + snip });
  add({ key: 'sc8uu', cat: 'Movimiento', name: 'Rodamiento lineal SC8UU con carcasa', short: 'SC8UU',
    spec: 'Eje 8 mm, 4 por eje', qty: 12, pack: 4, packPrice: 1502, price: 1502, unit_price_uyu: 375.5,
    link: 'https://articulo.mercadolibre.com.uy/MLU-454471602-4pcs-sc8uu-scs8uu-8mm-rodamiento-lineal-de-bolas-cojinete-de-_JM', note: 'Pack de 4 a $1.502. ' + snip });
  add({ key: 'husilloT8', cat: 'Movimiento', name: 'Husillo T8 paso 2 mm con tuerca', short: 'Husillo T8',
    spec: '400 mm (cortar a 312, 236 y 160 mm), tuerca de bronce', qty: 3, price: 1742,
    link: 'https://articulo.mercadolibre.com.uy/MLU-454476125-t8-2mm-plomo-tornillo-longitud-400mm-y-laton-tuerca-cnc-3d-i-_JM',
    note: 'Viene con tuerca común; la anti-backlash va aparte (tuerca Tr8 simple en Macrotec US$3). La publicación parece vieja. ' + snip });
  add({ key: 'acople', cat: 'Movimiento', name: 'Acople flexible 5×8 mm', short: 'Acople', spec: 'Aluminio, motor 5 mm → husillo 8 mm', qty: 3,
    price: 5, currency: 'USD', verified: false, link: ml('acople-flexible-5x8'), note: 'US$5 visto en el índice pero sin stock; con buje sale US$12.' });
  add({ key: 'kfl08', cat: 'Movimiento', name: 'Chumacera KFL08', short: 'KFL08', spec: 'Brida con rodamiento, eje 8 mm', qty: 3, price: 178,
    verified: false, link: ml('kfl08'), note: '$178 visto en el índice, sin link a la publicación. También hay packs ×2 y ×4.' });
  add({ key: 'nema17', cat: 'Movimiento', name: 'Motor paso a paso NEMA 17 42-48', short: 'NEMA 17',
    spec: '42×42×48 mm, 1,8°, ~0,45 N·m, con cable', qty: 3, price: 19, currency: 'USD', source: 'tienda: Macrotec (Montevideo)',
    link: 'https://www.macrotec.com.uy/motor-paso-a-paso-42-48-eje-y-para-creality-ender-3-v3-plus',
    note: 'Leído en vivo en macrotec.com.uy. En ML: 17HS16-2004S1 0,45 N·m a $2.146.' });
  add({ key: 'soporteNema', cat: 'Movimiento', name: 'Soporte en L para NEMA 17', short: 'Soporte NEMA', spec: 'Acero 5 mm', qty: 3,
    price: 250, verified: false, link: ml('soporte-motor-nema-17'), note: 'Estimado. Se puede imprimir en PETG si el motor no calienta mucho.' });
  add({ key: 'byj48', cfg: 'fs', cat: 'Movimiento', name: 'Motor 28BYJ-48 + driver ULN2003', short: '28BYJ-48',
    spec: 'Giran λ/2 de energía, λ/2 de polarización y el analizador', qty: 3, price: 324,
    link: 'https://articulo.mercadolibre.com.uy/MLU-604489141-motor-paso-a-paso-28byj-48-driver-uln2003-_JM', note: snip });

  // ---------------- Electrónica ----------------
  add({ key: 'mega_ramps', cat: 'Electrónica', name: 'Arduino Mega 2560 + RAMPS 1.4', short: 'Mega + RAMPS',
    spec: 'Mega Keyestudio $2.900 + RAMPS 1.4 $850 · firmware GRBL-Mega o Marlin', qty: 1, price: 3750,
    link: 'https://articulo.mercadolibre.com.uy/MLU-474798639-keyestudio-mega-2560-placa-para-arduino-mega-2560-r3-arduino-_JM',
    note: 'Suma de dos publicaciones (RAMPS: mercadolibre.com.uy/p/MLU35880336). Clones del Mega con CH340 desde ~$1.500. ' + snip });
  add({ key: 'tmc2209', cat: 'Electrónica', name: 'Driver TMC2209', short: 'TMC2209', spec: 'StepStick con disipador, 1/16 interpolado a 1/256', qty: 3, price: 1322,
    link: 'https://www.mercadolibre.com.uy/driver-motor-paso-a-paso-tmc2209-impresora-3d/up/MLUU4192733084', note: 'Envío desde China; a veces en oferta a $727. ' + snip });
  add({ key: 'fuente12v', cat: 'Electrónica', name: 'Fuente conmutada 12 V 10 A', short: 'Fuente 12 V', spec: '120 W, 110/220 V', qty: 1, price: 649.99,
    link: 'https://articulo.mercadolibre.com.uy/MLU-466625513-fuente-de-conmutacion-bivolt-10a-12v-120w-beehive-cftv-led-_JM', note: 'Industrial: Mean Well SDR-120-12 a $7.900. ' + snip });
  add({ key: 'endstop', cat: 'Electrónica', name: 'Final de carrera mecánico', short: 'Endstop', spec: 'Switch Creality con cable', qty: 3, price: 4, currency: 'USD',
    link: 'https://www.mercadolibre.com.uy/switch-creality-sensor-fin-de-carrera-impresora-3d-macrotec/up/MLUU2435791383', note: 'Tienda oficial Macrotec en ML. ' + snip });
  add({ key: 'estop', cat: 'Electrónica', name: 'Parada de emergencia tipo hongo', short: 'Emergencia', spec: 'Schneider XB4, 1NA+1NC, 22 mm', qty: 1, price: 23.33, currency: 'USD',
    link: 'https://articulo.mercadolibre.com.uy/MLU-472848585-parada-de-emergencia-schneider-tipo-hongo-1na1nc-linea-xb4-_JM',
    note: 'Corta la alimentación del láser y de los motores. Genérico AccessPRO US$19. ' + snip });
  add({ key: 'fan40', cat: 'Electrónica', name: 'Ventilador 40×40×10 mm 12 V', short: 'Ventilador', spec: 'Pack de 4 (sobran 3)', qty: 1, pack: 4, packPrice: 2550, price: 2550, unit_price_uyu: 2550,
    link: 'https://articulo.mercadolibre.com.uy/MLU-456409899-4pcs-12v-refrigeracion-equipo-ventilador-4010-40x40x10mm-f-d-_JM',
    note: 'De 12 V solo apareció en pack de 4 ($2.550) o suelto a $2.140, ambos importados. ' + snip });

  // ---------------- Cableado ----------------
  add({ key: 'cableMotor', cat: 'Cableado', name: 'Cable blindado 4 × 0,75 mm²', short: 'Cable motores', spec: 'Motores paso a paso, por metro', qty: 6, unit: 'm', price: 95,
    verified: false, link: ml('cable-blindado-4-conductores'), note: 'Estimado: la publicación concreta figura sin stock.' });
  add({ key: 'dupont', cat: 'Cableado', name: 'Cables dupont M-H 10 cm', short: 'Dupont', spec: 'Kit de 40: endstops, emergencia, compuerta TTL del láser', qty: 1, unit: 'kit', price: 4, currency: 'USD',
    link: 'https://www.mercadolibre.com.uy/cables-dupont-macho-hembra-10cm-40-pines-254mm/up/MLUU3931385513', note: snip });
  add({ key: 'cable220', cat: 'Cableado', name: 'Cable 220 V con ficha e interruptor', short: 'Alimentación', spec: '1,80 m armado con llave', qty: 1, price: 265,
    link: 'https://www.mercadolibre.com.uy/cable-armado-para-portatil-con-llave-ficha-y-180-mts-cable/up/MLUU2439711753', note: 'Alcanza para la fuente de 120 W. ' + snip });
  add({ key: 'portacables', cat: 'Cableado', name: 'Cadena portacables 10×10 mm', short: 'Portacables', spec: '~1 m, cables del cabezal Z', qty: 1, price: 738,
    link: 'https://www.mercadolibre.com.uy/cadena-arrastre-porta-cables-impresora-3d-cnc-arduino-10x10/up/MLUU2436246225', note: snip });
  add({ key: 'termo', cat: 'Cableado', name: 'Termocontraíble precortado', short: 'Termo', spec: 'Kit de 328 piezas', qty: 1, unit: 'kit', price: 385,
    link: 'https://articulo.mercadolibre.com.uy/MLU-604359900-termocontraible-termoencogible-poliolefina-para-cables-emn-_JM', note: snip });

  // ---------------- Óptica de escritura ----------------
  add({ key: 'laserFs', cfg: 'fs', cat: 'Óptica de escritura', name: 'Láser de femtosegundos usado', short: 'Láser fs',
    spec: 'Light Conversion PHAROS PH1-10: 1030 nm, <300 fs, 10 W', qty: 1, price: 48888, currency: 'USD', source: 'import: eBay (usado)',
    link: 'https://www.ebay.com/itm/405849164748',
    note: 'US$48.888 o mejor oferta, vendedor en China (leído en vivo). Faltan flete, impuestos y revisar el estado. Es el único listado encontrado que cumple 1030 nm, <500 fs y ≥5 µJ. Un Trumpf TruMicro 5050 usado ronda US$20.000 pero tiene pulsos de <900 fs.' });
  add({ key: 'laserNs', cfg: 'ns', cat: 'Óptica de escritura', name: 'Láser Q-switched 1064 nm (nanosegundos)', short: 'Láser ns',
    spec: 'Cloudray MAX 20 W, fibra pulsada, ~100 ns, ~1 mJ', qty: 1, price: 839, currency: 'USD', source: 'import: eBay',
    link: 'https://www.ebay.com/itm/127977565121',
    note: 'Nuevo, leído en vivo. No es DPSS: los pulsos largos pueden fisurar más el vidrio. Opción más simple: la máquina completa de grabado interno CRS 10 W UV 355 nm por US$2.999,99 (ebay.com/itm/336715826037).' });
  add({ key: 'chiller', cfg: 'fs', cat: 'Óptica de escritura', name: 'Enfriador de agua (chiller) para el láser fs', short: 'Chiller',
    spec: 'Estabilidad ±0,1 °C, ~300 W de enfriamiento', qty: 1, price: 1500, currency: 'USD', source: 'import: eBay', verified: false,
    link: 'https://www.ebay.com/sch/i.html?_nkw=recirculating+chiller+0.1C',
    note: 'Estimado. Muchos lotes de láser fs usado ya traen su chiller: verificar antes de comprar. Los chillers de láser CO2 (CW-5200, ~US$500) no tienen la estabilidad que pide un fs.' });
  add({ key: 'fuente24v', cfg: 'ns', cat: 'Óptica de escritura', name: 'Fuente 24 V 6,5 A para el láser de fibra', short: 'Fuente 24 V',
    spec: '150 W, la fuente del láser de fibra trabaja a 24 V DC', qty: 1, price: 1100, verified: false, link: ml('fuente-24v-6a'),
    note: 'Estimado. Revisar en la hoja del láser el consumo exacto (los de 20 W piden ~5 A).' });
  add({ key: 'db25', cfg: 'ns', cat: 'Cableado', name: 'Conector DB25 macho + cable plano', short: 'DB25',
    spec: 'Potencia (8 bits), habilitación y modulación del láser desde el Arduino', qty: 1, price: 350, verified: false, link: ml('conector-db25-macho'),
    note: 'Estimado. Los láseres de fibra tipo Raycus/MAX se controlan por DB25: el Mega maneja potencia, latch, habilitación y pulsos.' });
  add({ key: 'objetivo', cat: 'Óptica de escritura', name: 'Objetivo 20× NA 0,40 para láser IR', short: 'Objetivo 20×',
    spec: 'Thorlabs LMH-20X-1064 (alta potencia, 980–1130 nm)', qty: 1, price: 1949.83, currency: 'USD', source: 'import: Thorlabs',
    link: 'https://www.thorlabs.com/item/LMH-20X-1064',
    note: 'Leído en vivo. Distancia de trabajo ~6 mm: graba hasta ~4 mm de profundidad. El modelo 3D asume uno de 20 mm (Mitutoyo M Plan Apo NIR 20×, usado en eBay, no verificado).',
    alt: { name: 'Objetivo 20× genérico', price: 60, currency: 'USD', source: 'import: AliExpress', link: 'https://www.aliexpress.com/w/wholesale-20x-plan-objective-long-working-distance.html', note: 'US$30–60, no verificado. Sin tratamiento para IR de alta potencia: sirve para probar con poca energía.' } });
  add({ key: 'hwp', cfg: 'fs', cat: 'Óptica de escritura', name: 'Lámina de media onda λ/2 1030 nm', short: 'λ/2',
    spec: 'Thorlabs WPH10M-1030, orden cero, Ø1"', qty: 2, price: 666.05, currency: 'USD', source: 'import: Thorlabs', link: 'https://www.thorlabs.com/item/WPH10M-1030',
    note: 'Leído en vivo. Una regula la energía (con el PBS) y la otra la orientación θ.',
    alt: { name: 'λ/2 orden cero 1030/1064 genérica', price: 90, currency: 'USD', source: 'import: AliExpress', link: 'https://www.aliexpress.com/w/wholesale-zero-order-half-wave-plate-1064nm.html', note: 'US$60–120, no verificado.' } });
  add({ key: 'pbs', cfg: 'fs', cat: 'Óptica de escritura', name: 'Cubo divisor polarizante 900–1300 nm', short: 'PBS',
    spec: 'Thorlabs PBS253, cubo de 1"', qty: 1, price: 277.1, currency: 'USD', source: 'import: Thorlabs', link: 'https://www.thorlabs.com/item/PBS253', note: 'Leído en vivo.',
    alt: { name: 'PBS 1064 nm genérico', price: 45, currency: 'USD', source: 'import: AliExpress', link: 'https://www.aliexpress.com/w/wholesale-polarizing-beam-splitter-cube-1064nm.html', note: 'Estimado, no verificado.' } });
  add({ key: 'beamDump', cfg: 'fs', cat: 'Óptica de escritura', name: 'Absorbedor de haz (beam dump)', short: 'Beam dump',
    spec: 'Disipador de aluminio anodizado negro', qty: 1, price: 300, verified: false, link: ml('disipador-aluminio'), note: 'Estimado. Recibe la energía que descarta el PBS.' });
  add({ key: 'dicroico', cat: 'Óptica de escritura', name: 'Espejo dicroico pasa-largos 900 nm', short: 'Dicroico',
    spec: 'Thorlabs DMLP900 Ø1": transmite el láser IR, refleja lo visible a la cámara', qty: 1, price: 252.95, currency: 'USD', source: 'import: Thorlabs',
    link: 'https://www.thorlabs.com/item/DMLP900', note: 'Leído en vivo.',
    alt: { name: 'Dicroico pasa-largos genérico', price: 40, currency: 'USD', source: 'import: AliExpress', link: 'https://www.aliexpress.com/w/wholesale-longpass-dichroic-mirror.html', note: 'Estimado, no verificado.' } });
  add({ key: 'espejo', cfg: 'fs', cat: 'Óptica de escritura', name: 'Espejo dieléctrico Ø1" 750–1100 nm', short: 'Espejo',
    spec: 'Thorlabs BB1-E03: periscopio de 3 espejos', qty: 3, price: 86.91, currency: 'USD', source: 'import: Thorlabs', link: 'https://www.thorlabs.com/item/BB1-E03',
    note: 'Leído en vivo. Con fs de alta energía revisar umbral de daño.',
    alt: { name: 'Espejo dieléctrico 1064 nm genérico', price: 15, currency: 'USD', source: 'import: AliExpress', link: 'https://www.aliexpress.com/w/wholesale-1064nm-dielectric-mirror-25mm.html', note: 'Estimado, no verificado.' } });
  add({ key: 'montura', cfg: 'fs', cat: 'Óptica de escritura', name: 'Montura cinemática Ø1"', short: 'Montura', spec: 'Thorlabs KM100', qty: 3, price: 44.78, currency: 'USD', source: 'import: Thorlabs',
    link: 'https://www.thorlabs.com/item/KM100', note: 'Leído en vivo.',
    alt: { name: 'Montura cinemática 25 mm genérica', price: 15, currency: 'USD', source: 'import: AliExpress', link: 'https://www.aliexpress.com/w/wholesale-kinematic-mirror-mount-25mm.html', note: 'US$10–20, no verificado.' } });

  // ---------------- Lectura ----------------
  add({ key: 'camara', cat: 'Lectura', name: 'Cámara USB de microscopio montura C', short: 'Cámara',
    spec: 'Industrial USB/HDMI (sensor real ~2–8 MP)', qty: 1, price: 114, currency: 'USD', source: 'import: eBay', link: 'https://www.ebay.com/itm/296798057071',
    note: 'Leída en vivo. En ML UY solo aparecieron microscopios USB de 2 MP sin montura C (~$5.136).' });
  add({ key: 'lenteTubo', cat: 'Lectura', name: 'Lente acromática f = 200 mm (lente de tubo)', short: 'Lente tubo', spec: 'Thorlabs AC254-200-A, Ø1"', qty: 1, price: 95.34, currency: 'USD',
    source: 'import: Thorlabs', link: 'https://www.thorlabs.com/item/AC254-200-A', note: 'Leído en vivo.',
    alt: { name: 'Acromático f=200 genérico', price: 20, currency: 'USD', source: 'import: AliExpress', link: 'https://www.aliexpress.com/w/wholesale-achromatic-lens-f200mm-25mm.html', note: 'Estimado, no verificado.' } });
  add({ key: 'polarizador', cfg: 'fs', cat: 'Lectura', name: 'Film polarizador lineal', short: 'Polarizador', spec: 'Thorlabs LPVISE2X2 (fondo + analizador; sumar λ/4 de film para luz circular)', qty: 1,
    price: 10.41, currency: 'USD', source: 'import: Thorlabs', link: 'https://www.thorlabs.com/item/LPVISE2X2', note: 'Leído en vivo.' });
  add({ key: 'backlight', cat: 'Lectura', name: 'Anillo / luz LED para microscopio', short: 'Backlight', spec: 'Kaisi RL1', qty: 1, price: 1420, verified: false,
    link: ml('anillo-led-microscopio'), note: '$1.420 visto en el índice (con descuento $1.065). Verificado: anillo de 144 LED a US$22,88 en eBay (ebay.com/itm/224883782996).' });

  // ---------------- Medio ----------------
  add({ key: 'cuboSilice', cfg: 'fs', cat: 'Medio', name: 'Cubo de sílice fundida JGS1', short: 'Cubo sílice', spec: '20×20×20 mm, 6 caras pulidas', qty: 1, price: 60, currency: 'USD',
    source: 'import: AliExpress', verified: false, link: 'https://www.aliexpress.com/w/wholesale-jgs1-fused-silica-cube.html',
    note: 'No hay de catálogo: se pide a medida a proveedores ópticos chinos (~US$40–80 + envío).' });
  add({ key: 'cuboK9', cfg: 'ns', cat: 'Medio', name: 'Cubo de cristal K9', short: 'Cubo K9', spec: '50×50×50 mm, para grabado interno', qty: 1, price: 39.89, currency: 'USD',
    source: 'import: eBay', link: 'https://www.ebay.com/itm/407306658534', note: 'Leído en vivo. Hay blanks más baratos (US$18,84) sin tamaño confirmado.' });

  // ---------------- Seguridad ----------------
  add({ key: 'lentesLaser', cat: 'Seguridad', name: 'Lentes de seguridad láser OD5+', short: 'Lentes láser', spec: 'MCWlaser EP-1: 190–540 nm y 800–1700 nm (532/1030/1064)', qty: 1,
    price: 43.62, currency: 'USD', source: 'import: eBay', link: 'https://www.ebay.com/itm/225139216262',
    note: 'Leído en vivo. Certificadas Thorlabs LG3/LG4 ~US$190–204. Comprar un par por persona en la sala.' });
  add({ key: 'cerramiento', cat: 'Seguridad', name: 'Cerramiento de MDF 3 mm opaco al IR', short: 'Cerramiento', spec: '~650×520×565 mm + interruptor en la tapa', qty: 1, price: 699,
    verified: false, link: ml('mdf-3mm'),
    note: 'El acrílico naranja NO frena 1030/1064 nm: se usa MDF o chapa opaca (plancha 1,83×2,60 m ~$555–699). Visor solo con filtro certificado para la longitud de onda.' });

  // ---------------- Cómputo ----------------
  add({ key: 'notebook', cat: 'Cómputo', name: 'Notebook (control + cámara)', short: 'Notebook', spec: 'La que ya tenés: 2 USB libres', qty: 1, price: 0, source: 'propio', verified: true, link: '' });
})();
