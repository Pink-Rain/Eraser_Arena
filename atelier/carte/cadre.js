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
  function drawEmblemDot(ctx, rar, faction) {
    const t = rar.t, x = W - t - 30, y = t + 30, r = 22;
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

  // card : { name, rarity, faction, category, ability, flavor, attack, life }
  function renderCard(card) {
    const rar = RARITIES[card.rarity];
    const out = renderFrame(card.rarity, card.faction);
    const ctx = out.getContext('2d');
    const { art, text } = windows(rar);
    const junction = (art.y1 + text.y0) / 2;
    ctx.save(); ctx.beginPath(); rr(CARD)(ctx); ctx.clip();
    // Voile en bas de l'illustration, pour poser le bandeau.
    const fade = ctx.createLinearGradient(0, art.y1 - 70, 0, art.y1);
    fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.save(); ctx.beginPath(); rr(art)(ctx); ctx.clip(); ctx.fillStyle = fade; ctx.fillRect(art.x0, art.y1 - 70, art.x1 - art.x0, 70); ctx.restore();
    drawFrame(ctx, rar); // redessine le cadre par-dessus le voile
    drawEmblemDot(ctx, rar, card.faction);
    drawNameBanner(ctx, rar, card.name, junction);
    // Catégorie.
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.font = '600 13px "Alegreya Sans", system-ui, sans-serif'; ctx.fillStyle = 'rgba(240,234,224,0.7)';
    const cat = card.category.toUpperCase().split('').join(' ');
    ctx.fillText(cat, CX, junction + 44);
    // Capacité spéciale.
    let y = junction + 84;
    ctx.font = '500 19px "Alegreya Sans", system-ui, sans-serif'; ctx.fillStyle = '#f4efe6';
    for (const line of wrap(ctx, card.ability, text.x1 - text.x0 - 110)) { ctx.fillText(line, CX, y); y += 24; }
    // Filet puis citation d'ambiance.
    y += 6;
    ctx.save(); ctx.strokeStyle = touchStyle(ctx, rar); ctx.globalAlpha = 0.7; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(CX - 40, y - 8); ctx.lineTo(CX + 40, y - 8); ctx.stroke(); ctx.restore();
    y += 18;
    ctx.font = 'italic 17px "Alegreya", Georgia, serif'; ctx.fillStyle = 'rgba(240,234,224,0.75)';
    for (const line of wrap(ctx, '« ' + card.flavor + ' »', text.x1 - text.x0 - 130)) { ctx.fillText(line, CX, y); y += 21; }
    // Attaque et vie, dans les coins du bas.
    drawStat(ctx, rar, text.x0 + 26, text.y1 - 26, card.attack, 'attaque');
    drawStat(ctx, rar, text.x1 - 26, text.y1 - 26, card.life, 'vie');
    ctx.restore();
    return out;
  }

  root.Cadre = { W, H, RARITIES, ORDER, windows, drawFrame, renderFrame, renderCard };
}(window));
