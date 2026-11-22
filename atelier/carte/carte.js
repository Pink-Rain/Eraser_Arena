// Eraser Arena — fabrication d'une carte en relief (fond, cadre, emblème).
// Format TCG 63 × 88 mm, rendu en 512 × 716 px.
// - Le fond prend la couleur de la faction ; ses motifs et sa brillance montent avec la rareté.
// - Le cadre (matière, ornements, usure) dépend de la rareté.
// - L'emblème est un médaillon émaillé à la couleur de la faction (symbole provisoire).
(function (root) {
  'use strict';
  const R = root.Relief;
  const Hp = root.Helpers;
  const W = 512, H = 716;
  R.setSize(W, H);
  const { TAU, smooth, clamp01, hex, getFields, sample } = R;
  const CX = W / 2;

  /* ---------- gabarit ---------- */
  const LAYOUT = {
    card: { x0: 3, y0: 3, x1: W - 3, y1: H - 3, r: 24 },
    plate: { x0: 40, y0: 28, x1: W - 40, y1: 76, r: 9 },
    art: { x0: 40, y0: 90, x1: W - 40, y1: 412, r: 7 },
    text: { x0: 40, y0: 440, x1: W - 40, y1: 662, r: 7 },
    emblem: { x: CX, y: 426, r: 30 },
    gem: { x: CX, y: 689 },
    band: 21.5, // milieu des bandes latérales
  };
  const rr = (b, inset = 0) => (ctx) => {
    const x0 = b.x0 + inset, y0 = b.y0 + inset, x1 = b.x1 - inset, y1 = b.y1 - inset, r = Math.max(0, b.r - inset);
    ctx.moveTo(x0 + r, y0); ctx.arcTo(x1, y0, x1, y1, r); ctx.arcTo(x1, y1, x0, y1, r); ctx.arcTo(x0, y1, x0, y0, r); ctx.arcTo(x0, y0, x1, y0, r); ctx.closePath();
  };
  const shape = (...parts) => (ctx) => { ctx.beginPath(); parts.forEach((p) => p(ctx)); };
  const inBox = (b, x, y) => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1;

  function maskCanvas(draw, rule = 'evenodd') {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; draw(ctx); ctx.fill(rule);
    return c;
  }
  // Masques et champs de distance : calculés une fois, partagés par toutes les cartes.
  let cache = null;
  function geometry() {
    if (cache) return cache;
    const card = maskCanvas(shape(rr(LAYOUT.card)));
    const frame = maskCanvas(shape(rr(LAYOUT.card), rr(LAYOUT.art), rr(LAYOUT.text)));
    const plate = maskCanvas(shape(rr(LAYOUT.plate)));
    cache = { card, frame, plate, Dframe: R.distanceField(frame), Dplate: R.distanceField(plate) };
    return cache;
  }

  /* ---------- raretés ---------- */
  // metal : matière du cadre ; wear : usure ; gem : pierre du bas.
  const RARITIES = {
    trescommune: { label: 'Très commune', rank: 0, metal: { kind: 'iron', albedo: '#4c4945', metal: 0.85, rough: 0.6 }, wear: 0.55, gem: null },
    commune: { label: 'Commune', rank: 1, metal: { kind: 'bronze', albedo: '#8a6038', metal: 0.9, rough: 0.48 }, wear: 1.2, gem: { color: '#d9ccb0', cut: 'cabochon' } },
    rare: { label: 'Rare', rank: 2, metal: { kind: 'silver', albedo: '#aeaca6', metal: 0.95, rough: 0.36 }, wear: 1, gem: { color: '#2f8a52', cut: 'cabochon' } },
    superrare: { label: 'Super rare', rank: 3, metal: { kind: 'silver', albedo: '#c9cac8', metal: 0.97, rough: 0.24 }, wear: 0.6, gem: { color: '#2a6fb0', facets: 8 } },
    epique: { label: 'Épique', rank: 4, metal: { kind: 'gold', albedo: '#cfa24c', metal: 0.96, rough: 0.28 }, wear: 0.5, gem: { color: '#7438b0', facets: 8 } },
    legendaire: { label: 'Légendaire', rank: 5, metal: { kind: 'gold', albedo: '#cf9f45', metal: 0.98, rough: 0.2 }, wear: 0.35, gem: { color: '#e09a28', facets: 10, glow: 'rgba(255,170,60,0.75)' } },
  };
  const ORDER = ['trescommune', 'commune', 'rare', 'superrare', 'epique', 'legendaire'];

  /* ---------- couleurs ---------- */
  const lighten = (c, t) => c.map((v) => v + (255 - v) * t);
  const scale = (c, k) => c.map((v) => Math.min(255, v * k));
  const css = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  const frac = (v) => v - Math.floor(v);

  /* ---------- fond ---------- */
  // Treillis en ogive (damas classique) : renvoie le filet (0-1) et le fleuron au centre des cellules.
  function ogee(x, y, s, hgt) {
    const A = 0.25, u = x / s, v = y / hgt, sn = Math.sin(TAU * u);
    // Distance verticale corrigée par la pente, pour un filet d'épaisseur régulière.
    const slope = (A * TAU * Math.cos(TAU * u) * hgt) / s; const norm = Math.sqrt(1 + slope * slope);
    const f1 = frac(v - A * sn), f2 = frac(v - 0.5 + A * sn);
    const d = (Math.min(Math.min(f1, 1 - f1), Math.min(f2, 1 - f2)) * hgt) / norm;
    const ridge = 1 - smooth(1.1, 2.4, d);
    const c1 = [Math.round(u - 0.75) + 0.75, Math.round(v - 0.25) + 0.25], c2 = [Math.round(u - 0.25) + 0.25, Math.round(v - 0.75) + 0.75];
    const d1 = Math.hypot((u - c1[0]) * s, (v - c1[1]) * hgt), d2 = Math.hypot((u - c2[0]) * s, (v - c2[1]) * hgt);
    const c = d1 < d2 ? c1 : c2; const dx = (u - c[0]) * s, dy = (v - c[1]) * hgt;
    const a = Math.atan2(dy, dx); const R0 = 8 * (0.55 + 0.45 * Math.abs(Math.cos(2 * a)));
    const bloom = 1 - smooth(R0 - 1.2, R0 + 0.8, Math.hypot(dx, dy));
    return { ridge, bloom };
  }
  // Hauteurs du fond entre 0.04 et 0.2 : toujours sous le cadre.
  function paintFond(L, faction, rk) {
    const f = getFields();
    const raw = hex(faction.color); const lum0 = 0.3 * raw[0] + 0.59 * raw[1] + 0.11 * raw[2];
    const base = raw.map((v) => Math.max(0, Math.min(255, lum0 + (v - lum0) * 1.35)));
    const gold = [214, 170, 82];
    const artC = [CX, (LAYOUT.art.y0 + LAYOUT.art.y1) / 2];
    L.paint(geometry().card, (x, y, px) => {
      const low = sample(f.low, x, y), mid = sample(f.mid, x, y), fine = sample(f.fine, x * 1.7, y * 1.7);
      // Couleur : la faction, plus riche et plus lumineuse quand la rareté monte.
      const k = 0.5 + 0.08 * rk + 0.3 * (low - 0.5);
      let rgb = scale(base, k);
      let h = 0.06 + (mid - 0.5) * 0.02, metal = 0, rough = 0.9, kind = 'paint';
      if (rk === 0) { kind = 'cloth'; }
      else if (rk === 1) {
        // Cuir grainé, léger dégradé vers le haut.
        kind = 'leather'; rough = 0.75; rgb = scale(rgb, 0.9 + 0.2 * (1 - y / H));
      } else if (rk === 2) {
        // Treillis de losanges en léger relief.
        const s = 30; const u = frac((x + y) / s), v = frac((x - y) / s);
        const line = 1 - smooth(0.03, 0.09, Math.min(Math.abs(u - 0.5), Math.abs(v - 0.5)));
        h += 0.06 * line; rough = 0.7; rgb = scale(rgb, 1 + 0.12 * line);
      } else if (rk === 3) {
        // Quadrilobes en relief, dans une trame ; reflet satiné.
        const s = 44; const cx = (Math.floor(x / s) + 0.5) * s, cy = (Math.floor(y / s) + 0.5) * s;
        const dx = x - cx, dy = y - cy; const a = Math.atan2(dy, dx); const d = Math.hypot(dx, dy);
        const R0 = s * 0.3 * (0.72 + 0.28 * Math.abs(Math.cos(2 * a)));
        const lobe = 1 - smooth(R0 - 2, R0 + 1.5, d);
        const edge = smooth(R0 - 5, R0 - 1, d) * lobe;
        const ux = frac(x / s), uy = frac(y / s);
        const dot = 1 - smooth(1.5, 3.5, Math.hypot(Math.min(ux, 1 - ux) * s, Math.min(uy, 1 - uy) * s));
        h += 0.05 * lobe + 0.04 * edge + 0.05 * dot;
        metal = 0.25 * Math.max(edge, dot); rough = 0.5; rgb = scale(rgb, 1 + 0.15 * lobe);
        if (edge > 0.4 || dot > 0.4) rgb = lighten(rgb, 0.12);
      } else if (rk === 4) {
        // Damas en ogives : filets et fleurons dorés sur champ satiné.
        const { ridge, bloom } = ogee(x, y, 58, 92);
        const m = Math.max(ridge, bloom);
        h += 0.08 * m; metal = 0.12 + 0.8 * m; rough = 0.45 - 0.2 * m;
        rgb = rgb.map((c, i) => c + (gold[i] * 0.85 - c) * m * 0.85);
      } else {
        // Gloire : rayons partant du portrait, poussière d'or, damas en sourdine.
        const dx = x - artC[0], dy = y - artC[1]; const a = Math.atan2(dy, dx); const d = Math.hypot(dx, dy);
        const ray = smooth(0.2, 0.75, Math.cos(a * 18) * 0.5 + 0.5);
        const { ridge, bloom } = ogee(x, y, 58, 92);
        const m = Math.max(ridge, bloom) * (0.35 + 0.65 * smooth(90, 260, d));
        rgb = scale(rgb, 0.92 + 0.28 * ray * (1 - smooth(120, 420, d)));
        h += 0.04 * ray + 0.06 * m;
        metal = 0.25 + 0.6 * m; rough = 0.4 - 0.18 * m;
        rgb = rgb.map((c, i) => c + (gold[i] - c) * m * 0.8);
        if (fine > 0.86) { rgb = lighten(gold, 0.15); metal = 1; rough = 0.18; h += 0.015; }
        px.e = scale(lighten(base, 0.4), 0.16 * ray * (1 - smooth(60, 300, d)));
      }
      px.rgb = rgb; px.h = h; px.hMode = 'set'; px.metal = metal; px.rough = rough; px.kind = kind;
    });
  }

  /* ---------- cadre ---------- */
  // Profil de la bande selon la distance au bord le plus proche.
  const PROFILES = [
    (d) => 0.32 + 0.3 * smooth(0, 7, d), // fer : gros chanfrein
    (d) => 0.32 + 0.34 * Math.sqrt(smooth(0, 11, d)), // bronze : jonc
    (d) => 0.32 + 0.26 * smooth(0, 5, d) + 0.12 * smooth(12, 17, d), // argent : deux marches
    (d) => 0.32 + 0.26 * smooth(0, 5, d) + 0.12 * smooth(12, 17, d) - 0.06 * (1 - smooth(0, 2.5, Math.abs(d - 9))),
    (d) => 0.34 + 0.28 * smooth(0, 6, d) - 0.09 * (1 - smooth(0, 3.5, Math.abs(d - 11))) + 0.12 * smooth(16, 22, d),
    (d) => 0.34 + 0.3 * smooth(0, 6, d) - 0.1 * (1 - smooth(0, 3.5, Math.abs(d - 11))) + 0.14 * smooth(16, 22, d),
  ];

  function paintFrame(L, rar) {
    const g = geometry(); const m = rar.metal; const col = hex(m.albedo); const prof = PROFILES[rar.rank];
    L.paint(g.frame, (x, y, px) => {
      const d = g.Dframe[y * W + x];
      px.h = prof(d); px.hMode = 'set';
      px.rgb = col; px.metal = m.metal; px.rough = m.rough; px.kind = m.kind;
    });
    // Plaque du nom, posée sur la bande du haut.
    const plateCol = rar.rank === 0 ? scale(col, 0.85) : rar.rank >= 4 ? lighten(col, 0.08) : col;
    L.paint(g.plate, (x, y, px) => {
      const d = g.Dplate[y * W + x];
      px.h = 0.44 + 0.22 * smooth(0, 5, d) - (rar.rank >= 2 ? 0.05 * (1 - smooth(0, 1.6, Math.abs(d - 7))) : 0);
      px.hMode = 'set'; px.rgb = plateCol; px.metal = m.metal; px.rough = Math.min(1, m.rough + 0.05); px.kind = m.kind;
    });
  }

  const matOf = (rar, extra = {}) => ({ albedo: rar.metal.albedo, kind: rar.metal.kind, metal: rar.metal.metal, rough: rar.metal.rough, ...extra });
  const corners = () => { const b = LAYOUT.band; return [[b, b], [W - b, b], [b, H - b], [W - b, H - b]]; };

  function rectPts(b, out, step) {
    const pts = []; const x0 = b.x0 - out, y0 = b.y0 - out, x1 = b.x1 + out, y1 = b.y1 + out;
    const per = 2 * (x1 - x0 + y1 - y0); const n = Math.floor(per / step);
    for (let k = 0; k < n; k += 1) {
      let s = (k / n) * per; let x, y;
      if (s < x1 - x0) { x = x0 + s; y = y0; } else if ((s -= x1 - x0) < y1 - y0) { x = x1; y = y0 + s; } else if ((s -= y1 - y0) < x1 - x0) { x = x1 - s; y = y1; } else { s -= x1 - x0; x = x0; y = y1 - s; }
      pts.push([x, y]);
    }
    return pts;
  }

  function spiral(L, cx, cy, r1, a0, turns, sign, w, mat) {
    const pts = Hp.spiralPts(cx, cy, r1, 1.5, a0, turns * sign, 70);
    L.taper(pts, (t) => w * (1 - 0.65 * t), { ...mat, base: 0.5, peak: 0.86, gap: 2, gapHeight: 0.3 });
  }

  function ornaments(L, rar, faction, seed) {
    const rk = rar.rank; const b = LAYOUT.band; const mat = matOf(rar);
    const lo = rar.metal.kind === 'iron' ? { kind: 'iron', metal: 0.9 } : { kind: rar.metal.kind, metal: rar.metal.metal };
    if (rk === 0) {
      corners().forEach(([x, y]) => Hp.rivet(L, x, y, 6, { albedo: '#4d4640', ...lo }));
    }
    if (rk === 1) {
      for (let y = 120; y <= H - 80; y += 62) { Hp.rivet(L, b, y, 4.5, { albedo: '#7c5733', ...lo }); Hp.rivet(L, W - b, y, 4.5, { albedo: '#7c5733', ...lo }); }
      corners().forEach(([x, y]) => Hp.rivet(L, x, y, 6.5, { albedo: '#7c5733', ...lo }));
    }
    if (rk >= 1 && rk <= 3) {
      // Filet gravé au milieu des bandes.
      const groove = (ctx) => { ctx.beginPath(); ctx.moveTo(b, 104); ctx.lineTo(b, H - 44); ctx.moveTo(W - b, 104); ctx.lineTo(W - b, H - 44); ctx.moveTo(56, LAYOUT.gem.y); ctx.lineTo(CX - 30, LAYOUT.gem.y); ctx.moveTo(CX + 30, LAYOUT.gem.y); ctx.lineTo(W - 56, LAYOUT.gem.y); };
      if (rk >= 2) L.engrave(groove, 2.2, 0.32);
    }
    if (rk === 2) corners().forEach(([x, y]) => L.dome(x, y, 9, { ...mat, base: 0.5, peak: 0.85 }));
    if (rk >= 3) {
      // Volutes de filigrane dans les coins.
      corners().forEach(([x, y], i) => {
        const sx = i % 2 ? -1 : 1, sy = i < 2 ? 1 : -1;
        spiral(L, x, y, 13, Math.atan2(sy, sx) + Math.PI, 1.6, sx * sy, rk >= 4 ? 5 : 3.6, mat);
        if (rk >= 4) L.dome(x, y, 4, { ...mat, base: 0.6, peak: 0.95 });
      });
      // Pierres sur les bandes latérales, à mi-hauteur du portrait.
      const sideGem = { ...rar.gem, cut: rar.gem.facets ? undefined : 'cabochon', setKind: rar.metal.kind, setAlbedo: rar.metal.albedo, base: 0.5 };
      Hp.gem(L, b, 251, rk >= 4 ? 9 : 7.5, sideGem); Hp.gem(L, W - b, 251, rk >= 4 ? 9 : 7.5, sideGem);
    }
    if (rk >= 4) {
      // Perles autour du portrait, pierre au sommet.
      rectPts(LAYOUT.art, 5.5, 10).forEach(([x, y]) => { if (Math.hypot(x - LAYOUT.emblem.x, y - LAYOUT.emblem.y) > LAYOUT.emblem.r + 6) L.dome(x, y, 2.7, { ...mat, base: 0.45, peak: 0.72 }); });
      Hp.gem(L, CX, 15, 8, { ...rar.gem, setKind: rar.metal.kind, setAlbedo: rar.metal.albedo, base: 0.5 });
      [-1, 1].forEach((s) => spiral(L, CX + s * 24, 15, 9, s > 0 ? Math.PI : 0, 1.2, s, 3.2, mat));
    }
    if (rk >= 5) {
      // Perles autour du texte, embouts en volute sur la plaque, runes qui luisent.
      rectPts(LAYOUT.text, 5.5, 10).forEach(([x, y]) => { if (Math.hypot(x - LAYOUT.emblem.x, y - LAYOUT.emblem.y) > LAYOUT.emblem.r + 6) L.dome(x, y, 2.7, { ...mat, base: 0.45, peak: 0.72 }); });
      [[LAYOUT.plate.x0 + 2, 1], [LAYOUT.plate.x1 - 2, -1]].forEach(([x, s]) => spiral(L, x, (LAYOUT.plate.y0 + LAYOUT.plate.y1) / 2, 12, s > 0 ? 0 : Math.PI, 1.5, -s, 4, mat));
      const glow = css(lighten(hex(faction.color), 0.75), 1);
      const r = R.rng(seed + 7);
      for (let y = 112; y <= H - 64; y += 30) {
        if (Math.abs(y - 251) < 22 || Math.abs(y - LAYOUT.emblem.y) < 18) continue;
        [b, W - b].forEach((x) => L.engrave(Hp.runePath(x, y, 0, 15, r), 2, 0.45, { emissive: glow, emissiveWidth: 2.4 }));
      }
    }
  }

  /* ---------- emblème ---------- */
  function emblem(L, rar, faction) {
    const { x, y, r } = LAYOUT.emblem; const mat = matOf(rar);
    L.torus(x, y, r, r, 0, 0.24, { ...mat, base: 0.5, peak: 0.92, op: 'source-over' });
    const enamel = hex(faction.color);
    L.fill(Hp.circle(r * 0.77, x, y), { albedo: (ctx) => { const g = ctx.createRadialGradient(x - 6, y - 8, 0, x, y, r * 0.8); g.addColorStop(0, css(lighten(enamel, 0.25))); g.addColorStop(1, css(scale(enamel, 0.6))); return g; }, height: 0.6, kind: 'glass', metal: 0, rough: 0.08, op: 'source-over' });
    // Symbole provisoire : étoile à quatre branches en relief.
    const star = (ctx) => { ctx.beginPath(); for (let k = 0; k < 8; k += 1) { const a = -Math.PI / 2 + (k / 8) * TAU; const rad = k % 2 ? 4.2 : 15; const px = x + Math.cos(a) * rad, py = y + Math.sin(a) * rad; if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py); } ctx.closePath(); };
    L.fill(star, { ...mat, height: 0.72, op: 'source-over' });
    L.engrave((ctx) => { ctx.beginPath(); ctx.moveTo(x, y - 13); ctx.lineTo(x, y + 13); ctx.moveTo(x - 13, y); ctx.lineTo(x + 13, y); }, 1.2, 0.18);
  }

  function rarityGem(L, rar) {
    const { x, y } = LAYOUT.gem;
    if (!rar.gem) { Hp.rivet(L, x, y, 7, { albedo: '#4d4640', kind: 'iron' }); return; }
    Hp.gem(L, x, y, rar.rank >= 4 ? 11 : 9.5, { ...rar.gem, setKind: rar.metal.kind, setAlbedo: rar.metal.albedo, base: 0.5, prongs: rar.rank >= 3 ? 4 : 0 });
  }

  /* ---------- finitions (texte, silhouette) ---------- */
  function finish(ctx, card, rar, faction) {
    const { art, text, plate } = LAYOUT;
    // Silhouette provisoire, au loin dans la brume.
    ctx.save(); ctx.beginPath(); rr(art)(ctx); ctx.clip();
    const fog = ctx.createLinearGradient(0, art.y0, 0, art.y1);
    fog.addColorStop(0, 'rgba(0,0,0,0)'); fog.addColorStop(0.75, 'rgba(10,8,8,0.18)'); fog.addColorStop(1, 'rgba(8,6,6,0.55)');
    ctx.fillStyle = fog; ctx.fillRect(art.x0, art.y0, art.x1 - art.x0, art.y1 - art.y0);
    ctx.filter = 'blur(1.4px)'; ctx.fillStyle = 'rgba(10,8,8,0.7)';
    const sx = CX, sy = art.y1 - 34, s = 0.8;
    ctx.beginPath();
    const P = (dx, dy) => [sx + dx * s, sy + dy * s];
    ctx.moveTo(...P(-46, 40)); ctx.bezierCurveTo(...P(-44, -20), ...P(-30, -52), ...P(-16, -62));
    ctx.bezierCurveTo(...P(-26, -80), ...P(-20, -112), ...P(0, -118));
    ctx.bezierCurveTo(...P(20, -112), ...P(26, -80), ...P(16, -62));
    ctx.bezierCurveTo(...P(30, -52), ...P(44, -20), ...P(46, 40)); ctx.closePath(); ctx.fill();
    ctx.restore();
    // Zone de texte : voile sombre pour la lisibilité.
    ctx.save(); ctx.beginPath(); rr(text)(ctx); ctx.clip();
    ctx.fillStyle = `rgba(12,9,9,${0.62 + 0.03 * rar.rank})`; ctx.fillRect(text.x0, text.y0, text.x1 - text.x0, text.y1 - text.y0);
    ctx.fillStyle = '#e8dcc6'; ctx.textAlign = 'center';
    ctx.font = '600 15px "Cinzel", Georgia, serif'; ctx.globalAlpha = 0.85;
    ctx.fillText((faction.type || 'Personnage') + ' · ' + faction.name, CX, text.y0 + 52);
    ctx.font = 'italic 17px "Alegreya", Georgia, serif'; ctx.globalAlpha = 0.7;
    ctx.fillText('Ici viendra le texte de la carte.', CX, text.y0 + 100);
    ctx.restore();
    // Nom gravé dans la plaque.
    const name = faction.cardName || rar.label;
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '700 23px "Cinzel", Georgia, serif';
    const py = (plate.y0 + plate.y1) / 2 + 1;
    // Sur le fer sombre, lettres claires ; sur les métaux clairs, lettres gravées sombres.
    const dark = rar.rank === 0;
    ctx.fillStyle = dark ? 'rgba(0,0,0,0.6)' : 'rgba(255,240,210,0.28)'; ctx.fillText(name, CX, py + 1.2);
    ctx.fillStyle = dark ? 'rgba(222,212,196,0.82)' : 'rgba(20,12,6,0.82)'; ctx.fillText(name, CX, py);
    ctx.restore();
  }

  /* ---------- assemblage ---------- */
  // faction : { name, color, type? } ; rarity : clé de RARITIES.
  function renderCard(faction, rarity, opts = {}) {
    const rar = RARITIES[rarity];
    const seed = opts.seed ?? 3;
    const L = R.createLayers();
    paintFond(L, faction, rar.rank);
    paintFrame(L, rar);
    ornaments(L, rar, faction, seed);
    emblem(L, rar, faction);
    rarityGem(L, rar);
    const lit = R.render(L, { wear: rar.wear, seed, bloom: rar.rank >= 5 ? 1.2 : 0.6, glint: 0.3 + 0.06 * rar.rank, portraitShadow: 0, dropShadow: 0, saturation: 0.82 });
    const out = document.createElement('canvas'); out.width = W; out.height = H;
    const ctx = out.getContext('2d');
    ctx.drawImage(lit, 0, 0);
    finish(ctx, out, rar, faction);
    return out;
  }

  root.Carte = { W, H, LAYOUT, RARITIES, ORDER, renderCard };
}(window));
