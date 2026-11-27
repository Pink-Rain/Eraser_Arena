// Eraser Arena — où vit la sauvegarde.
// Pour l'instant, dans le navigateur. Plus tard, un autre stockage (un compte en ligne)
// pourra prendre sa place tant qu'il offre les mêmes trois fonctions.

const CLE = 'eraser-arena:sauvegarde';
let memoire = null; // si le navigateur refuse le stockage (navigation privée…)

export const stockageLocal = {
  charger() {
    try { const t = localStorage.getItem(CLE); return t ? JSON.parse(t) : memoire; } catch (_) { return memoire; }
  },
  sauver(etat) {
    memoire = etat;
    try { localStorage.setItem(CLE, JSON.stringify(etat)); return true; } catch (_) { return false; }
  },
  effacer() {
    memoire = null;
    try { localStorage.removeItem(CLE); } catch (_) {}
  },
};
