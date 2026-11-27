// Eraser Arena — les sons de l'ouverture des paquets, fabriqués à la volée (aucun fichier audio).
// Rien que de la matière, aucune note de musique : une page qu'on tourne pour chaque carte,
// puis, plus la carte est rare, plus on ajoute : un souffle d'air, un impact sourd de plus en plus lourd,
// des crépitements comme des braises, et pour la légendaire un grondement qui s'éteint lentement.

const CLE = 'eraser-arena:son';
let ctx = null;
let maitre = null;

export function sonActif() {
  try { return localStorage.getItem(CLE) !== '0'; } catch (_) { return true; }
}
export function basculerSon() {
  const actif = !sonActif();
  try { localStorage.setItem(CLE, actif ? '1' : '0'); } catch (_) {}
  return actif;
}

// Le contexte audio ne peut démarrer qu'après un geste du joueur (un clic, un toucher).
function audio() {
  if (!sonActif()) return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) {
    ctx = new AC();
    maitre = ctx.createGain(); maitre.gain.value = 0.55;
    const comp = ctx.createDynamicsCompressor();
    maitre.connect(comp); comp.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function bruit(c, duree) {
  const n = Math.ceil(c.sampleRate * duree);
  const buf = c.createBuffer(1, n, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource(); src.buffer = buf;
  return src;
}

// Un froissement de papier : du bruit filtré dont la hauteur glisse, avec une enveloppe rapide.
function froissement(c, t, { duree = 0.22, de = 900, a = 3800, volume = 0.5, q = 0.9 } = {}) {
  const src = bruit(c, duree + 0.05);
  const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = q;
  bp.frequency.setValueAtTime(de, t); bp.frequency.exponentialRampToValueAtTime(a, t + duree * 0.7);
  const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 400;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(volume, t + 0.015);
  g.gain.exponentialRampToValueAtTime(volume * 0.35, t + duree * 0.45);
  g.gain.exponentialRampToValueAtTime(0.0001, t + duree);
  src.connect(bp); bp.connect(hp); hp.connect(g); g.connect(maitre);
  src.start(t); src.stop(t + duree + 0.05);
}

// Un souffle d'air : du bruit grave qui monte, comme un mouvement rapide.
function souffle(c, t, { duree = 0.4, volume = 0.25, de = 250, a = 1400 } = {}) {
  const src = bruit(c, duree + 0.05);
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.7;
  lp.frequency.setValueAtTime(de, t); lp.frequency.exponentialRampToValueAtTime(a, t + duree * 0.6);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(volume, t + duree * 0.35);
  g.gain.exponentialRampToValueAtTime(0.0001, t + duree);
  src.connect(lp); lp.connect(g); g.connect(maitre);
  src.start(t); src.stop(t + duree + 0.05);
}

// Un impact sourd : une onde très grave qui tombe. force de 0 à 1.
function coupSourd(c, t, force = 1) {
  const o = c.createOscillator(); o.type = 'sine';
  const haut = 70 + 40 * force, duree = 0.35 + 0.55 * force;
  o.frequency.setValueAtTime(haut, t); o.frequency.exponentialRampToValueAtTime(36, t + duree * 0.7);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.7 * force, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + duree);
  o.connect(g); g.connect(maitre); o.start(t); o.stop(t + duree + 0.05);
  // Le choc lui-même : un bref bruit étouffé.
  const src = bruit(c, 0.08);
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500;
  const gb = c.createGain();
  gb.gain.setValueAtTime(0.0001, t); gb.gain.exponentialRampToValueAtTime(0.5 * force, t + 0.004); gb.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
  src.connect(lp); lp.connect(gb); gb.connect(maitre); src.start(t); src.stop(t + 0.08);
}

// Des crépitements, comme des braises : de petits claquements épars.
function crepitement(c, t, { duree = 0.7, densite = 40, volume = 0.18 } = {}) {
  const n = Math.ceil(c.sampleRate * duree);
  const buf = c.createBuffer(1, n, c.sampleRate);
  const d = buf.getChannelData(0);
  const clics = Math.round(densite * duree);
  for (let k = 0; k < clics; k++) {
    const pos = Math.floor(Math.random() * (n - 400)), amp = 0.3 + Math.random() * 0.7, long = 40 + Math.floor(Math.random() * 160);
    for (let j = 0; j < long; j++) d[pos + j] += (Math.random() * 2 - 1) * amp * Math.exp(-j / (long / 4));
  }
  const src = c.createBufferSource(); src.buffer = buf;
  const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2600; bp.Q.value = 0.6;
  const g = c.createGain();
  g.gain.setValueAtTime(volume, t); g.gain.exponentialRampToValueAtTime(0.0001, t + duree);
  src.connect(bp); bp.connect(g); g.connect(maitre); src.start(t); src.stop(t + duree);
}

// Un grondement grave qui s'éteint lentement.
function grondement(c, t, duree = 1.6, volume = 0.35) {
  const src = bruit(c, duree + 0.05);
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 140;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(volume, t + 0.08); g.gain.exponentialRampToValueAtTime(0.0001, t + duree);
  src.connect(lp); lp.connect(g); g.connect(maitre); src.start(t); src.stop(t + duree + 0.05);
}

// Le paquet qu'on déchire : un long froissement irrégulier.
export function sonDechirure() {
  const c = audio(); if (!c) return;
  const t = c.currentTime + 0.01;
  froissement(c, t, { duree: 0.5, de: 1800, a: 6000, volume: 0.35, q: 0.6 });
  for (let i = 0; i < 5; i++) froissement(c, t + 0.06 + i * 0.07, { duree: 0.08, de: 2500, a: 5000, volume: 0.25, q: 2 });
}

// Une carte qu'on retourne, selon le rang de sa rareté (0 très commune … 5 légendaire).
export function sonCarte(rang) {
  const c = audio(); if (!c) return;
  const t = c.currentTime + 0.01;
  // La page : un peu plus ample à chaque rareté.
  froissement(c, t, { duree: 0.2 + rang * 0.03, de: 700 + rang * 80, a: 3200 + rang * 300, volume: 0.42 + rang * 0.04 });
  if (rang === 2) souffle(c, t + 0.04, { duree: 0.35, volume: 0.16 });
  if (rang === 3) { souffle(c, t + 0.03, { duree: 0.45, volume: 0.24 }); coupSourd(c, t + 0.1, 0.25); }
  if (rang === 4) { souffle(c, t + 0.02, { duree: 0.55, volume: 0.32 }); coupSourd(c, t + 0.08, 0.55); crepitement(c, t + 0.15, { duree: 0.6, densite: 30, volume: 0.12 }); }
  if (rang === 5) {
    souffle(c, t, { duree: 0.7, volume: 0.4, de: 180, a: 1800 });
    coupSourd(c, t + 0.06, 1);
    grondement(c, t + 0.08);
    crepitement(c, t + 0.2, { duree: 1.2, densite: 45, volume: 0.16 });
  }
}
