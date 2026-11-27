// Eraser Arena — dessin des cartes pour l'appli, avec un cache :
// une carte n'est dessinée qu'une fois, puis recopiée (bien plus rapide).
// S'appuie sur window.Cadre (atelier/carte/cadre.js).

const cacheFace = new Map();
const cacheRevers = new Map();
let cacheDos = null;

function copie(src) {
  const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
  c.getContext('2d').drawImage(src, 0, 0);
  c.setAttribute('aria-hidden', 'true');
  return c;
}

export function face(id, carte) {
  if (!cacheFace.has(id)) cacheFace.set(id, window.Cadre.renderCard(carte));
  return copie(cacheFace.get(id));
}

// Le revers d'une carte précise (sa description), quand on la retourne en grand.
export function revers(id, carte) {
  if (!cacheRevers.has(id)) cacheRevers.set(id, window.Cadre.renderBack(carte));
  return copie(cacheRevers.get(id));
}

// Le dos commun à toutes les cartes, celui qu'on voit avant de les retourner.
export function dos() {
  if (!cacheDos) cacheDos = dessinerDos();
  return copie(cacheDos);
}

// Fait les dessins à l'avance, sans bloquer l'écran.
export function prechauffer(liste) {
  const file = [...liste];
  const pas = (deadline) => {
    while (file.length && (!deadline || deadline.timeRemaining() > 8)) {
      const [id, carte] = file.shift();
      if (!cacheFace.has(id)) cacheFace.set(id, window.Cadre.renderCard(carte));
    }
    if (file.length) planifier(pas);
  };
  planifier(pas);
}
const planifier = (f) => ('requestIdleCallback' in window ? requestIdleCallback(f, { timeout: 2000 }) : setTimeout(() => f(null), 30));

function dessinerDos() {
  const W = window.Cadre.W, H = window.Cadre.H, CX = W / 2, CY = H / 2;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  const rr = (i, r) => { x.beginPath(); x.roundRect(i, i, W - 2 * i, H - 2 * i, r); };
  x.save(); rr(0, 22); x.clip();
  // Fond : suie, avec une lueur de bronze au centre.
  const g = x.createRadialGradient(CX, CY, 20, CX, CY, 460);
  g.addColorStop(0, '#3b2a20'); g.addColorStop(0.55, '#1d1719'); g.addColorStop(1, '#0c0a0c');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  // Treillis de losanges très discret.
  x.strokeStyle = 'rgba(192,138,78,0.07)'; x.lineWidth = 1;
  for (let k = -H; k < W + H; k += 34) { x.beginPath(); x.moveTo(k, 0); x.lineTo(k + H, H); x.stroke(); x.beginPath(); x.moveTo(k, H); x.lineTo(k + H, 0); x.stroke(); }
  // Double liseré de bronze.
  const bronze = x.createLinearGradient(0, 0, 0, H);
  bronze.addColorStop(0, '#f0c98a'); bronze.addColorStop(0.5, '#c08a4e'); bronze.addColorStop(1, '#7a5530');
  x.strokeStyle = bronze; x.lineWidth = 2.5; rr(16, 14); x.stroke();
  x.lineWidth = 1; x.globalAlpha = 0.7; rr(25, 10); x.stroke(); x.globalAlpha = 1;
  // Losanges aux milieux des bords.
  x.fillStyle = bronze;
  for (const [px, py] of [[CX, 16], [CX, H - 16], [16, CY], [W - 16, CY]]) {
    x.beginPath(); x.moveTo(px, py - 8); x.lineTo(px + 8, py); x.lineTo(px, py + 8); x.lineTo(px - 8, py); x.closePath(); x.fill();
  }
  // Rose des vents au centre, et l'initiale.
  x.save(); x.translate(CX, CY - 20);
  x.strokeStyle = bronze; x.lineWidth = 1.4;
  x.beginPath(); x.arc(0, 0, 104, 0, Math.PI * 2); x.stroke();
  x.globalAlpha = 0.6; x.beginPath(); x.arc(0, 0, 92, 0, Math.PI * 2); x.stroke(); x.globalAlpha = 1;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2, long = i % 4 === 0 ? 150 : i % 2 === 0 ? 128 : 116;
    x.save(); x.rotate(a); x.globalAlpha = i % 2 ? 0.55 : 0.9;
    x.beginPath(); x.moveTo(-4, -106); x.lineTo(0, -long); x.lineTo(4, -106); x.closePath(); x.fill(); x.restore();
  }
  x.globalAlpha = 1;
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = '118px "IM Fell English SC", Georgia, serif';
  x.shadowColor = 'rgba(0,0,0,0.6)'; x.shadowBlur = 10;
  x.fillText('E', 0, 8);
  x.restore();
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = bronze;
  x.font = '600 30px "Cinzel", Georgia, serif';
  x.letterSpacing = '10px';
  x.fillText('ERASER', CX + 5, CY + 150);
  x.font = '600 18px "Cinzel", Georgia, serif'; x.letterSpacing = '14px'; x.globalAlpha = 0.8;
  x.fillText('ARENA', CX + 7, CY + 186);
  x.restore();
  return c;
}
