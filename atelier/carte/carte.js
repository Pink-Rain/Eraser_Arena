// Eraser Arena — fabrication d'une carte (fond, cadre, emblème), style moderne en aplats.
// Format 63 × 88 mm, rendu en 512 × 716 px, dessiné en canvas 2D : couleurs pleines,
// dégradés, lueurs et formes géométriques nettes. Aucun relief, aucune matière.
// - Cadre : couleur de la rareté ; ornements et lueur montent avec elle.
// - Fond : couleur de la faction ; motifs discrets selon la rareté.
// - Emblème : pastille à la couleur de la faction (symbole provisoire).
(function (root) {
  'use strict';
  const W = 512, H = 716, CX = W / 2, TAU = Math.PI * 2;

  /* ---------- gabarit ---------- */
  const LAYOUT = {
    card: { x0: 0, y0: 0, x1: W, y1: H, r: 24 },
    art: { x0: 16, y0: 16, x1: W - 16, y1: 458, r: 14 },
    banner: { x0: 40, y0: 436, x1: W - 40, y1: 482 },
    text: { x0: 16, y0: 492, x1: W - 16, y1: 668, r: 14 },
    emblem: { x: W - 50, y: 50, r: 27 },
    gem: { x: CX, y: 692 },
  };
  const rr = (b, inset = 0) => (ctx) => {
    const x0 = b.x0 + inset, y0 = b.y0 + inset, x1 = b.x1 - inset, y1 = b.y1 - inset, r = Math.max(0, b.r - inset);
    ctx.moveTo(x0 + r, y0); ctx.arcTo(x1, y0, x1, y1, r); ctx.arcTo(x1, y1, x0, y1, r); ctx.arcTo(x0, y1, x0, y0, r); ctx.arcTo(x0, y0, x1, y0, r); ctx.closePath();
  };
  const path = (ctx, ...parts) => { ctx.beginPath(); parts.forEach((p) => p(ctx)); };
  const poly = (ctx, pts) => { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); };

  /* ---------- raretés ---------- */
  // c : couleur principale ; hi / lo : extrémités du dégradé ; glow : lueur (0 à 1).
  const RARITIES = {
    trescommune: { label: 'Très commune', rank: 0, c: '#4a4e57', hi: '#6a6f79', lo: '#2c2f35', glow: 0 },
    commune: { label: 'Commune', rank: 1, c: '#9aa0aa', hi: '#c9ced6', lo: '#6c727c', glow: 0 },
    rare: { label: 'Rare', rank: 2, c: '#25a55a', hi: '#5fdc8f', lo: '#13703a', glow: 0.35 },
    superrare: { label: 'Super rare', rank: 3, c: '#2f72e0', hi: '#6fa8ff', lo: '#1b47a0', glow: 0.6 },
    epique: { label: 'Épique', rank: 4, c: '#8a3fe0', hi: '#c08bff', lo: '#5a1fa8', glow: 0.8 },
    legendaire: { label: 'Légendaire', rank: 5, c: '#e8a930', hi: '#ffe08a', lo: '#b06d10', glow: 1 },
  };
  const ORDER = ['trescommune', 'commune', 'rare', 'superrare', 'epique', 'legendaire'];

  /* ---------- couleurs ---------- */
  const hex = (c) => { const v = parseInt(c.slice(1), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; };
  const css = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  const lighten = (c, t) => c.map((v) => v + (255 - v) * t);
  const scale = (c, k) => c.map((v) => Math.min(255, v * k));
  const saturate = (c, k) => { const l = 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]; return c.map((v) => Math.max(0, Math.min(255, l + (v - l) * k))); };
  const withA = (h, a) => css(hex(h), a);

  /* ---------- fond (faction) ---------- */
  function drawFond(ctx, faction, rk) {
    const base = saturate(hex(faction.color), 1.2);
    const { art, text } = LAYOUT; const ay = (art.y0 + art.y1) / 2;
    // Portrait : halo de la couleur de faction sur fond très sombre.
    ctx.save(); path(ctx, rr(art)); ctx.clip();
    const g = ctx.createRadialGradient(CX, ay - 30, 10, CX, ay, 330);
    g.addColorStop(0, css(scale(base, 1.05))); g.addColorStop(0.55, css(scale(base, 0.55))); g.addColorStop(1, css(scale(base, 0.18)));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    pattern(ctx, rk, art, ay);
    ctx.restore();
    // Panneau du texte : la faction, en sombre.
    ctx.save(); path(ctx, rr(text)); ctx.clip();
    const t = ctx.createLinearGradient(0, text.y0, 0, text.y1);
    t.addColorStop(0, css(scale(base, 0.34))); t.addColorStop(1, css(scale(base, 0.16)));
    ctx.fillStyle = t; ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  // Motifs du fond, de plus en plus présents avec la rareté.
  function pattern(ctx, rk, box, ay) {
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    if (rk === 2 || rk === 3) {
      // Trame de losanges fins.
      ctx.strokeStyle = `rgba(255,255,255,${rk === 2 ? 0.05 : 0.08})`; ctx.lineWidth = 1;
      const s = rk === 2 ? 34 : 24;
      for (let k = -H; k < W + H; k += s) { ctx.beginPath(); ctx.moveTo(k, 0); ctx.lineTo(k + H, H); ctx.moveTo(k, H); ctx.lineTo(k + H, 0); ctx.stroke(); }
    }
    if (rk >= 4) {
      // Rayons partant du centre du portrait.
      const n = rk === 5 ? 20 : 14;
      for (let k = 0; k < n; k += 1) {
        const a = (k / n) * TAU; const w = TAU / n * 0.32;
        ctx.beginPath(); ctx.moveTo(CX, ay); ctx.arc(CX, ay, 520, a - w, a + w); ctx.closePath();
        const g = ctx.createRadialGradient(CX, ay, 0, CX, ay, 360);
        g.addColorStop(0, rk === 5 ? 'rgba(255,215,130,0.32)' : 'rgba(255,255,255,0.16)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.fill();
      }
    }
    if (rk === 5) {
      // Étincelles.
      let s = 7; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
      for (let k = 0; k < 90; k += 1) {
        const x = box.x0 + rnd() * (box.x1 - box.x0), y = box.y0 + rnd() * (box.y1 - box.y0), r = 0.6 + rnd() * 1.6;
        ctx.fillStyle = `rgba(255,230,170,${0.3 + rnd() * 0.6})`; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      }
    }
    ctx.restore();
  }

  /* ---------- cadre (rareté) ---------- */
  function frameGradient(ctx, rar) {
    if (rar.rank === 5) {
      // Or « holographique » : plusieurs bandes claires.
      const g = ctx.createLinearGradient(0, 0, W, H);
      [[0, '#fff0b0'], [0.18, '#e8a930'], [0.36, '#ffe9a0'], [0.55, '#c8821a'], [0.74, '#ffd970'], [1, '#a8640c']].forEach(([t, c]) => g.addColorStop(t, c));
      return g;
    }
    const g = ctx.createLinearGradient(0, 0, W * 0.6, H);
    g.addColorStop(0, rar.hi); g.addColorStop(0.45, rar.c); g.addColorStop(1, rar.lo);
    return g;
  }

  function drawFrame(ctx, rar) {
    const { card, art, text } = LAYOUT;
    // Bande pleine autour des deux fenêtres.
    path(ctx, rr(card), rr(art), rr(text));
    ctx.fillStyle = frameGradient(ctx, rar); ctx.fill('evenodd');
    // Liseré intérieur clair, liseré extérieur sombre.
    ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    path(ctx, rr(art, -2.5)); ctx.stroke(); path(ctx, rr(text, -2.5)); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; path(ctx, rr(card, 1)); ctx.stroke();
    // Lueur à l'intérieur des fenêtres.
    if (rar.glow) {
      [art, text].forEach((b) => {
        ctx.save(); path(ctx, rr(b)); ctx.clip();
        ctx.shadowColor = withA(rar.hi, 0.9 * rar.glow); ctx.shadowBlur = 18 + 10 * rar.glow;
        ctx.lineWidth = 6; ctx.strokeStyle = withA(rar.hi, 0.6 * rar.glow); path(ctx, rr(b, -3)); ctx.stroke();
        ctx.restore();
      });
    }
  }

  // Encoches triangulaires dans les coins du portrait (rare et plus).
  function cornerNotches(ctx, rar) {
    const { art } = LAYOUT; const s = rar.rank >= 4 ? 26 : 20;
    const corners = [[art.x0 - 2, art.y0 - 2, 1, 1], [art.x1 + 2, art.y0 - 2, -1, 1]];
    corners.forEach(([x, y, sx, sy]) => {
      poly(ctx, [[x, y], [x + s * sx, y], [x, y + s * sy]]);
      ctx.fillStyle = frameGradient(ctx, rar); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.2; ctx.stroke();
    });
  }

  // Petit losange coloré (pierre de rareté, version plate).
  function diamond(ctx, x, y, r, rar) {
    poly(ctx, [[x, y - r], [x + r * 0.8, y], [x, y + r], [x - r * 0.8, y]]);
    ctx.fillStyle = rar.lo; ctx.fill();
    poly(ctx, [[x, y - r], [x + r * 0.8, y], [x, y], [x - r * 0.8, y]]);
    ctx.fillStyle = rar.hi; ctx.fill();
    poly(ctx, [[x, y - r * 0.55], [x + r * 0.3, y - r * 0.1], [x, y], [x - r * 0.3, y - r * 0.1]]);
    ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fill();
  }

  // Crête au sommet (épique : chevron ; légendaire : couronne à trois pointes).
  function crest(ctx, rar) {
    const pts = rar.rank === 5
      ? [[CX - 70, 0], [CX + 70, 0], [CX + 48, 30], [CX + 26, 22], [CX, 44], [CX - 26, 22], [CX - 48, 30]]
      : [[CX - 50, 0], [CX + 50, 0], [CX + 26, 26], [CX, 36], [CX - 26, 26]];
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2;
    poly(ctx, pts); ctx.fillStyle = frameGradient(ctx, rar); ctx.fill();
    ctx.restore();
    poly(ctx, pts); ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.2; ctx.stroke();
    diamond(ctx, CX, rar.rank === 5 ? 20 : 16, rar.rank === 5 ? 12 : 10, { hi: '#ffffff', lo: rar.lo });
  }

  /* ---------- bandeau du nom ---------- */
  function drawBanner(ctx, rar, name) {
    const { x0, y0, x1, y1 } = LAYOUT.banner; const ym = (y0 + y1) / 2; const cut = rar.rank >= 4 ? 18 : 12;
    const pts = [[x0 + cut, y0], [x1 - cut, y0], [x1, ym], [x1 - cut, y1], [x0 + cut, y1], [x0, ym]];
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3;
    poly(ctx, pts); ctx.fillStyle = '#16131c'; ctx.fill(); ctx.restore();
    poly(ctx, pts); ctx.lineWidth = 2.5; ctx.strokeStyle = frameGradient(ctx, rar); ctx.stroke();
    if (rar.rank >= 4) { // ailettes
      [[x0, -1], [x1, 1]].forEach(([x, s]) => { poly(ctx, [[x + s * 2, ym - 13], [x + s * 22, ym], [x + s * 2, ym + 13], [x + s * 8, ym]]); ctx.fillStyle = frameGradient(ctx, rar); ctx.fill(); });
    }
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '700 22px "Cinzel", Georgia, serif';
    ctx.fillStyle = '#f7f1e6'; ctx.fillText(name, CX, ym + 1); ctx.restore();
  }

  /* ---------- emblème (faction) ---------- */
  function drawEmblem(ctx, rar, faction) {
    const { x, y, r } = LAYOUT.emblem; const fc = saturate(hex(faction.color), 1.2);
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = frameGradient(ctx, rar); ctx.fill(); ctx.restore();
    const g = ctx.createLinearGradient(x, y - r, x, y + r);
    g.addColorStop(0, css(lighten(fc, 0.15))); g.addColorStop(1, css(scale(fc, 0.6)));
    ctx.beginPath(); ctx.arc(x, y, r - 4, 0, TAU); ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.stroke();
    // Symbole provisoire : étoile à quatre branches.
    ctx.beginPath();
    for (let k = 0; k < 8; k += 1) { const a = -Math.PI / 2 + (k / 8) * TAU; const rad = k % 2 ? 4 : 13; const px = x + Math.cos(a) * rad, py = y + Math.sin(a) * rad; if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
    ctx.closePath(); ctx.fillStyle = '#ffffff'; ctx.fill();
  }

  /* ---------- texte et silhouette ---------- */
  function drawText(ctx, faction, opts) {
    const { text } = LAYOUT;
    ctx.save(); ctx.textAlign = 'center'; ctx.fillStyle = '#f2ece2';
    ctx.font = '600 13px "Alegreya Sans", system-ui, sans-serif'; ctx.globalAlpha = 0.7;
    ctx.fillText(((faction.type || 'Personnage') + ' · ' + faction.name).toUpperCase(), CX, text.y0 + 36);
    ctx.font = 'italic 18px "Alegreya", Georgia, serif'; ctx.globalAlpha = 0.9;
    ctx.fillText(opts.text || 'Ici viendra le texte de la carte.', CX, text.y0 + 90);
    ctx.restore();
  }
  function drawSilhouette(ctx) {
    const { art } = LAYOUT;
    ctx.save(); path(ctx, rr(art)); ctx.clip();
    ctx.fillStyle = 'rgba(8,6,10,0.85)';
    const sx = CX, sy = art.y1 - 16, s = 1.05; const P = (dx, dy) => [sx + dx * s, sy + dy * s];
    ctx.beginPath();
    ctx.moveTo(...P(-62, 30)); ctx.bezierCurveTo(...P(-60, -40), ...P(-42, -70), ...P(-20, -82));
    ctx.bezierCurveTo(...P(-34, -104), ...P(-26, -146), ...P(0, -152));
    ctx.bezierCurveTo(...P(26, -146), ...P(34, -104), ...P(20, -82));
    ctx.bezierCurveTo(...P(42, -70), ...P(60, -40), ...P(62, 30)); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  /* ---------- assemblage ---------- */
  // faction : { name, color, type? } ; rarity : clé de RARITIES ; opts : { name, text }.
  function renderCard(faction, rarity, opts = {}) {
    const rar = RARITIES[rarity];
    const out = document.createElement('canvas'); out.width = W; out.height = H;
    const ctx = out.getContext('2d');
    ctx.save(); path(ctx, rr(LAYOUT.card)); ctx.clip();
    ctx.fillStyle = '#0e0c12'; ctx.fillRect(0, 0, W, H);
    drawFond(ctx, faction, rar.rank);
    drawSilhouette(ctx);
    drawFrame(ctx, rar);
    if (rar.rank >= 2) cornerNotches(ctx, rar);
    if (rar.rank >= 3) [LAYOUT.art.x0 / 2, W - LAYOUT.art.x0 / 2].forEach((x) => diamond(ctx, x, (LAYOUT.art.y0 + LAYOUT.art.y1) / 2, 8, { hi: '#ffffff', lo: rar.lo }));
    if (rar.rank >= 4) crest(ctx, rar);
    drawBanner(ctx, rar, opts.name || faction.cardName || rar.label);
    drawEmblem(ctx, rar, faction);
    drawText(ctx, faction, opts);
    if (rar.rank === 0) { ctx.beginPath(); ctx.arc(LAYOUT.gem.x, LAYOUT.gem.y, 4, 0, TAU); ctx.fillStyle = '#25282e'; ctx.fill(); }
    else diamond(ctx, LAYOUT.gem.x, LAYOUT.gem.y, 11, rar.rank === 1 ? { hi: '#e6e9ee', lo: '#5d636c' } : { hi: lightHex(rar.hi), lo: rar.c });
    ctx.restore();
    return out;
  }
  const lightHex = (h) => css(lighten(hex(h), 0.35));

  root.Carte = { W, H, LAYOUT, RARITIES, ORDER, renderCard };
}(window));
