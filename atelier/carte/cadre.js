// Eraser Arena — le cadre seul.
// Base noire ; la couleur de la rareté n'apparaît qu'en touches : liserés et ornements.
// Plus la carte est commune, plus le cadre est fin et sobre ; plus elle est rare,
// plus il s'élargit et se couvre de petits filigranes fins.
(function (root) {
  'use strict';
  const W = 512, H = 716, CX = W / 2, TAU = Math.PI * 2;
  const SW = 1.6; // épaisseur des filigranes

  /* ---------- raretés ---------- */
  // t : épaisseur du cadre ; corner : taille des ornements d'angle (0 = aucun) ;
  // double : second liseré ; glow : halo des touches de couleur.
  const RARITIES = {
    trescommune: { label: 'Très commune', rank: 0, c: '#7a7f88', lite: '#979ca4', t: 10, corner: 17, double: false, glow: 0 },
    commune: { label: 'Commune', rank: 1, c: '#a9afb8', lite: '#d2d6dc', t: 12, corner: 22, double: false, glow: 0 },
    rare: { label: 'Rare', rank: 2, c: '#3dbf72', lite: '#8ae6ad', t: 14, corner: 26, double: false, glow: 0.3 },
    superrare: { label: 'Super rare', rank: 3, c: '#4a8bff', lite: '#9cc0ff', t: 16, corner: 40, double: true, glow: 0.5 },
    epique: { label: 'Épique', rank: 4, c: '#a565ff', lite: '#d2b0ff', t: 19, corner: 58, double: true, glow: 0.7 },
    legendaire: { label: 'Légendaire', rank: 5, c: '#e3ad48', lite: '#ffe7a6', t: 22, corner: 78, double: true, glow: 1 },
  };
  const ORDER = ['trescommune', 'commune', 'rare', 'superrare', 'epique', 'legendaire'];

  /* ---------- géométrie ---------- */
  const CARD = { x0: 0, y0: 0, x1: W, y1: H, r: 22 };
  function windows(rar) {
    const t = rar.t, mid = 458;
    return {
      art: { x0: t, y0: t, x1: W - t, y1: mid - t / 2, r: 10 },
      text: { x0: t, y0: mid + t / 2, x1: W - t, y1: H - t, r: 10 },
    };
  }
  const rr = (b, inset = 0) => (ctx) => {
    const x0 = b.x0 + inset, y0 = b.y0 + inset, x1 = b.x1 - inset, y1 = b.y1 - inset, r = Math.max(0, b.r - inset);
    ctx.moveTo(x0 + r, y0); ctx.arcTo(x1, y0, x1, y1, r); ctx.arcTo(x1, y1, x0, y1, r); ctx.arcTo(x0, y1, x0, y0, r); ctx.arcTo(x0, y0, x1, y0, r); ctx.closePath();
  };
  const path = (ctx, ...parts) => { ctx.beginPath(); parts.forEach((p) => p(ctx)); };

  /* ---------- tracés fins ---------- */
  // Trait calligraphique : épaisseur qui varie le long du tracé.
  function taper(ctx, pts, w0, w1) {
    for (let i = 1; i < pts.length; i += 1) {
      const t = i / (pts.length - 1);
      ctx.lineWidth = (w0 + (w1 - w0) * t) * SW;
      ctx.beginPath(); ctx.moveTo(pts[i - 1][0], pts[i - 1][1]); ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke();
    }
  }
  // Volute : spirale qui part de (x, y) dans la direction a0 et s'enroule (sens = ±1).
  function curlPts(x, y, a0, r, turns, sens) {
    const pts = []; const n = 40;
    // Centre de la spirale, à gauche ou à droite de la direction de départ.
    const cx = x + Math.cos(a0 + sens * Math.PI / 2) * r, cy = y + Math.sin(a0 + sens * Math.PI / 2) * r;
    const start = a0 - sens * Math.PI / 2;
    for (let i = 0; i <= n; i += 1) {
      const t = i / n; const rad = r * (1 - 0.72 * t);
      const a = start + sens * turns * TAU * t;
      pts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]);
    }
    return pts;
  }
  function bezier(p0, p1, p2, p3, n = 24) {
    const out = [];
    for (let i = 0; i <= n; i += 1) { const t = i / n, u = 1 - t; out.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]); }
    return out;
  }
  // Feuille effilée de (x, y) vers l'angle a, longueur l, largeur w.
  function leaf(ctx, x, y, a, l, w) {
    const tx = x + Math.cos(a) * l, ty = y + Math.sin(a) * l, nx = -Math.sin(a) * w, ny = Math.cos(a) * w;
    const mx = x + Math.cos(a) * l * 0.45, my = y + Math.sin(a) * l * 0.45;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(mx + nx, my + ny, tx, ty); ctx.quadraticCurveTo(mx - nx, my - ny, x, y); ctx.fill();
  }
  const dot = (ctx, x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r * SW, 0, TAU); ctx.fill(); };
  function diamond(ctx, x, y, r, fill, line) {
    ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.62, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r * 0.62, y); ctx.closePath();
    ctx.fillStyle = fill; ctx.fill(); if (line) { ctx.lineWidth = 1; ctx.strokeStyle = line; ctx.stroke(); }
  }

  /* ---------- ornements ---------- */
  // Moitié d'un ornement d'angle, le long du bord horizontal ; l'angle est en (0, 0),
  // l'intérieur de la fenêtre vers +x / +y. On la trace puis on la reflète sur la diagonale.
  function cornerHalf(ctx, rar, L) {
    const rk = rar.rank; const d = 4.5;
    if (rk === 0) { taper(ctx, [[d, d], [L * 0.75, d]], 0.9, 0.45); return; } // simple trait
    if (rk === 1) { taper(ctx, [[d, d], [L * 0.7, d]], 1, 0.5); dot(ctx, L * 0.85, d, 0.7); return; } // trait et point
    // Équerre fine le long du bord.
    taper(ctx, [[d, d], [L * 0.62, d]], 1.6, 0.7);
    // Volute au bout de l'équerre, qui s'enroule vers l'intérieur.
    taper(ctx, curlPts(L * 0.62, d, 0, L * 0.09, 1.1, 1), 0.9, 0.5);
    if (rk >= 4) {
      // Rinceau en S qui part de l'angle et finit en volute.
      const s = bezier([d + 2, d + 2], [L * 0.3, d + 1], [L * 0.32, L * 0.24], [L * 0.52, L * 0.2]);
      taper(ctx, s, 1.3, 0.8);
      taper(ctx, curlPts(L * 0.52, L * 0.2, -0.2, L * 0.07, 1.2, -1), 0.8, 0.4);
      leaf(ctx, L * 0.3, L * 0.14, -0.55, L * 0.16, L * 0.035);
    }
    if (rk >= 5) {
      // Second rinceau plus long, perles le long de l'équerre, petite feuille au bout.
      const s2 = bezier([L * 0.2, L * 0.24], [L * 0.38, L * 0.42], [L * 0.7, L * 0.12], [L * 0.92, L * 0.1]);
      taper(ctx, s2, 1.1, 0.5);
      taper(ctx, curlPts(L * 0.92, L * 0.1, -0.1, L * 0.05, 1.3, 1), 0.6, 0.35);
      for (let k = 0; k < 4; k += 1) dot(ctx, L * (0.7 + k * 0.07), d, 1.1 - k * 0.18);
      leaf(ctx, L * 0.66, L * 0.28, 0.5, L * 0.12, L * 0.03);
    }
  }
  function corner(ctx, rar, x, y, sx, sy) {
    const L = rar.corner; if (!L) return;
    ctx.save(); ctx.translate(x, y); ctx.scale(sx, sy);
    cornerHalf(ctx, rar, L);
    ctx.save(); ctx.transform(0, 1, 1, 0, 0, 0); cornerHalf(ctx, rar, L); ctx.restore();
    // Cœur de l'angle : point (rare), losange (super rare), fleuron (épique et plus).
    if (rar.rank === 0) dot(ctx, 5, 5, 1);
    if (rar.rank === 1 || rar.rank === 2) { ctx.save(); ctx.translate(rar.rank === 1 ? 7 : 9, rar.rank === 1 ? 7 : 9); ctx.rotate(Math.PI / 4); diamond(ctx, 0, 0, rar.rank === 1 ? 3.5 : 5, ctx.fillStyle); ctx.restore(); }
    if (rar.rank >= 3) {
      if (rar.rank >= 4) { leaf(ctx, 6, 6, Math.PI / 4, L * 0.32, L * 0.06); leaf(ctx, 6, 6, Math.PI / 4 - 0.5, L * 0.2, L * 0.04); leaf(ctx, 6, 6, Math.PI / 4 + 0.5, L * 0.2, L * 0.04); }
      else { ctx.save(); ctx.translate(10, 10); ctx.rotate(Math.PI / 4); diamond(ctx, 0, 0, 6, ctx.fillStyle); ctx.restore(); }
    }
    ctx.restore();
  }

  // Ornement au milieu d'un bord : losange (super rare), losange et volutes (épique),
  // médaillon de rinceaux (légendaire). (x, y) au centre ; l'ornement se déploie le long de l'axe a.
  // side : ornement d'un bord latéral (seulement à partir de rare).
  function midOrnament(ctx, rar, x, y, a, side = false) {
    const rk = rar.rank; if (side && rk < 2) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    if (rk === 0) { dot(ctx, 0, 0, 1.2); [1, -1].forEach((s) => dot(ctx, s * 7, 0, 0.6)); ctx.restore(); return; }
    if (rk === 1) { diamond(ctx, 0, 0, 4, ctx.fillStyle); ctx.restore(); return; }
    if (rk === 2) { diamond(ctx, 0, 0, 5.5, ctx.fillStyle); [1, -1].forEach((s) => dot(ctx, s * 10, 0, 0.8)); ctx.restore(); return; }
    if (rk === 3) { [1, -1].forEach((s) => taper(ctx, [[s * 9, 0], [s * 26, 0]], 1, 0.3)); [1, -1].forEach((s) => dot(ctx, s * 31, 0, 0.8)); }
    if (rk >= 4) {
      const L = rk === 5 ? 66 : 44;
      [1, -1].forEach((s) => {
        taper(ctx, bezier([s * 6, 0], [s * L * 0.35, 0], [s * L * 0.5, -L * 0.22], [s * L * 0.7, -L * 0.12]), 1.2, 0.6);
        taper(ctx, curlPts(s * L * 0.7, -L * 0.12, s > 0 ? 0.3 : Math.PI - 0.3, L * 0.1, 1.1, s), 0.7, 0.35);
        if (rk === 5) {
          taper(ctx, bezier([s * 8, 2], [s * L * 0.4, 6], [s * L * 0.62, 10], [s * L * 0.95, 2]), 0.9, 0.4);
          dot(ctx, s * L * 1.02, 2, 1.3);
          leaf(ctx, s * L * 0.42, -2, s > 0 ? -0.9 : Math.PI + 0.9, L * 0.2, L * 0.04);
        }
      });
    }
    diamond(ctx, 0, 0, rk === 5 ? 10 : 7.5, ctx.fillStyle, 'rgba(255,255,255,0.55)');
    ctx.restore();
  }

  /* ---------- cadre ---------- */
  function touchStyle(ctx, rar) {
    if (rar.rank === 5) {
      const g = ctx.createLinearGradient(0, 0, W, H);
      [[0, '#fff0bd'], [0.25, '#e3ad48'], [0.5, '#ffe39a'], [0.75, '#c88a2a'], [1, '#f6d27a']].forEach(([t, c]) => g.addColorStop(t, c));
      return g;
    }
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, rar.lite); g.addColorStop(1, rar.c);
    return g;
  }

  function drawFrame(ctx, rar) {
    const { art, text } = windows(rar);
    // Base noire, légèrement dégradée.
    path(ctx, rr(CARD), rr(art), rr(text));
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1a191e'); g.addColorStop(1, '#08080a');
    ctx.fillStyle = g; ctx.fill('evenodd');

    const touch = touchStyle(ctx, rar);
    ctx.save();
    ctx.strokeStyle = touch; ctx.fillStyle = touch; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (rar.glow) { ctx.shadowColor = rar.c; ctx.shadowBlur = 3 + 5 * rar.glow; }
    // Liseré extérieur, très fin.
    ctx.globalAlpha = rar.rank <= 1 ? 0.55 : 0.8; ctx.lineWidth = 1; path(ctx, rr(CARD, 3.5)); ctx.stroke(); ctx.globalAlpha = 1;
    // Liseré autour des fenêtres, doublé à partir de super rare.
    ctx.lineWidth = rar.rank <= 1 ? 1 : 1.4;
    [art, text].forEach((b) => { path(ctx, rr(b, -2)); ctx.stroke(); });
    if (rar.double) { ctx.lineWidth = 0.8; ctx.globalAlpha = 0.7; [art, text].forEach((b) => { path(ctx, rr(b, -5.5)); ctx.stroke(); }); ctx.globalAlpha = 1; }
    // Ornements d'angle sur les fenêtres (texte : à partir d'épique).
    const k = 1;
    corner(ctx, rar, art.x0 + k, art.y0 + k, 1, 1); corner(ctx, rar, art.x1 - k, art.y0 + k, -1, 1);
    corner(ctx, rar, art.x0 + k, art.y1 - k, 1, -1); corner(ctx, rar, art.x1 - k, art.y1 - k, -1, -1);
    if (rar.rank >= 4) {
      const small = { ...rar, corner: rar.corner * 0.7 };
      corner(ctx, small, text.x0 + k, text.y0 + k, 1, 1); corner(ctx, small, text.x1 - k, text.y0 + k, -1, 1);
      corner(ctx, small, text.x0 + k, text.y1 - k, 1, -1); corner(ctx, small, text.x1 - k, text.y1 - k, -1, -1);
    }
    // Ornements au milieu des bords.
    midOrnament(ctx, rar, CX, rar.t / 2, 0);
    midOrnament(ctx, rar, CX, H - rar.t / 2, Math.PI);
    midOrnament(ctx, rar, rar.t / 2, (art.y0 + art.y1) / 2, -Math.PI / 2, true);
    midOrnament(ctx, rar, W - rar.t / 2, (art.y0 + art.y1) / 2, Math.PI / 2, true);
    if (rar.rank >= 4) midOrnament(ctx, rar, CX, (art.y1 + text.y0) / 2, 0);
    ctx.restore();
  }

  /* ---------- fond de faction (simple) ---------- */
  const hex = (c) => { const v = parseInt(c.slice(1), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; };
  const rgb = (c, k) => `rgb(${Math.min(255, c[0] * k) | 0},${Math.min(255, c[1] * k) | 0},${Math.min(255, c[2] * k) | 0})`;
  // Portrait : la couleur de la faction au centre, qui s'assombrit vers les bords.
  // Texte : la même couleur, plus sombre, pour la lisibilité.
  function drawFond(ctx, rar, faction) {
    const { art, text } = windows(rar);
    if (!faction) {
      const ga = ctx.createLinearGradient(0, art.y0, 0, art.y1); ga.addColorStop(0, '#5a5961'); ga.addColorStop(1, '#3b3a41');
      ctx.fillStyle = ga; path(ctx, rr(art)); ctx.fill();
      ctx.fillStyle = '#2f2e34'; path(ctx, rr(text)); ctx.fill();
      return;
    }
    const c = hex(faction.color); const ay = (art.y0 + art.y1) / 2;
    const g = ctx.createRadialGradient(CX, ay - 40, 10, CX, ay, 340);
    g.addColorStop(0, rgb(c, 1.1)); g.addColorStop(0.6, rgb(c, 0.7)); g.addColorStop(1, rgb(c, 0.35));
    ctx.fillStyle = g; path(ctx, rr(art)); ctx.fill();
    const t = ctx.createLinearGradient(0, text.y0, 0, text.y1);
    t.addColorStop(0, rgb(c, 0.34)); t.addColorStop(1, rgb(c, 0.2));
    ctx.fillStyle = t; path(ctx, rr(text)); ctx.fill();
  }

  // Le cadre sur le fond de la faction (ou sur des fenêtres grises si aucune faction).
  function renderFrame(rarity, faction) {
    const rar = RARITIES[rarity];
    const out = document.createElement('canvas'); out.width = W; out.height = H;
    const ctx = out.getContext('2d');
    ctx.save(); path(ctx, rr(CARD)); ctx.clip();
    drawFond(ctx, rar, faction);
    drawFrame(ctx, rar);
    ctx.restore();
    return out;
  }

  /* ---------- la carte complète : nom, catégorie, capacité, citation, attaque, vie ---------- */
  // Retour à la ligne d'un texte dans une largeur donnée ; renvoie les lignes.
  function wrap(ctx, str, maxW) {
    const words = String(str).split(/\s+/); const lines = []; let cur = '';
    for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
    if (cur) lines.push(cur);
    return lines;
  }

  // Bandeau du nom : plaque noire à bouts pointus, liseré et petits losanges de la rareté.
  function drawNameBanner(ctx, rar, name, cy) {
    const hw = 176, hh = 21, tip = 16;
    const pts = [[CX - hw, cy], [CX - hw + tip, cy - hh], [CX + hw - tip, cy - hh], [CX + hw, cy], [CX + hw - tip, cy + hh], [CX - hw + tip, cy + hh]];
    const poly = () => { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); };
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3;
    poly(); const g = ctx.createLinearGradient(0, cy - hh, 0, cy + hh); g.addColorStop(0, '#1d1c22'); g.addColorStop(1, '#09090b'); ctx.fillStyle = g; ctx.fill();
    ctx.restore();
    const touch = touchStyle(ctx, rar);
    ctx.save(); ctx.strokeStyle = touch; ctx.fillStyle = touch; ctx.lineJoin = 'round';
    if (rar.glow) { ctx.shadowColor = rar.c; ctx.shadowBlur = 2 + 4 * rar.glow; }
    poly(); ctx.lineWidth = 1.6; ctx.stroke();
    [-1, 1].forEach((s) => diamond(ctx, CX + s * (hw - 1), cy, 5.5, touch));
    ctx.restore();
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    let size = 24; ctx.font = `700 ${size}px "Cinzel", Georgia, serif`;
    while (ctx.measureText(name).width > hw * 2 - tip * 2 - 16 && size > 14) { size -= 1; ctx.font = `700 ${size}px "Cinzel", Georgia, serif`; }
    ctx.fillStyle = '#f7f1e6'; ctx.fillText(name, CX, cy + 1);
    ctx.restore();
  }

  // Pastille de stat dans un coin du bas : disque noir, anneau de la rareté, icône et chiffre.
  function drawStat(ctx, rar, x, y, value, icon) {
    const r = 27;
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); const g = ctx.createLinearGradient(0, y - r, 0, y + r); g.addColorStop(0, '#1f1e24'); g.addColorStop(1, '#08080a'); ctx.fillStyle = g; ctx.fill();
    ctx.restore();
    const touch = touchStyle(ctx, rar);
    ctx.save(); ctx.strokeStyle = touch; if (rar.glow) { ctx.shadowColor = rar.c; ctx.shadowBlur = 2 + 4 * rar.glow; }
    ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r - 1.5, 0, TAU); ctx.stroke();
    ctx.lineWidth = 0.8; ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.arc(x, y, r - 5, 0, TAU); ctx.stroke();
    ctx.restore();
    // Icône discrète derrière le chiffre.
    ctx.save(); ctx.translate(x, y); ctx.fillStyle = 'rgba(255,255,255,0.13)'; ctx.strokeStyle = 'rgba(255,255,255,0.13)';
    if (icon === 'attaque') { // épée
      ctx.rotate(-Math.PI / 4); ctx.beginPath(); ctx.moveTo(0, -17); ctx.lineTo(3.2, -12); ctx.lineTo(3.2, 7); ctx.lineTo(-3.2, 7); ctx.lineTo(-3.2, -12); ctx.closePath(); ctx.fill();
      ctx.fillRect(-9, 7, 18, 3.4); ctx.fillRect(-1.8, 10, 3.6, 7);
    } else { // cœur
      ctx.beginPath(); ctx.moveTo(0, 15); ctx.bezierCurveTo(-20, 2, -14, -16, 0, -6); ctx.bezierCurveTo(14, -16, 20, 2, 0, 15); ctx.fill();
    }
    ctx.restore();
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '700 28px "Cinzel", Georgia, serif';
    ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 4; ctx.fillStyle = '#ffffff'; ctx.fillText(String(value), x, y + 2);
    ctx.restore();
  }

  // Pastille d'emblème en haut à droite (symbole provisoire en attendant ceux des factions).
  function drawEmblemDot(ctx, rar, faction) { drawEmblemAt(ctx, rar, faction, W - rar.t - 30, rar.t + 30); }
  function drawEmblemAt(ctx, rar, faction, x, y) {
    const r = 22;
    const c = hex(faction.color);
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = '#0c0c0e'; ctx.fill(); ctx.restore();
    const g = ctx.createRadialGradient(x - 5, y - 6, 2, x, y, r); g.addColorStop(0, rgb(c, 1.25)); g.addColorStop(1, rgb(c, 0.6));
    ctx.beginPath(); ctx.arc(x, y, r - 4, 0, TAU); ctx.fillStyle = g; ctx.fill();
    const touch = touchStyle(ctx, rar);
    ctx.save(); ctx.strokeStyle = touch; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(x, y, r - 1, 0, TAU); ctx.stroke(); ctx.restore();
    ctx.beginPath(); for (let k = 0; k < 8; k += 1) { const a = -Math.PI / 2 + (k / 8) * TAU; const rad = k % 2 ? 3 : 9.5; const px = x + Math.cos(a) * rad, py = y + Math.sin(a) * rad; if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
    ctx.closePath(); ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fill();
  }

  /* ---------- carte selon le croquis : un seul contour, tout à l'intérieur ---------- */
  // Cadre à une seule fenêtre (toute la carte) : même style, base noire et touches de rareté.
  // Cadre à une seule fenêtre (toute la carte) : base noire et touches de rareté.
  // faction2 : seconde faction des cartes bicolores (facultative).
  function drawFrameSingle(ctx, rar, win, faction, faction2) {
    path(ctx, rr(CARD), rr(win));
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1a191e'); g.addColorStop(1, '#08080a');
    ctx.fillStyle = g; ctx.fill('evenodd');
    const touch = touchStyle(ctx, rar);
    ctx.save();
    ctx.strokeStyle = touch; ctx.fillStyle = touch; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (rar.glow) { ctx.shadowColor = rar.c; ctx.shadowBlur = 3 + 5 * rar.glow; }
    ctx.globalAlpha = rar.rank <= 1 ? 0.55 : 0.8; ctx.lineWidth = 1; path(ctx, rr(CARD, 3.5)); ctx.stroke(); ctx.globalAlpha = 1;
    ctx.lineWidth = rar.rank <= 1 ? 1 : 1.4; path(ctx, rr(win, -2)); ctx.stroke();
    if (rar.double) { ctx.lineWidth = 0.8; ctx.globalAlpha = 0.7; path(ctx, rr(win, -5.5)); ctx.stroke(); ctx.globalAlpha = 1; }
    const k = 1;
    corner(ctx, rar, win.x0 + k, win.y0 + k, 1, 1); corner(ctx, rar, win.x1 - k, win.y0 + k, -1, 1);
    corner(ctx, rar, win.x0 + k, win.y1 - k, 1, -1); corner(ctx, rar, win.x1 - k, win.y1 - k, -1, -1);
    midOrnament(ctx, rar, CX, rar.t / 2, 0);
    midOrnament(ctx, rar, CX, H - rar.t / 2, Math.PI);
    midOrnament(ctx, rar, rar.t / 2, H / 2, -Math.PI / 2, true);
    midOrnament(ctx, rar, W - rar.t / 2, H / 2, Math.PI / 2, true);
    ctx.restore();
    const ids = [faction, faction2].filter((f) => f && root.Logos && root.Logos.has(f.id)).map((f) => f.id);
    if (ids.length) drawFrameLogos(ctx, rar, win, ids);
  }

  /* ---------- logos de faction, liés au cadre (une mise en scène par rareté) ---------- */
  // Rien n'est effacé : les logos s'accrochent au cadre par un fil ou se logent dans un espace libre.
  // ids : un logo, ou deux pour une carte bicolore. Les logos alternent : la première faction
  // à gauche, la seconde à droite, comme le fond.
  function drawFrameLogos(ctx, rar, win, ids) {
    const t = rar.t, rk = rar.rank, L = rar.corner, two = ids.length > 1;
    let k = 0; const next = () => ids[(k++) % ids.length];
    const stops = rk === 5 ? [[0, '#fff0bd'], [0.35, '#e3ad48'], [0.7, '#ffe39a'], [1, '#c88a2a']] : [[0, rar.lite], [1, rar.c]];
    const touch = touchStyle(ctx, rar);
    const logo = (x, y, size, rot = 0, id = next()) => { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); root.Logos.draw(ctx, id, 0, 0, size, stops, 'rgba(0,0,0,0.7)', rar.glow ? rar.c : null); ctx.restore(); };
    const line = (pts, w = 0.9) => { ctx.save(); ctx.strokeStyle = touch; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.globalAlpha = 0.9; if (rar.glow) { ctx.shadowColor = rar.c; ctx.shadowBlur = 3; } ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); ctx.restore(); };
    const bead = (x, y, r = 1.4) => { ctx.save(); ctx.fillStyle = touch; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.restore(); };
    // Pendentif : un fil part de (x0, y0) sur le cadre et le logo pend au bout, tourné selon la direction du fil.
    // Le logo reste droit : seuls ceux du bas des cartes sont retournés, comme dans un jeu de cartes.
    const pendant = (x0, y0, dx, dy, len, size) => {
      const x1 = x0 + dx * len, y1 = y0 + dy * len;
      line([[x0, y0], [x1, y1]]); bead(x1, y1, 1.6);
      logo(x1 + dx * (size / 2 + 2), y1 + dy * (size / 2 + 2), size, 0);
    };
    if (rk === 0) {
      // Très commune : un seul pendentif au centre du haut.
      if (two) { pendant(CX - 24, t / 2 + 2, 0, 1, t / 2 + 6, 30); pendant(CX + 24, t / 2 + 2, 0, 1, t / 2 + 6, 30); }
      else pendant(CX, t / 2 + 2, 0, 1, t / 2 + 6, 32);
    } else if (rk === 1) {
      // Commune : deux pendentifs suspendus au bord du haut, près des angles.
      pendant(win.x0 + 38, t / 2 + 2, 0, 1, t / 2 + 6, 30);
      pendant(win.x1 - 38, t / 2 + 2, 0, 1, t / 2 + 6, 30);
    } else if (rk === 2) {
      // Rare : quatre logos logés dans les angles, après l'équerre ; ceux du bas tournés comme dans un jeu de cartes.
      const o = 30, sz = 28;
      logo(win.x0 + o, win.y0 + o, sz); logo(win.x1 - o, win.y0 + o, sz);
      logo(win.x0 + o, win.y1 - o, sz, Math.PI); logo(win.x1 - o, win.y1 - o, sz, Math.PI);
    } else if (rk === 3) {
      // Super rare : en diagonale, reliés au losange d'angle par un fil ; ceux du bas retournés.
      const c0 = 13, c1 = 28, o = 44;
      [[win.x0, win.y0, 1, 1], [win.x1, win.y0, -1, 1], [win.x0, win.y1, 1, -1], [win.x1, win.y1, -1, -1]].forEach(([x, y, sx, sy]) => {
        line([[x + sx * c0, y + sy * c0], [x + sx * c1, y + sy * c1]]);
        logo(x + sx * o, y + sy * o, 28, sy > 0 ? 0 : Math.PI);
      });
    } else if (rk === 4) {
      // Épique : guirlande partant de la crête, trois logos suspendus.
      const y0 = t + 1, span = 124, dip = 30;
      [-1, 1].forEach((s) => {
        const pts = []; for (let i = 0; i <= 30; i += 1) { const u = i / 30; pts.push([CX + s * (14 + u * span), y0 + Math.sin(u * Math.PI) * dip]); }
        line(pts, 0.9); bead(CX + s * (14 + span), y0, 1.6);
        const mx = CX + s * (14 + span / 2), my = y0 + dip;
        line([[mx, my], [mx, my + 5]]); logo(mx, my + 5 + 13, 24);
      });
      pendant(CX, t / 2 + 6, 0, 1, t / 2 + 4, 36);
    } else {
      // Légendaire : grand logo sous la crête, couronné d'un arc de perles (deux logos côte à côte si bicolore).
      const cy = t + 44, size = 46, R = two ? 44 : 36;
      for (let i = 0; i < 11; i += 1) { const a = Math.PI + (i / 10) * Math.PI; bead(CX + Math.cos(a) * R, cy + Math.sin(a) * R + 4, i % 2 ? 1.3 : 2); }
      line([[CX, t / 2 + 8], [CX, cy - R + 3]]);
      if (two) { logo(CX - 21, cy + 2, 36); logo(CX + 21, cy + 2, 36); }
      else logo(CX, cy + 2, size);
    }
  }

  // Pastille de coût (en pointillés : on ne sait pas encore s'il y aura un coût).
  function drawCostDot(ctx, rar, x, y) {
    const r = 22;
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = 'rgba(10,10,12,0.75)'; ctx.fill();
    ctx.setLineDash([3, 3]); ctx.lineWidth = 1.4; ctx.strokeStyle = touchStyle(ctx, rar); ctx.stroke(); ctx.setLineDash([]);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '700 20px "Cinzel", Georgia, serif'; ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText('?', x, y + 1); ctx.restore();
  }

  // Cadre rectangulaire du nom, comme dans le croquis.
  // Losange de stat posé au bout du bandeau du nom : chiffre au centre, icône en filigrane.
  // Pastille de stat : losange pour l'attaque, écu (bouclier) pour la vie.
  // Chiffre au centre, icône en filigrane (épée ou cœur).
  function statDiamond(ctx, rar, x, y, value, icon) {
    const isLife = icon === 'vie';
    const shape = (k) => {
      ctx.beginPath();
      if (!isLife) { const hw = 25 * k, hh = 33 * k; ctx.moveTo(x, y - hh); ctx.lineTo(x + hw, y); ctx.lineTo(x, y + hh); ctx.lineTo(x - hw, y); ctx.closePath(); return; }
      const hw = 24 * k, hh = 30 * k, top = y - hh;
      ctx.moveTo(x - hw, top + hh * 0.22);
      ctx.quadraticCurveTo(x - hw * 0.5, top + hh * 0.1, x, top);
      ctx.quadraticCurveTo(x + hw * 0.5, top + hh * 0.1, x + hw, top + hh * 0.22);
      ctx.lineTo(x + hw, y + hh * 0.1);
      ctx.bezierCurveTo(x + hw, y + hh * 0.6, x + hw * 0.45, y + hh * 0.85, x, y + hh);
      ctx.bezierCurveTo(x - hw * 0.45, y + hh * 0.85, x - hw, y + hh * 0.6, x - hw, y + hh * 0.1);
      ctx.closePath();
    };
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2;
    shape(1); const g = ctx.createLinearGradient(0, y - 33, 0, y + 33); g.addColorStop(0, '#222127'); g.addColorStop(1, '#08080a'); ctx.fillStyle = g; ctx.fill(); ctx.restore();
    const touch = touchStyle(ctx, rar);
    ctx.save(); ctx.strokeStyle = touch; if (rar.glow) { ctx.shadowColor = rar.c; ctx.shadowBlur = 2 + 4 * rar.glow; }
    ctx.lineWidth = 1.8; shape(1); ctx.stroke();
    ctx.lineWidth = 0.7; ctx.globalAlpha = 0.7; shape(0.8); ctx.stroke();
    ctx.restore();
    ctx.save(); ctx.translate(x, y); ctx.fillStyle = 'rgba(255,255,255,0.12)';
    if (!isLife) { ctx.rotate(-Math.PI / 4); ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(3, -11); ctx.lineTo(3, 6); ctx.lineTo(-3, 6); ctx.lineTo(-3, -11); ctx.closePath(); ctx.fill(); ctx.fillRect(-8, 6, 16, 3); ctx.fillRect(-1.6, 9, 3.2, 6); }
    else { ctx.beginPath(); ctx.moveTo(0, 13); ctx.bezierCurveTo(-18, 2, -12, -14, 0, -5); ctx.bezierCurveTo(12, -14, 18, 2, 0, 13); ctx.fill(); }
    ctx.restore();
    const txt = String(value);
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `700 ${txt.length > 2 ? 15 : 24}px "Cinzel", Georgia, serif`;
    ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 4; ctx.fillStyle = '#ffffff'; ctx.fillText(txt, x, y + (isLife ? 1 : 2)); ctx.restore();
  }

  function drawNameBox(ctx, rar, name, y0, y1, stats) {
    const x0 = 64, x1 = W - 64;
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3;
    const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, '#1d1c22'); g.addColorStop(1, '#09090b');
    ctx.fillStyle = g; ctx.beginPath(); ctx.rect(x0, y0, x1 - x0, y1 - y0); ctx.fill(); ctx.restore();
    const touch = touchStyle(ctx, rar);
    ctx.save(); ctx.strokeStyle = touch; ctx.fillStyle = touch; if (rar.glow) { ctx.shadowColor = rar.c; ctx.shadowBlur = 2 + 4 * rar.glow; }
    ctx.lineWidth = 1.5; ctx.strokeRect(x0 + 0.5, y0 + 0.5, x1 - x0 - 1, y1 - y0 - 1);
    if (rar.double) { ctx.lineWidth = 0.7; ctx.globalAlpha = 0.7; ctx.strokeRect(x0 + 4, y0 + 4, x1 - x0 - 8, y1 - y0 - 8); ctx.globalAlpha = 1; }
    ctx.restore();
    if (stats) { statDiamond(ctx, rar, x0, (y0 + y1) / 2, stats.attack, 'attaque'); statDiamond(ctx, rar, x1, (y0 + y1) / 2, stats.life, 'vie'); }
    else [-1, 1].forEach((s) => diamond(ctx, s < 0 ? x0 : x1, (y0 + y1) / 2, 6, touch));
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    let size = 26; ctx.font = `700 ${size}px "Cinzel", Georgia, serif`;
    while (ctx.measureText(name).width > x1 - x0 - (stats ? 90 : 40) && size > 14) { size -= 1; ctx.font = `700 ${size}px "Cinzel", Georgia, serif`; }
    ctx.fillStyle = '#f7f1e6'; ctx.fillText(name, CX, (y0 + y1) / 2 + 1); ctx.restore();
  }

  // Emblème provisoire : une étoile seule, sans pastille, dans la couleur de la rareté.
  function drawEmblemStar(ctx, rar, x, y) {
    const R = 15, r = 4.5;
    const star = () => { ctx.beginPath(); for (let k = 0; k < 8; k += 1) { const a = -Math.PI / 2 + (k / 8) * TAU; const rad = k % 2 ? r : R; const px = x + Math.cos(a) * rad, py = y + Math.sin(a) * rad; if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py); } ctx.closePath(); };
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 6; star(); ctx.fillStyle = '#0c0c0e'; ctx.fill(); ctx.restore();
    ctx.save(); if (rar.glow) { ctx.shadowColor = rar.c; ctx.shadowBlur = 4 + 6 * rar.glow; }
    star(); ctx.fillStyle = touchStyle(ctx, rar); ctx.fill(); ctx.restore();
    ctx.beginPath(); ctx.arc(x, y, 1.8, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fill();
  }

  // Nom de la faction en capitales espacées, entre deux filets fins terminés par un point.
  function drawFactionName(ctx, rar, name, y) {
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '600 15px "Cinzel", Georgia, serif';
    const label = name.toUpperCase().split('').join(' ');
    let fs = 15; while (ctx.measureText(label).width > W - 120 && fs > 10) { fs -= 1; ctx.font = `600 ${fs}px "Cinzel", Georgia, serif`; }
    const w = ctx.measureText(label).width;
    ctx.fillStyle = 'rgba(244,238,228,0.9)'; ctx.fillText(label, CX, y + 1);
    const touch = touchStyle(ctx, rar); ctx.strokeStyle = touch; ctx.fillStyle = touch; ctx.lineWidth = 0.9; ctx.globalAlpha = 0.85;
    const gap = 12, len = Math.max(14, 112 - w / 2 - gap);
    [-1, 1].forEach((sg) => {
      const a = CX + sg * (w / 2 + gap), b = a + sg * len;
      ctx.beginPath(); ctx.moveTo(a, y); ctx.lineTo(b, y); ctx.stroke();
      ctx.beginPath(); ctx.arc(a, y, 1.6, 0, TAU); ctx.fill();
    });
    ctx.restore();
  }

  // Emblème : le logo de la faction (logos.js), dans la couleur de la rareté ; l'étoile s'il n'y en a pas.
  function drawEmblem(ctx, rar, faction, x, y) {
    const L = root.Logos;
    if (!L || !L.has(faction.id)) { drawEmblemStar(ctx, rar, x, y); return; }
    const stops = rar.rank === 5 ? [[0, '#fff0bd'], [0.35, '#e3ad48'], [0.7, '#ffe39a'], [1, '#c88a2a']] : [[0, rar.lite], [1, rar.c]];
    L.draw(ctx, faction.id, x, y + 4, 42, stops, 'rgba(0,0,0,0.9)', rar.glow ? rar.c : null);
  }

  // Titre honorifique sous le nom, en italique, entre deux filets fins terminés par un point.
  // Titre honorifique entre l'attaque et la vie, en italique, entre deux filets terminés par un point.
  // S'il est trop long pour une ligne lisible, il passe sur deux lignes (sans filets).
  function drawHonorific(ctx, rar, text, y) {
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const font = (sz) => `italic ${sz}px "Alegreya", Georgia, serif`;
    let size = 19; const maxW = 200;
    ctx.font = font(size);
    while (ctx.measureText(text).width > maxW && size > 15) { size -= 1; ctx.font = font(size); }
    ctx.fillStyle = 'rgba(244,238,228,0.92)';
    if (ctx.measureText(text).width > maxW) {
      // Deux lignes : on coupe au mot le plus proche du milieu.
      size = 16; ctx.font = font(size);
      const words = text.split(/\s+/); let best = 1, bestD = Infinity;
      for (let i = 1; i < words.length; i += 1) { const a = words.slice(0, i).join(' '), b = words.slice(i).join(' '); const d = Math.max(ctx.measureText(a).width, ctx.measureText(b).width); if (d < bestD) { bestD = d; best = i; } }
      const l1 = words.slice(0, best).join(' '), l2 = words.slice(best).join(' ');
      while (Math.max(ctx.measureText(l1).width, ctx.measureText(l2).width) > 226 && size > 12) { size -= 1; ctx.font = font(size); }
      const lh = size * 1.15;
      ctx.fillText(l1, CX, y - lh / 2 + 1); ctx.fillText(l2, CX, y + lh / 2 + 1);
      ctx.restore(); return;
    }
    const w = ctx.measureText(text).width;
    ctx.fillText(text, CX, y);
    const touch = touchStyle(ctx, rar); ctx.strokeStyle = touch; ctx.fillStyle = touch; ctx.lineWidth = 0.9; ctx.globalAlpha = 0.85;
    const gap = 10, end = 112;
    [-1, 1].forEach((sg) => {
      const a = CX + sg * (w / 2 + gap), b = CX + sg * end;
      if (Math.abs(b - CX) - Math.abs(a - CX) > 6) { ctx.beginPath(); ctx.moveTo(a, y); ctx.lineTo(b, y); ctx.stroke(); }
      ctx.beginPath(); ctx.arc(a, y, 1.6, 0, TAU); ctx.fill();
    });
    ctx.restore();
  }

  // Disposition du croquis, rapportée à 512 × 716 :
  // pastilles du haut (coût, emblème), petite illustration, nom vers 40 %, faction,
  // capacité, citation, pastilles du bas (attaque, vie). Les pastilles sont décalées
  // vers le centre pour ne jamais couvrir les ornements d'angle.
  const SKETCH = { padX: 118, topY: 52, name: { y0: 266, y1: 316 }, catY: 346, textY: 392, botY: H - 52 };

  /* ---------- silhouettes ---------- */
  // La silhouette vient de la première faction qui en a une.
  function silhouetteFor(card) {
    const S = root.Silhouettes; if (!S) return null;
    for (const f of [card.faction, card.faction2]) { const d = f && S.get(f.id); if (d) return { data: d, place: silPlace(d) }; }
    return null;
  }
  // Placement : tout le crâne au-dessus du bandeau du nom, le corps qui descend dans le noir derrière lui.
  function silPlace(d) {
    const h = 300, top = 34, k = h / d.h, w = d.w * k;
    return { x: CX - w / 2, y: top, k };
  }
  function drawSilhouette(ctx, win, d, pl) {
    ctx.save(); path(ctx, rr(win)); ctx.clip();
    ctx.translate(pl.x, pl.y); ctx.scale(pl.k, pl.k);
    ctx.fillStyle = '#060608'; ctx.fill(new Path2D(d.d));
    ctx.restore();
  }
  // Détails légers dans la couleur du cadre : un liseré sur le haut du contour, des yeux qui luisent.
  function drawSilhouetteDetails(ctx, rar, win, d, pl) {
    const touch = touchStyle(ctx, rar);
    if (d.rim) {
      const off = document.createElement('canvas'); off.width = W; off.height = H; const oc = off.getContext('2d');
      oc.save(); oc.translate(pl.x, pl.y); oc.scale(pl.k, pl.k);
      oc.strokeStyle = touchStyle(oc, rar); oc.lineWidth = 1.4 / pl.k; oc.lineJoin = 'round'; oc.stroke(new Path2D(d.d)); oc.restore();
      oc.globalCompositeOperation = 'destination-in';
      const fade = oc.createLinearGradient(0, pl.y, 0, pl.y + 1000 * pl.k * 0.5);
      fade.addColorStop(0, 'rgba(0,0,0,0.85)'); fade.addColorStop(1, 'rgba(0,0,0,0)');
      oc.fillStyle = fade; oc.fillRect(0, 0, W, H);
      ctx.save(); path(ctx, rr(win)); ctx.clip(); if (rar.glow) { ctx.shadowColor = rar.c; ctx.shadowBlur = 4; } ctx.drawImage(off, 0, 0); ctx.restore();
    }
    for (const [ex, ey, rx, ry] of d.eyes || []) {
      const x = pl.x + ex * pl.k, y = pl.y + ey * pl.k, a = rx * pl.k, b = ry * pl.k;
      ctx.save();
      const glow = ctx.createRadialGradient(x, y, 0, x, y, a * 2.6);
      glow.addColorStop(0, hexA(rar.lite, 0.55)); glow.addColorStop(1, hexA(rar.lite, 0));
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, y, a * 2.6, 0, TAU); ctx.fill();
      ctx.fillStyle = touch; ctx.shadowColor = rar.c; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.ellipse(x, y, a * 0.42, b * 0.36, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }
  const hexA = (h, a) => { const c = hex(h); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; };

  // Fond de faction ; pour une carte bicolore, la seconde couleur prend la moitié droite
  // avec une transition douce au centre.
  function paintFond(ctx, win, card, paintOne) {
    paintOne(ctx, hex(card.faction.color));
    if (!card.faction2) return;
    const off = document.createElement('canvas'); off.width = W; off.height = H; const oc = off.getContext('2d');
    paintOne(oc, hex(card.faction2.color));
    oc.globalCompositeOperation = 'destination-in';
    const m = oc.createLinearGradient(W * 0.32, 0, W * 0.68, 0); m.addColorStop(0, 'rgba(0,0,0,0)'); m.addColorStop(1, '#000');
    oc.fillStyle = m; oc.fillRect(0, 0, W, H);
    ctx.drawImage(off, 0, 0);
  }

  // card : { name, honor, rarity, faction, faction2?, ability, flavor, attack, life, description }
  function renderCard(card) {
    const rar = RARITIES[card.rarity]; const t = rar.t;
    const win = { x0: t, y0: t, x1: W - t, y1: H - t, r: 10 };
    const out = document.createElement('canvas'); out.width = W; out.height = H;
    const ctx = out.getContext('2d');
    ctx.save(); path(ctx, rr(CARD)); ctx.clip();
    // Fond de la carte : couleur de la faction, plus claire en haut, sombre en bas pour le texte.
    paintFond(ctx, win, card, (cx, c) => {
      const g = cx.createRadialGradient(CX, 130, 10, CX, 170, 330);
      g.addColorStop(0, rgb(c, 1.1)); g.addColorStop(0.55, rgb(c, 0.7)); g.addColorStop(1, rgb(c, 0.3));
      cx.fillStyle = g; path(cx, rr(win)); cx.fill();
    });
    // Silhouette du peuple : une ombre noire qui monte du bas sombre de la carte.
    const sil = silhouetteFor(card);
    if (sil) drawSilhouette(ctx, win, sil.data, sil.place);
    const dark = ctx.createLinearGradient(0, 200, 0, 330);
    dark.addColorStop(0, 'rgba(8,8,10,0)'); dark.addColorStop(1, 'rgba(8,8,10,0.78)');
    ctx.fillStyle = dark; ctx.fillRect(0, 200, W, H - 200);
    if (sil) drawSilhouetteDetails(ctx, rar, win, sil.data, sil.place);
    else {
      // Repère de l'illustration (provisoire), sans cadre : l'image se fond dans la carte.
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '600 15px "Alegreya Sans", system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillText('ILLUSTRATION', CX, 160);
    }
    drawFrameSingle(ctx, rar, win, card.faction, card.faction2);
    // Emblème au centre du motif du haut, comme un blason posé sur le cadre.
    // Nom dans son cadre rectangulaire.
    drawNameBox(ctx, rar, card.name, SKETCH.name.y0, SKETCH.name.y1);
    // Sous le nom : attaque à gauche, faction au milieu, vie à droite.
    const rowY = SKETCH.name.y1 + 44;
    const stat = (v) => (v === undefined || v === null || v === '' ? '–' : v);
    if (!card.noStats) {
      statDiamond(ctx, rar, CX - 150, rowY, stat(card.attack), 'attaque');
      statDiamond(ctx, rar, CX + 150, rowY, stat(card.life), 'vie');
    }
    if (card.honor) drawHonorific(ctx, rar, card.honor, rowY);
    // Capacité, centrée.
    const width = W - 2 * 56;
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    let y = rowY + 66;
    ctx.font = '500 19px "Alegreya Sans", system-ui, sans-serif'; ctx.fillStyle = '#f4efe6';
    for (const line of wrap(ctx, card.ability || '', width)) { ctx.fillText(line, CX, y); y += 25; }
    // En bas de la carte : petit filet centré, puis la citation.
    ctx.font = 'italic 17px "Alegreya", Georgia, serif';
    const lines = card.flavor ? wrap(ctx, '« ' + card.flavor + ' »', width) : [];
    let fy = H - t - 34 - (lines.length - 1) * 22;
    if (lines.length) { ctx.save(); ctx.strokeStyle = touchStyle(ctx, rar); ctx.globalAlpha = 0.8; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(CX - 55, fy - 26); ctx.lineTo(CX + 55, fy - 26); ctx.stroke(); ctx.restore(); }
    ctx.fillStyle = 'rgba(240,234,224,0.8)';
    for (const line of lines) { ctx.fillText(line, CX, fy); fy += 22; }
    ctx.restore();
    return out;
  }

  // Dos de la carte (quand on la retourne) : nom, faction et rareté, puis la description.
  function renderBack(card) {
    const rar = RARITIES[card.rarity]; const t = rar.t;
    const win = { x0: t, y0: t, x1: W - t, y1: H - t, r: 10 };
    const out = document.createElement('canvas'); out.width = W; out.height = H;
    const ctx = out.getContext('2d');
    ctx.save(); path(ctx, rr(CARD)); ctx.clip();
    paintFond(ctx, win, card, (cx, c) => {
      const g = cx.createRadialGradient(CX, H / 2, 20, CX, H / 2, 420);
      g.addColorStop(0, rgb(c, 0.45)); g.addColorStop(1, rgb(c, 0.12));
      cx.fillStyle = g; path(cx, rr(win)); cx.fill();
    });
    drawFrameSingle(ctx, rar, win, card.faction, card.faction2);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    let size = 30; ctx.font = `700 ${size}px "Cinzel", Georgia, serif`;
    while (ctx.measureText(card.name).width > W - 120 && size > 16) { size -= 1; ctx.font = `700 ${size}px "Cinzel", Georgia, serif`; }
    ctx.fillStyle = '#f7f1e6'; ctx.fillText(card.name, CX, 250);
    drawFactionName(ctx, rar, card.faction.short + (card.faction2 ? ' · ' + card.faction2.short : '') + ' · ' + rar.label, 292);
    ctx.font = 'italic 21px "Alegreya", Georgia, serif'; ctx.fillStyle = 'rgba(240,234,224,0.88)';
    let y = 352;
    for (const line of wrap(ctx, card.description || '', W - 140)) { ctx.fillText(line, CX, y); y += 30; }
    ctx.restore();
    return out;
  }

  root.Cadre = { W, H, RARITIES, ORDER, windows, drawFrame, renderFrame, renderCard, renderBack };
}(window));
