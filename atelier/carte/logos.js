// Eraser Arena — logos des factions.
// Chaque logo est dessiné dans une boîte de 100 × 100, d'une seule couleur :
// une suite d'opérations « add » (on remplit) et « cut » (on évide), dans l'ordre.
// Une opération est un tracé SVG (d), éventuellement tracé au trait (stroke = épaisseur),
// ou une fonction qui dessine elle-même (fn). Style : traits fins, comme les filigranes du cadre.
(function (root) {
  'use strict';
  const TAU = Math.PI * 2;
  const star = (cx, cy, n, R, r, rot = -Math.PI / 2) => (ctx) => {
    ctx.beginPath();
    for (let k = 0; k < n * 2; k += 1) { const a = rot + (k / (n * 2)) * TAU; const rad = k % 2 ? r : R; const x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad; if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
    ctx.closePath(); ctx.fill();
  };
  const circle = (cx, cy, r) => (ctx) => { ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill(); };

  // Style « filigrane », comme les ornements du cadre : traits fins, volutes, petits points.
  // T : trait principal, t : trait secondaire, f : trait très fin.
  const T = 4.6, t = 3.2, f = 2.3;
  const ln = (d, w = T) => ({ d, stroke: w });
  const fill = (d) => ({ d });
  const dot = (x, y, r = 2.6) => ({ fn: circle(x, y, r) });
  // Volute : spirale de rayon r qui part de (x, y) dans la direction a0 (degrés), sens ±1.
  const curl = (x, y, r, a0, sens = 1, w = f, turns = 1.1) => ({ fn: (ctx) => {
    const a = a0 * Math.PI / 180, cx = x + Math.cos(a + sens * Math.PI / 2) * r, cy = y + Math.sin(a + sens * Math.PI / 2) * r, st = a - sens * Math.PI / 2;
    ctx.beginPath(); for (let i = 0; i <= 36; i += 1) { const k = i / 36, rad = r * (1 - 0.7 * k), an = st + sens * turns * TAU * k; const px = cx + Math.cos(an) * rad, py = cy + Math.sin(an) * rad; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
    ctx.lineWidth = w; ctx.stroke(); } });
  const strokeFn = (w, draw) => ({ fn: (ctx) => { ctx.lineWidth = w; draw(ctx); } });

  const LOGOS = {
    // Mortels : sablier.
    mortels: [
      ln('M20 12 H80 M20 88 H80'),
      ln('M30 12 C30 36 47 42 47 50 C47 58 30 64 30 88 M70 12 C70 36 53 42 53 50 C53 58 70 64 70 88', t),
      fill('M50 66 C45 72 39 78 37 85 H63 C61 78 55 72 50 66 Z'),
      ln('M50 53 V64', f), ln('M38 22 C42 30 46 34 50 38 C54 34 58 30 62 22', f),
      curl(20, 12, 5, 180, -1), curl(80, 12, 5, 0, 1), curl(20, 88, 5, 180, 1), curl(80, 88, 5, 0, -1),
    ],
    // Peuple libre : drapeau pirate sur sa hampe.
    'peuple-libre': [
      ln('M22 10 V95'), dot(22, 6, 3.6),
      ln('M22 14 C38 6 54 20 86 11 V54 C58 62 42 48 22 58', t),
      { fn: (ctx) => { ctx.lineWidth = t; ctx.beginPath(); ctx.arc(55, 28, 8, 0, TAU); ctx.stroke(); } },
      ln('M50 36 V40 H60 V36', f), dot(52, 28, 2.2), dot(58, 28, 2.2),
      ln('M42 42 L68 52 M42 52 L68 42', t),
      curl(86, 54, 4, 90, 1),
    ],
    // Créatures : œil à pupille fendue.
    creatures: [
      ln('M6 50 C26 22 74 22 94 50 C74 78 26 78 6 50 Z', t),
      { fn: (ctx) => { ctx.lineWidth = f; ctx.beginPath(); ctx.arc(50, 50, 16, 0, TAU); ctx.stroke(); } },
      fill('M50 35 C55 43 55 57 50 65 C45 57 45 43 50 35 Z'),
      ln('M30 22 L26 12 M50 16 V5 M70 22 L74 12', f),
      dot(6, 50, 2.4), dot(94, 50, 2.4),
    ],
    // Sirènes : queue de sirène.
    sirenes: [
      ln('M38 6 C37 28 45 46 46 63 C35 69 22 76 10 93 C25 86 39 86 50 79 C61 86 75 86 90 93 C78 76 65 69 54 63 C55 46 64 28 62 6', t),
      ln('M42 22 Q50 28 58 22 M44 34 Q50 39 56 34 M46 46 Q50 50 54 46', f),
      ln('M50 79 V66 M30 84 Q40 80 46 74 M70 84 Q60 80 54 74', f),
      curl(10, 93, 4, 200, -1), curl(90, 93, 4, -20, 1),
    ],
    // Vampires : mâchoire, crocs, une goutte de sang.
    vampires: [
      ln('M8 34 C30 20 70 20 92 34', T),
      ln('M12 42 C32 34 68 34 88 42', f),
      ln('M26 39 L32 74 L38 37 M62 37 L68 74 L74 39', t),
      ln('M42 36 L45 47 L48 36 M52 36 L55 47 L58 36 M16 41 L19 50 L22 40 M78 40 L81 50 L84 41', f),
      fill('M68 79 C65 84 65 88 68 90 C71 88 71 84 68 79 Z'),
      curl(8, 34, 4, 200, -1), curl(92, 34, 4, -20, 1),
    ],
    // Huvry'ors : visage allongé sans traits, couronné.
    huvryors: [
      ln('M33 40 C33 28 67 28 67 40 C67 64 58 90 50 96 C42 90 33 64 33 40 Z', t),
      ln('M29 34 L29 14 L38 23 L44 6 L50 20 L56 6 L62 23 L71 14 L71 34 Z', t),
      dot(44, 6, 2.6), dot(56, 6, 2.6), dot(29, 14, 2.2), dot(71, 14, 2.2), dot(50, 27, 2.4),
    ],
    // Humains : tour crénelée.
    humains: [
      ln('M22 14 H35 V23 H44 V14 H56 V23 H65 V14 H78 V38 H71 V92 H29 V38 H22 Z', t),
      ln('M42 92 V77 C42 69 58 69 58 77 V92', f), ln('M50 46 V60', t),
      ln('M50 14 V3 L61 6 L50 9', f),
      ln('M18 92 H82', t),
    ],
    // Haut-hommes : bouclier.
    automes: [
      ln('M18 10 H82 V44 C82 67 67 83 50 94 C33 83 18 67 18 44 Z', t),
      ln('M26 18 H74 V44 C74 62 62 76 50 85 C38 76 26 62 26 44 Z', f),
      ln('M50 26 V76 M34 44 H66', t),
      dot(50, 44, 3.4), curl(18, 10, 4, 180, -1), curl(82, 10, 4, 0, 1),
    ],
    // Humaines de Valhelm : corbeau perché.
    valhelm: [
      ln('M14 33 L34 26 C38 19 50 18 54 25 C62 25 72 32 76 46 C78 52 77 58 76 62 L94 84 L86 88 L66 71 C55 76 43 72 39 62 C36 55 36 46 37 39 L34 35 Z', t),
      dot(44, 27, 2.6),
      ln('M47 44 C55 50 63 56 73 62', f),
      ln('M52 72 V86 M60 71 V86', f), ln('M34 88 H80', t),
    ],
    // Cir'hois : arbre feuillu.
    sirois: [
      ln('M30 58 C15 58 13 40 26 36 C23 20 42 11 52 20 C62 9 83 18 78 34 C90 38 88 58 72 58 Z', t),
      ln('M46 90 C48 80 48 68 45 58 M54 90 C52 80 52 68 55 58', t),
      ln('M49 62 C49 50 42 44 35 40 M51 56 C54 46 62 42 68 40 M50 48 V32', f),
      ln('M34 92 H66', t), dot(30, 92, 2.2), dot(70, 92, 2.2),
    ],
    // Orcs : deux défenses.
    orques: [
      ln('M31 84 C21 62 23 34 37 10 C35 34 37 58 43 80', t),
      ln('M69 84 C79 62 77 34 63 10 C65 34 63 58 57 80', t),
      ln('M18 78 C34 94 66 94 82 78', T),
      dot(37, 10, 2.6), dot(63, 10, 2.6), curl(18, 78, 4, 200, -1), curl(82, 78, 4, -20, 1),
    ],
    // Orcs du sang : goutte de sang et éclaboussures.
    'orques-sang': [
      ln('M48 8 C60 30 74 44 74 62 C74 78 62 90 48 90 C34 90 22 78 22 62 C22 44 36 30 48 8 Z', t),
      fill('M48 40 C55 52 62 58 62 66 C62 75 56 80 48 80 C40 80 34 75 34 66 C34 58 41 52 48 40 Z'),
      dot(82, 30, 4), dot(85, 46, 2.6), dot(14, 38, 3), dot(18, 52, 2),
    ],
    // Orcs des terres arides : soleil.
    'orques-arides': [
      { fn: (ctx) => { ctx.lineWidth = t; ctx.beginPath(); ctx.arc(50, 50, 16, 0, TAU); ctx.stroke(); ctx.lineWidth = f; ctx.beginPath(); ctx.arc(50, 50, 9, 0, TAU); ctx.stroke(); } },
      dot(50, 50, 3),
      { fn: (ctx) => { for (let k = 0; k < 16; k += 1) { const a = (k / 16) * TAU, long = k % 2 === 0; ctx.lineWidth = long ? t : f; const r0 = 22, r1 = long ? 44 : 34; ctx.beginPath(); ctx.moveTo(50 + Math.cos(a) * r0, 50 + Math.sin(a) * r0); ctx.lineTo(50 + Math.cos(a) * r1, 50 + Math.sin(a) * r1); ctx.stroke(); if (long) { ctx.beginPath(); ctx.arc(50 + Math.cos(a) * 47, 50 + Math.sin(a) * 47, 1.8, 0, TAU); ctx.fill(); } } } },
    ],
    // Orcs des forêts : arbre de jungle, tronc courbé, grandes palmes.
    'orques-forets': [
      ln('M45 94 C48 76 52 58 49 38 M54 94 C57 76 57 56 55 37', t),
      ln('M47 80 H55 M48 66 H56 M48 52 H55', f),
      { fn: (ctx) => {
        const bx = 52, by = 34;
        const frond = (ang, len, wid, droop) => {
          const a = ang * Math.PI / 180, tx = bx + Math.cos(a) * len, ty = by + Math.sin(a) * len + droop;
          const mx = (bx + tx) / 2, my = (by + ty) / 2 - droop * 0.2, nx = -(ty - by) / len, ny = (tx - bx) / len;
          ctx.lineWidth = f; ctx.beginPath(); ctx.moveTo(bx, by);
          ctx.quadraticCurveTo(mx + nx * wid, my + ny * wid, tx, ty);
          ctx.quadraticCurveTo(mx - nx * wid * 0.35, my - ny * wid * 0.35, bx, by); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(mx + nx * wid * 0.3, my + ny * wid * 0.3, tx, ty); ctx.stroke();
        };
        frond(180, 44, 11, 22); frond(0, 44, -11, 22); frond(215, 36, 9, 4); frond(-35, 36, -9, 4); frond(265, 30, 8, 0);
      } },
      dot(52, 34, 3.2),
    ],
    // Hesh'lir : plume.
    heshlir: [
      ln('M80 10 C58 14 40 32 32 56 C29 65 29 71 31 76 C46 81 61 73 69 57 C77 41 82 25 80 10 Z', t),
      ln('M78 14 C62 34 46 56 24 92', t),
      ln('M70 26 L60 22 M66 34 L52 30 M60 44 L44 40 M54 54 L38 52 M48 63 L33 63 M67 30 L74 38 M62 40 L70 48 M56 50 L64 58 M50 60 L56 68', f),
    ],
    // Nash'mur : vague qui s'enroule.
    nashmur: [
      ln('M6 76 C18 58 28 30 54 23 C73 18 90 30 92 48 C84 39 71 39 65 47 C59 55 65 66 76 65', T),
      ln('M14 82 C26 62 36 40 56 33 C68 30 78 34 84 40', f),
      ln('M22 86 C32 70 42 52 58 44', f),
      ln('M4 92 C18 86 32 86 46 92 C60 98 74 98 96 90', t),
      dot(82, 16, 2.6), dot(90, 24, 2), dot(74, 12, 1.8),
    ],
    // Les Autres : spirale.
    autres: [
      { fn: (ctx) => { ctx.beginPath(); for (let i = 0; i <= 160; i += 1) { const k = i / 160; const a = k * 2.8 * TAU; const r = 4 + 40 * k; const x = 50 + Math.cos(a) * r, y = 50 + Math.sin(a) * r; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.lineWidth = t; ctx.stroke(); } },
      dot(50, 50, 3.4), dot(94, 50, 3),
    ],
    // Gardiens : étoile filante, venue d'ailleurs.
    gardiens: [
      { fn: (ctx) => { ctx.lineWidth = t; ctx.beginPath(); for (let k = 0; k < 8; k += 1) { const a = -Math.PI / 2 + (k / 8) * TAU, rad = k % 2 ? 7 : 24; const x = 68 + Math.cos(a) * rad, y = 32 + Math.sin(a) * rad; if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.closePath(); ctx.stroke(); } },
      dot(68, 32, 3),
      ln('M56 44 L14 88 M50 36 L10 64 M64 52 L40 92', f),
      dot(14, 88, 2.4), dot(10, 64, 2), dot(40, 92, 2),
    ],
    // Les Neuf : étoile à neuf branches (ennéagramme) dans un cercle.
    'les-neuf': [
      { fn: (ctx) => { ctx.lineWidth = f; ctx.beginPath(); for (let k = 0; k <= 9; k += 1) { const i = (k * 4) % 9; const a = -Math.PI / 2 + (i / 9) * TAU; const x = 50 + Math.cos(a) * 40, y = 50 + Math.sin(a) * 40; if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.stroke();
        ctx.lineWidth = t; ctx.beginPath(); ctx.arc(50, 50, 46, 0, TAU); ctx.stroke();
        for (let k = 0; k < 9; k += 1) { const a = -Math.PI / 2 + (k / 9) * TAU; ctx.beginPath(); ctx.arc(50 + Math.cos(a) * 40, 50 + Math.sin(a) * 40, 2.6, 0, TAU); ctx.fill(); } } },
      dot(50, 50, 4),
    ],
    // Titans : montagne qui a un œil.
    titans: [
      ln('M4 90 L50 8 L96 90 Z', t),
      ln('M38 30 L50 40 L62 30', f),
      ln('M30 66 C40 56 60 56 70 66 C60 76 40 76 30 66 Z', t),
      dot(50, 66, 4.4),
      ln('M18 90 L32 70 M82 90 L68 70', f),
    ],
    // Cysars : peuple du feu qui vit sous terre. Une flamme dans la bouche d'une caverne, des braises qui montent.
    cysars: [
      ln('M14 90 C14 46 30 22 50 22 C70 22 86 46 86 90', t),
      ln('M24 90 C24 54 36 34 50 34 C64 34 76 54 76 90', f),
      fill('M50 44 C58 56 64 64 62 76 C61 84 56 88 50 88 C44 88 39 84 38 76 C37 68 44 62 46 54 C48 60 51 62 52 59 C54 54 52 50 50 44 Z'),
      ln('M6 91 H94', T),
      dot(50, 9, 2.6), dot(40, 13, 1.8), dot(60, 13, 1.8),
    ],
    // Näadrian : les squelettes. Un crâne, orbites creuses, mâchoire serrée.
    naadrian: [
      ln('M24 50 C24 28 36 14 50 14 C64 14 76 28 76 50 C76 60 72 66 66 70 V84 H34 V70 C28 66 24 60 24 50 Z', t),
      fill('M32 46 C32 39 43 39 45 46 C45 52 40 57 37 55 C34 53 32 50 32 46 Z'),
      fill('M68 46 C68 39 57 39 55 46 C55 52 60 57 63 55 C66 53 68 50 68 46 Z'),
      fill('M50 56 L46 65 H54 Z'),
      ln('M34 73 H66 M42 73 V84 M50 73 V84 M58 73 V84', f),
      ln('M60 16 L55 25 L59 30', f),
    ],
    // Descendants des dieux : une lignée d'étoiles, la grande engendre les petites.
    descendants: [
      { fn: (ctx) => {
        const st = (cx, cy, R, r) => { ctx.beginPath(); for (let k = 0; k < 8; k += 1) { const a = -Math.PI / 2 + (k / 8) * TAU, rad = k % 2 ? r : R; const x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad; if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.closePath(); ctx.stroke(); };
        ctx.lineWidth = t; st(50, 22, 18, 5); ctx.lineWidth = f; st(28, 66, 10, 3); st(72, 66, 10, 3);
      } },
      dot(50, 22, 2.8), dot(28, 66, 2), dot(72, 66, 2),
      ln('M50 40 C50 50 30 48 28 56 M50 40 C50 50 70 48 72 56', f),
      ln('M28 76 V86 M72 76 V86', f), dot(28, 90, 2.2), dot(72, 90, 2.2), dot(50, 92, 1.8),
    ],
    // Nimors : le cauchemar. Croissant de lune hérissé d'épines, un œil ouvert qui veille, des larmes.
    'nids-morts': [
      ln('M60 6 C32 10 14 30 14 54 C14 78 34 96 60 96 C42 86 32 72 32 54 C32 36 42 20 60 6 Z', t),
      { fn: (ctx) => { ctx.lineWidth = f; for (let k = 0; k < 7; k += 1) { const u = (k + 0.5) / 7; const ang = Math.PI * 0.62 + u * Math.PI * 0.76; const cx = 32 + 28, cy = 54; const r = 28; const x = cx + Math.cos(ang) * r, y = cy + Math.sin(ang) * r; const ix = x + Math.cos(ang + Math.PI) * 9, iy = y + Math.sin(ang + Math.PI) * 9; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ix, iy); ctx.stroke(); } } },
      ln('M50 50 C58 40 78 40 86 50 C78 60 58 60 50 50 Z', t),
      fill('M68 42 C71 46 71 54 68 58 C65 54 65 46 68 42 Z'),
      ln('M62 60 V72 M72 60 V80', f), dot(62, 75, 2.4), dot(72, 83, 2.4),
    ],
  };

  // Masque blanc du logo, en size × size pixels.
  const cache = new Map();
  function mask(id, size) {
    const key = id + '@' + size; if (cache.has(key)) return cache.get(key);
    const ops = LOGOS[id]; if (!ops) return null;
    const c = document.createElement('canvas'); c.width = c.height = size;
    const ctx = c.getContext('2d'); ctx.scale(size / 100, size / 100);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#fff'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const op of ops) {
      ctx.globalCompositeOperation = op.op === 'cut' ? 'destination-out' : 'source-over';
      if (op.fn) { op.fn(ctx); continue; }
      const p = new Path2D(op.d);
      if (op.stroke) { ctx.lineWidth = op.stroke; ctx.stroke(p); } else ctx.fill(p, 'evenodd');
    }
    cache.set(key, c);
    return c;
  }

  // Dessine le logo centré en (x, y), de taille size, rempli avec fill (couleur ou dégradé).
  // halo : couleur du contour sombre qui le détache du fond.
  function draw(ctx, id, x, y, size, fill, halo = 'rgba(0,0,0,0.85)', glow = null) {
    const res = Math.ceil(size * 3);
    const m = mask(id, res); if (!m) return false;
    const tint = document.createElement('canvas'); tint.width = tint.height = res;
    const tc = tint.getContext('2d');
    tc.drawImage(m, 0, 0); tc.globalCompositeOperation = 'source-in';
    if (typeof fill === 'string') tc.fillStyle = fill; else { const g = tc.createLinearGradient(0, 0, res, res); fill.forEach(([t, c]) => g.addColorStop(t, c)); tc.fillStyle = g; }
    tc.fillRect(0, 0, res, res);
    const x0 = x - size / 2, y0 = y - size / 2;
    if (halo) {
      const h = document.createElement('canvas'); h.width = h.height = res; const hc = h.getContext('2d');
      hc.drawImage(m, 0, 0); hc.globalCompositeOperation = 'source-in'; hc.fillStyle = halo; hc.fillRect(0, 0, res, res);
      ctx.save(); ctx.filter = `blur(${Math.max(1, size / 22)}px)`;
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) ctx.drawImage(h, x0 + dx * 1.2, y0 + dy * 1.2, size, size);
      ctx.restore();
    }
    ctx.save(); if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = size / 4; }
    ctx.drawImage(tint, x0, y0, size, size); ctx.restore();
    return true;
  }

  root.Logos = { LOGOS, mask, draw, has: (id) => !!LOGOS[id] };
}(window));
