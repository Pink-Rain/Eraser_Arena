// Eraser Arena — fabrication d'une carte (fond, cadre, emblème), style TCG moderne.
// Format 63 × 88 mm, rendu en 512 × 716 px, avec le moteur de relief en mode « propre »
// (aucune usure, couleurs franches) : métal lisse, biseaux nets, reflets vifs.
// - Cadre : sa couleur est celle de la rareté ; ses ornements montent avec elle.
// - Fond : couleur de la faction ; reflets et motifs discrets selon la rareté.
// - Emblème : médaillon émaillé à la couleur de la faction (symbole provisoire).
(function (root) {
  'use strict';
  const R = root.Relief;
  const Hp = root.Helpers;
  const W = 512, H = 716;
  R.setSize(W, H);
  const { TAU, smooth, hex, getFields, sample } = R;
  const CX = W / 2;

  /* ---------- gabarit ---------- */
  const LAYOUT = {
    card: { x0: 3, y0: 3, x1: W - 3, y1: H - 3, r: 22 },
    art: { x0: 19, y0: 19, x1: W - 19, y1: 456, r: 13 },
    banner: { x0: 34, y0: 432, x1: W - 34, y1: 482, r: 10 },
    text: { x0: 28, y0: 492, x1: W - 28, y1: 664, r: 12 },
    emblem: { x: W - 52, y: 52, r: 30 },
    gem: { x: CX, y: 690 },
  };
  const rr = (b, inset = 0) => (ctx) => {
    const x0 = b.x0 + inset, y0 = b.y0 + inset, x1 = b.x1 - inset, y1 = b.y1 - inset, r = Math.max(0, b.r - inset);
    ctx.moveTo(x0 + r, y0); ctx.arcTo(x1, y0, x1, y1, r); ctx.arcTo(x1, y1, x0, y1, r); ctx.arcTo(x0, y1, x0, y0, r); ctx.arcTo(x0, y0, x1, y0, r); ctx.closePath();
  };
  const shape = (...parts) => (ctx) => { ctx.beginPath(); parts.forEach((p) => p(ctx)); };

  function maskCanvas(draw, rule = 'evenodd') {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; draw(ctx); ctx.fill(rule);
    return c;
  }
  // Masques et champs de distance, calculés une fois pour toutes les cartes.
  let cache = null;
  function geometry() {
    if (cache) return cache;
    const card = maskCanvas(shape(rr(LAYOUT.card)));
    const frame = maskCanvas(shape(rr(LAYOUT.card), rr(LAYOUT.art), rr(LAYOUT.text)));
    const banner = maskCanvas(shape(rr(LAYOUT.banner)));
    // Tout sauf les fenêtres : sert à mesurer la distance aux fenêtres (portrait, texte).
    const notWin = maskCanvas((ctx) => { ctx.beginPath(); ctx.rect(-10, -10, W + 20, H + 20); rr(LAYOUT.art)(ctx); rr(LAYOUT.text)(ctx); });
    cache = { card, frame, banner, Dout: R.distanceField(card), Dwin: R.distanceField(notWin), Dban: R.distanceField(banner) };
    return cache;
  }

  /* ---------- raretés : la couleur du cadre ---------- */
  const RARITIES = {
    trescommune: { label: 'Très commune', rank: 0, color: '#484c53', metal: 0.75, rough: 0.42, gem: null },
    commune: { label: 'Commune', rank: 1, color: '#979ca5', metal: 0.9, rough: 0.3, gem: { color: '#8d939c', cut: 'cabochon' } },
    rare: { label: 'Rare', rank: 2, color: '#21884a', metal: 0.85, rough: 0.26, gem: { color: '#33c46e', facets: 8 } },
    superrare: { label: 'Super rare', rank: 3, color: '#2860bf', metal: 0.85, rough: 0.24, gem: { color: '#3a8cff', facets: 8 } },
    epique: { label: 'Épique', rank: 4, color: '#7236c2', metal: 0.85, rough: 0.22, gem: { color: '#a456ff', facets: 8, glow: 'rgba(170,90,255,0.6)' } },
    legendaire: { label: 'Légendaire', rank: 5, color: '#cf9530', metal: 0.97, rough: 0.18, gem: { color: '#ffb428', facets: 10, glow: 'rgba(255,180,60,0.8)' } },
  };
  const ORDER = ['trescommune', 'commune', 'rare', 'superrare', 'epique', 'legendaire'];

  /* ---------- couleurs ---------- */
  const lighten = (c, t) => c.map((v) => v + (255 - v) * t);
  const scale = (c, k) => c.map((v) => Math.min(255, v * k));
  const css = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  const frac = (v) => v - Math.floor(v);
  const saturate = (c, k) => { const l = 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]; return c.map((v) => Math.max(0, Math.min(255, l + (v - l) * k))); };

  /* ---------- fond (faction) ---------- */
  // Sombre et sobre ; plus la rareté monte, plus il prend du reflet et du motif.
  // Peint à plat (sans l'éclairage du moteur, qui le délaverait) ; le cadre y projette son ombre.
  function fondCanvas(faction, rk) {
    const f = getFields();
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const cx = c.getContext('2d'); const img = cx.createImageData(W, H); const O = img.data;
    const mask = geometry().card.getContext('2d').getImageData(0, 0, W, H).data;
    const px = {};
    const base = saturate(hex(faction.color), 1.25);
    const artC = [CX, (LAYOUT.art.y0 + LAYOUT.art.y1) / 2];
    for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
      const q = (y * W + x) * 4; if (!mask[q + 3]) continue;
      const low = sample(f.low, x, y);
      const inArt = y < LAYOUT.art.y1 + 6;
      // Portrait : halo de la couleur de faction ; texte : panneau plus sombre.
      const dc = Math.hypot((x - artC[0]) / 1.1, y - artC[1]);
      let k = inArt ? 0.3 + 0.6 * (1 - smooth(30, 320, dc)) : 0.3 + 0.14 * (1 - (y - LAYOUT.text.y0) / 180);
      k *= 0.92 + 0.16 * low;
      let rgb = scale(base, k), h = 0.05, metal = 0, rough = 0.85;
      if (rk === 2) { // reflet brossé
        const s = frac((x * 0.7 + y) / 5); rgb = scale(rgb, 1 + 0.1 * Math.sin(s * TAU) + 0.12 * smooth(0.7, 1, Math.cos((x - y) * 0.004) )); rough = 0.6;
      } else if (rk === 3) { // trame hexagonale à peine visible
        const s = 22, q = (2 / 3 * x) / s, r = (-1 / 3 * x + Math.sqrt(3) / 3 * y) / s;
        const cz = -q - r; const dq = Math.abs(Math.round(q) - q), dr = Math.abs(Math.round(r) - r), dz = Math.abs(Math.round(cz) - cz);
        const line = smooth(0.42, 0.5, Math.max(dq, dr, dz));
        h += 0.012 * line; metal = 0.25 * line; rough = 0.45; rgb = scale(rgb, 1 + 0.25 * line);
      } else if (rk === 4) { // rayons doux et losanges satinés
        const a = Math.atan2(y - artC[1], x - artC[0]);
        const ray = smooth(0.4, 0.9, Math.cos(a * 14) * 0.5 + 0.5) * (1 - smooth(60, 340, dc));
        const u = frac((x + y) / 26), v = frac((x - y) / 26); const line = 1 - smooth(0.02, 0.07, Math.min(Math.abs(u - 0.5), Math.abs(v - 0.5)));
        rgb = scale(rgb, 1 + 0.5 * ray + 0.25 * line); metal = 0.2 + 0.3 * line; rough = 0.4; h += 0.01 * line;
      } else if (rk === 5) { // gloire dorée, paillettes
        const a = Math.atan2(y - artC[1], x - artC[0]);
        const ray = smooth(0.55, 0.95, Math.cos(a * 16) * 0.5 + 0.5) * (1 - smooth(40, 360, dc));
        rgb = rgb.map((c, i) => c + ([255, 200, 110][i] * 0.4 - c) * ray * 0.45);
        metal = 0.25; rough = 0.35;
        const fine = sample(f.fine, x * 2.3, y * 2.3);
        if (fine > 0.9) { rgb = [255, 226, 160]; metal = 1; rough = 0.12; h += 0.01; }
        rgb = rgb.map((v, i) => v + [255, 190, 90][i] * 0.1 * ray);
      }
      // Les parties « métalliques » du motif prennent un léger reflet.
      if (metal > 0.05) rgb = lighten(rgb, 0.25 * metal);
      O[q] = rgb[0]; O[q + 1] = rgb[1]; O[q + 2] = rgb[2]; O[q + 3] = mask[q + 3];
    }
    cx.putImageData(img, 0, 0);
    return c;
  }

  /* ---------- cadre (rareté) ---------- */
  function metalOf(rar, t = 0) { const c = hex(rar.color); return t ? lighten(c, t) : c; }
  const mat = (rar, extra = {}) => ({ albedo: rar.color, kind: 'plain', metal: rar.metal, rough: rar.rough, ...extra });

  function paintFrame(L, rar) {
    const g = geometry(); const col = metalOf(rar); const dark = scale(col, 0.55);
    L.paint(g.frame, (x, y, px) => {
      const i = y * W + x; const dout = g.Dout[i], dwin = g.Dwin[i];
      // Bord extérieur arrondi, gorge puis filet brillant le long des fenêtres.
      let h = 0.34 + 0.3 * Math.sqrt(smooth(0, 8, dout)) * smooth(0, 3, dwin);
      const fillet = 1 - smooth(0.6, 2.2, Math.abs(dwin - 3.2));
      const groove = 1 - smooth(0.8, 2.4, Math.abs(dwin - 6.6));
      h += 0.08 * fillet - 0.07 * groove;
      px.h = h; px.hMode = 'set';
      px.rgb = groove > 0.5 ? dark : sheen(col, x, y, dout, fillet); px.metal = rar.metal; px.rough = rar.rough; px.kind = 'plain';
    });
  }
  // Dégradé de métal façon jeu : plus clair en haut, une traînée de lumière en diagonale,
  // bord extérieur assombri, filet intérieur éclairci.
  function sheen(col, x, y, dout = 10, fillet = 0) {
    const u = (x * 0.75 + y) / (W * 0.75 + H);
    const streak = Math.exp(-(((u - 0.22) / 0.05) ** 2)) + 0.6 * Math.exp(-(((u - 0.78) / 0.06) ** 2));
    let k = (0.72 + 0.42 * (1 - y / H) + 0.35 * streak) * (0.62 + 0.38 * smooth(0, 5, dout));
    const c = scale(col, k);
    return fillet ? lighten(c, 0.4 * fillet) : c;
  }

  function paintBanner(L, rar) {
    const g = geometry(); const col = metalOf(rar, 0.05);
    L.paint(g.banner, (x, y, px) => {
      const d = g.Dban[y * W + x];
      // Liseré métallique de 7 px, panneau sombre au centre.
      const rim = 1 - smooth(6, 8, d);
      px.h = 0.5 + 0.18 * Math.sqrt(smooth(0, 5, d)) * rim + (1 - rim) * 0.6; px.hMode = 'set';
      if (rim > 0.5) { px.rgb = sheen(col, x, y, d); px.metal = rar.metal; px.rough = rar.rough; }
      else { px.rgb = [22, 18, 26]; px.metal = 0.1; px.rough = 0.5; }
      px.kind = 'plain';
    });
  }

  // Petite plaque à pans coupés posée dans un coin.
  function cornerCap(L, rar, x, y, sx, sy, size) {
    const pts = [[0, 0], [size, 0], [size, size * 0.32], [size * 0.32, size], [0, size]].map(([px, py]) => [x + px * sx, y + py * sy]);
    L.fill(Hp.poly(pts), { ...mat(rar, { albedo: css(metalOf(rar, 0.12)) }), height: 0.72, op: 'source-over' });
    L.engrave(Hp.poly(pts.map(([px, py]) => [x + (px - x) * 0.62 + 3 * sx, y + (py - y) * 0.62 + 3 * sy])), 1.4, 0.25);
  }

  // Crête au sommet : arc pointu (épique) ou couronne (légendaire), avec une pierre.
  function crest(L, rar) {
    const m = mat(rar, { albedo: css(metalOf(rar, 0.08)) });
    if (rar.rank === 4) {
      const pts = [[CX - 46, 3], [CX - 30, 3], [CX - 16, -2], [CX, 2], [CX + 16, -2], [CX + 30, 3], [CX + 46, 3], [CX + 30, 22], [CX, 34], [CX - 30, 22]];
      L.fill(Hp.smoothPath(pts, true), { ...m, height: R.linearStyle(0, 0, 0, 34, [[0, 0.7], [1, 0.82]]), op: 'source-over' });
      Hp.gem(L, CX, 18, 9, { ...rar.gem, setKind: 'plain', setAlbedo: rar.color, base: 0.82 });
    } else {
      // Couronne : trois pointes, la pierre au centre.
      const crown = [[CX - 62, 3], [CX - 44, 3], [CX - 34, -4], [CX - 22, 6], [CX, -6], [CX + 22, 6], [CX + 34, -4], [CX + 44, 3], [CX + 62, 3], [CX + 40, 26], [CX, 40], [CX - 40, 26]];
      L.fill(Hp.poly(crown), { ...m, height: 0.76, op: 'source-over' });
      L.engrave(Hp.poly(crown.map(([x, y]) => [CX + (x - CX) * 0.8, 6 + (y - 6) * 0.72])), 1.4, 0.22);
      Hp.gem(L, CX, 20, 11, { ...rar.gem, setKind: 'plain', setAlbedo: rar.color, base: 0.86, prongs: 4 });
      [-1, 1].forEach((s) => Hp.gem(L, CX + s * 34, 13, 4.5, { ...rar.gem, glow: null, cut: 'cabochon', setting: 2, setKind: 'plain', setAlbedo: rar.color, base: 0.84 }));
    }
  }

  // Ailes de part et d'autre du bandeau du nom.
  function bannerWings(L, rar) {
    const y = (LAYOUT.banner.y0 + LAYOUT.banner.y1) / 2; const m = mat(rar, { albedo: css(metalOf(rar, 0.06)) });
    [-1, 1].forEach((s) => {
      const x = s < 0 ? LAYOUT.banner.x0 + 4 : LAYOUT.banner.x1 - 4;
      const pts = [[x, y - 20], [x + s * 18, y - 30], [x + s * 10, y - 10], [x + s * 24, y], [x + s * 10, y + 10], [x + s * 18, y + 30], [x, y + 20]];
      L.fill(Hp.smoothPath(pts, true), { ...m, height: 0.66, op: 'source-over' });
    });
  }

  function ornaments(L, rar) {
    const rk = rar.rank; const { art } = LAYOUT;
    if (rk >= 2) {
      cornerCap(L, rar, art.x0 - 6, art.y0 - 6, 1, 1, rk >= 4 ? 30 : 24);
      cornerCap(L, rar, art.x1 + 6, art.y0 - 6, -1, 1, rk >= 4 ? 30 : 24);
      cornerCap(L, rar, LAYOUT.text.x0 - 6, LAYOUT.text.y1 + 6, 1, -1, 22);
      cornerCap(L, rar, LAYOUT.text.x1 + 6, LAYOUT.text.y1 + 6, -1, -1, 22);
    }
    if (rk >= 3) {
      const y = (art.y0 + art.y1) / 2;
      [11, W - 11].forEach((x) => Hp.gem(L, x, y, 6.5, { ...rar.gem, glow: null, setKind: 'plain', setAlbedo: rar.color, base: 0.6, setting: 3 }));
    }
    if (rk >= 4) { crest(L, rar); bannerWings(L, rar); }
  }

  /* ---------- emblème (faction) ---------- */
  function emblem(L, rar, faction) {
    const { x, y, r } = LAYOUT.emblem;
    L.torus(x, y, r, r, 0, 0.22, { ...mat(rar), base: 0.62, peak: 0.95, op: 'source-over' });
    const enamel = saturate(hex(faction.color), 1.2);
    L.fill(Hp.circle(r * 0.79, x, y), { albedo: (ctx) => { const g = ctx.createRadialGradient(x - 7, y - 9, 0, x, y, r * 0.85); g.addColorStop(0, css(lighten(enamel, 0.3))); g.addColorStop(1, css(scale(enamel, 0.55))); return g; }, height: 0.74, kind: 'glass', metal: 0, rough: 0.06, op: 'source-over' });
    // Symbole provisoire.
    const star = (ctx) => { ctx.beginPath(); for (let k = 0; k < 8; k += 1) { const a = -Math.PI / 2 + (k / 8) * TAU; const rad = k % 2 ? 4.4 : 14; const px = x + Math.cos(a) * rad, py = y + Math.sin(a) * rad; if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py); } ctx.closePath(); };
    L.fill(star, { albedo: '#f2ead8', kind: 'plain', metal: 0.6, rough: 0.3, height: 0.8, op: 'source-over' });
  }

  function rarityGem(L, rar) {
    const { x, y } = LAYOUT.gem;
    if (!rar.gem) { L.dome(x, y, 7, { albedo: '#3a3d43', kind: 'plain', metal: 0.7, rough: 0.4, base: 0.5, peak: 0.75 }); return; }
    Hp.gem(L, x, y, rar.rank >= 4 ? 11 : 9.5, { ...rar.gem, setKind: 'plain', setAlbedo: rar.color, base: 0.55, prongs: rar.rank >= 3 ? 4 : 0 });
  }

  /* ---------- finitions (nom, texte, silhouette) ---------- */
  function finish(ctx, rar, faction, opts) {
    const { art, text, banner } = LAYOUT;
    // Silhouette provisoire.
    ctx.save(); ctx.beginPath(); rr(art)(ctx); ctx.clip();
    ctx.filter = 'blur(1.4px)'; ctx.fillStyle = 'rgba(6,5,8,0.72)';
    const sx = CX, sy = art.y1 - 20, s = 1.05; const P = (dx, dy) => [sx + dx * s, sy + dy * s];
    ctx.beginPath();
    ctx.moveTo(...P(-60, 30)); ctx.bezierCurveTo(...P(-58, -40), ...P(-40, -70), ...P(-20, -82));
    ctx.bezierCurveTo(...P(-34, -104), ...P(-26, -146), ...P(0, -152));
    ctx.bezierCurveTo(...P(26, -146), ...P(34, -104), ...P(20, -82));
    ctx.bezierCurveTo(...P(40, -70), ...P(58, -40), ...P(60, 30)); ctx.closePath(); ctx.fill();
    ctx.filter = 'none';
    const fade = ctx.createLinearGradient(0, art.y1 - 90, 0, art.y1);
    fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = fade; ctx.fillRect(art.x0, art.y1 - 90, art.x1 - art.x0, 90);
    ctx.restore();
    // Texte de la carte.
    ctx.save(); ctx.textAlign = 'center'; ctx.fillStyle = '#efe7d8';
    ctx.font = '600 14px "Alegreya Sans", system-ui, sans-serif'; ctx.globalAlpha = 0.75;
    ctx.fillText(((faction.type || 'Personnage') + ' · ' + faction.name).toUpperCase(), CX, text.y0 + 40);
    ctx.font = 'italic 18px "Alegreya", Georgia, serif'; ctx.globalAlpha = 0.85;
    ctx.fillText(opts.text || 'Ici viendra le texte de la carte.', CX, text.y0 + 92);
    ctx.restore();
    // Nom dans le bandeau.
    const name = opts.name || faction.cardName || rar.label;
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '700 22px "Cinzel", Georgia, serif';
    const py = (banner.y0 + banner.y1) / 2 + 1;
    ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 4; ctx.shadowOffsetY = 1;
    ctx.fillStyle = '#f6efe2'; ctx.fillText(name, CX, py);
    ctx.restore();
  }

  /* ---------- assemblage ---------- */
  // faction : { name, color, type? } ; rarity : clé de RARITIES ; opts : { name, text, seed }.
  function renderCard(faction, rarity, opts = {}) {
    const rar = RARITIES[rarity];
    const L = R.createLayers();
    paintFrame(L, rar);
    paintBanner(L, rar);
    ornaments(L, rar);
    emblem(L, rar, faction);
    rarityGem(L, rar);
    const lit = R.render(L, {
      seed: opts.seed ?? 3, wear: 0, grain: 0.008, saturation: 1.02, tint: [1, 1, 1], contrast: 1.06, lift: 0,
      lights: [{ dir: [-0.45, -0.65, 0.62], color: [1.62, 1.58, 1.52] }, { dir: [0.7, 0.45, 0.55], color: [0.22, 0.24, 0.3], shadow: false }],
      ambient: [0.06, 0.06, 0.065], room: [0.34, 0.33, 0.33], envKey: 0.9,
      bloom: rar.rank >= 4 ? 1.1 : 0.5, glint: 0.25 + 0.05 * rar.rank, portraitShadow: 0.7, dropShadow: 0.7, inside: () => true, shadow: 0.7,
    });
    const out = document.createElement('canvas'); out.width = W; out.height = H;
    const ctx = out.getContext('2d');
    ctx.drawImage(fondCanvas(faction, rar.rank), 0, 0);
    if (lit.shadow) { ctx.save(); ctx.beginPath(); rr(LAYOUT.card)(ctx); ctx.clip(); ctx.filter = 'blur(2px)'; ctx.drawImage(lit.shadow, 0, 0); ctx.restore(); }
    ctx.drawImage(lit, 0, 0);
    finish(ctx, rar, faction, opts);
    return out;
  }

  root.Carte = { W, H, LAYOUT, RARITIES, ORDER, renderCard };
}(window));
