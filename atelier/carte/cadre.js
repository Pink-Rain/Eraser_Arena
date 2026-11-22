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

  // Le cadre seul, sur des fenêtres neutres (gris), pour le juger sans le reste.
  function renderFrame(rarity) {
    const rar = RARITIES[rarity];
    const out = document.createElement('canvas'); out.width = W; out.height = H;
    const ctx = out.getContext('2d');
    ctx.save(); path(ctx, rr(CARD)); ctx.clip();
    const { art, text } = windows(rar);
    const ga = ctx.createLinearGradient(0, art.y0, 0, art.y1); ga.addColorStop(0, '#5a5961'); ga.addColorStop(1, '#3b3a41');
    ctx.fillStyle = ga; path(ctx, rr(art)); ctx.fill();
    ctx.fillStyle = '#2f2e34'; path(ctx, rr(text)); ctx.fill();
    drawFrame(ctx, rar);
    ctx.restore();
    return out;
  }

  root.Cadre = { W, H, RARITIES, ORDER, windows, drawFrame, renderFrame };
}(window));
