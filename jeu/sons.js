// Eraser Arena — les sons de l'ouverture des paquets, fabriqués à la volée (aucun fichier audio).
// Une page qu'on tourne pour chaque carte ; plus la carte est rare, plus le son s'enrichit :
// rare → une note claire ; super rare → deux ; épique → un arpège qui scintille ;
// légendaire → un coup sourd, un arpège en accord et une nappe qui reste.

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

// Une note de cloche : une sinusoïde et une harmonique, qui s'éteignent lentement.
function note(c, t, freq, { duree = 1.2, volume = 0.18, type = 'sine' } = {}) {
  for (const [mult, part] of [[1, 1], [2.01, 0.35], [3.98, 0.12]]) {
    const o = c.createOscillator(); o.type = type; o.frequency.value = freq * mult;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(volume * part, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duree / mult);
    o.connect(g); g.connect(maitre);
    o.start(t); o.stop(t + duree + 0.05);
  }
}

function scintillement(c, t, n = 10, base = 2400) {
  for (let i = 0; i < n; i++) note(c, t + i * 0.045 + Math.random() * 0.02, base * (1 + Math.random() * 0.8), { duree: 0.35, volume: 0.035 });
}

function coupSourd(c, t) {
  const o = c.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.6);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.7, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
  o.connect(g); g.connect(maitre); o.start(t); o.stop(t + 1);
}

function nappe(c, t, freqs, duree = 2.6) {
  for (const f of freqs) {
    const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 0.35); g.gain.exponentialRampToValueAtTime(0.0001, t + duree);
    o.connect(lp); lp.connect(g); g.connect(maitre); o.start(t); o.stop(t + duree + 0.05);
  }
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
  const ta = t + 0.12;
  if (rang === 2) note(c, ta, 880, { duree: 0.9, volume: 0.12 });
  if (rang === 3) { note(c, ta, 659.25, { volume: 0.13 }); note(c, ta + 0.11, 987.77, { duree: 1.4, volume: 0.13 }); }
  if (rang === 4) {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => note(c, ta + i * 0.09, f, { duree: 1.6, volume: 0.13 }));
    scintillement(c, ta + 0.3, 10);
  }
  if (rang === 5) {
    coupSourd(c, t);
    [587.33, 739.99, 880, 1174.66, 1479.98].forEach((f, i) => note(c, ta + 0.08 + i * 0.1, f, { duree: 2.2, volume: 0.14 }));
    nappe(c, ta + 0.1, [293.66, 440, 587.33]);
    scintillement(c, ta + 0.5, 18, 2800);
  }
}
