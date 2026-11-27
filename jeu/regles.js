// Eraser Arena — les règles du jeu, sans écran ni stockage.
// Tout est en fonctions pures : on leur donne l'état et le hasard, elles rendent le nouvel état.
// Ainsi, le jour où les comptes arrivent (Supabase ou Firebase), seul le stockage change.

export const RARETES = ['trescommune', 'commune', 'rare', 'superrare', 'epique', 'legendaire'];
export const RANG = Object.fromEntries(RARETES.map((r, i) => [r, i]));

// Poids de tirage de chaque rareté. Seules comptent les raretés qui existent dans le Codex :
// tant qu'il n'y a que des rares et plus, les poids sont recalculés entre elles.
export const POIDS = { trescommune: 40, commune: 28, rare: 18, superrare: 9, epique: 4, legendaire: 1 };

export const TAILLE_PAQUET = 5;
// La dernière carte du paquet est au moins de cette rareté (s'il en existe).
export const GARANTIE_DERNIERE = 'superrare';
export const PAQUETS_DE_BIENVENUE = 3;
export const HISTORIQUE_MAX = 30;
export const VERSION = 1;

/* ---------- état ---------- */

export function nouvelEtat(maintenant = new Date()) {
  return {
    v: VERSION,
    creeLe: maintenant.toISOString(),
    paquets: PAQUETS_DE_BIENVENUE,
    collection: {}, // id de carte → nombre d'exemplaires
    dernierPaquetDuJour: null, // 'AAAA-MM-JJ' (jour local)
    historique: [], // [{ le, cartes: [id…] }], le plus récent en premier
    stats: { paquetsOuverts: 0, cartesTirees: 0 },
  };
}

// Remet d'aplomb un état lu dans le stockage (champs manquants, valeurs abîmées).
export function normaliser(brut, maintenant = new Date()) {
  const base = nouvelEtat(maintenant);
  if (!brut || typeof brut !== 'object') return base;
  const e = { ...base, ...brut, stats: { ...base.stats, ...(brut.stats || {}) } };
  e.paquets = Number.isFinite(e.paquets) && e.paquets >= 0 ? Math.floor(e.paquets) : base.paquets;
  e.collection = {};
  for (const [id, n] of Object.entries(brut.collection || {})) if (Number.isFinite(n) && n > 0) e.collection[id] = Math.floor(n);
  e.historique = Array.isArray(brut.historique) ? brut.historique.slice(0, HISTORIQUE_MAX) : [];
  e.v = VERSION;
  return e;
}

/* ---------- paquet du jour ---------- */

export function jourLocal(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
export const paquetDuJourDispo = (etat, maintenant = new Date()) => etat.dernierPaquetDuJour !== jourLocal(maintenant);

export function prendrePaquetDuJour(etat, maintenant = new Date()) {
  if (!paquetDuJourDispo(etat, maintenant)) return etat;
  return { ...etat, paquets: etat.paquets + 1, dernierPaquetDuJour: jourLocal(maintenant) };
}

// Millisecondes jusqu'au prochain paquet du jour (minuit, heure locale).
export function avantProchainPaquet(maintenant = new Date()) {
  const m = new Date(maintenant); m.setHours(24, 0, 0, 0);
  return m - maintenant;
}

/* ---------- tirage ---------- */

// Les raretés présentes dans la réserve, avec leur poids et leurs cartes.
function parRarete(reserve) {
  const groupes = new Map();
  for (const c of reserve) {
    if (!(c.rarity in POIDS)) continue;
    if (!groupes.has(c.rarity)) groupes.set(c.rarity, []);
    groupes.get(c.rarity).push(c);
  }
  return groupes;
}

// Chance de chaque rareté pour une carte ordinaire du paquet (pour l'afficher au joueur).
export function chances(reserve, minimum = null) {
  const g = parRarete(reserve);
  const rs = [...g.keys()].filter((r) => minimum == null || RANG[r] >= RANG[minimum]);
  const total = rs.reduce((s, r) => s + POIDS[r], 0);
  return Object.fromEntries(RARETES.filter((r) => rs.includes(r)).map((r) => [r, POIDS[r] / total]));
}

function choisirRarete(groupes, hasard, minimum) {
  let rs = [...groupes.keys()];
  if (minimum) { const hautes = rs.filter((r) => RANG[r] >= RANG[minimum]); if (hautes.length) rs = hautes; }
  rs.sort((a, b) => RANG[a] - RANG[b]);
  const total = rs.reduce((s, r) => s + POIDS[r], 0);
  let x = hasard() * total;
  for (const r of rs) { x -= POIDS[r]; if (x < 0) return r; }
  return rs[rs.length - 1];
}

// Tire un paquet dans la réserve (les cartes du Codex). hasard() rend un nombre dans [0, 1).
// Une même carte évite de sortir deux fois dans un paquet, sauf si la rareté n'a plus d'autre choix.
export function tirerPaquet(reserve, hasard = Math.random, taille = TAILLE_PAQUET) {
  const groupes = parRarete(reserve);
  if (!groupes.size) return [];
  const tirage = [];
  for (let i = 0; i < taille; i++) {
    const r = choisirRarete(groupes, hasard, i === taille - 1 ? GARANTIE_DERNIERE : null);
    const cartes = groupes.get(r);
    const libres = cartes.filter((c) => !tirage.includes(c));
    const parmi = libres.length ? libres : cartes;
    tirage.push(parmi[Math.floor(hasard() * parmi.length)]);
  }
  // Révélées de la plus modeste à la plus rare : le meilleur arrive en dernier.
  return tirage.sort((a, b) => RANG[a.rarity] - RANG[b.rarity]);
}

// Ouvre un paquet : retire un paquet du stock, ajoute les cartes à la collection.
// Rend le nouvel état et le tirage, chaque carte marquée nouvelle ou non.
export function ouvrirPaquet(etat, reserve, hasard = Math.random, maintenant = new Date()) {
  if (etat.paquets <= 0) throw new Error('Plus de paquet à ouvrir');
  const cartes = tirerPaquet(reserve, hasard);
  const collection = { ...etat.collection };
  const tirage = cartes.map((c) => {
    const avant = collection[c.id] || 0;
    collection[c.id] = avant + 1;
    return { id: c.id, rarity: c.rarity, nouvelle: avant === 0, exemplaires: avant + 1 };
  });
  return {
    etat: {
      ...etat,
      paquets: etat.paquets - 1,
      collection,
      historique: [{ le: maintenant.toISOString(), cartes: cartes.map((c) => c.id) }, ...etat.historique].slice(0, HISTORIQUE_MAX),
      stats: { ...etat.stats, paquetsOuverts: etat.stats.paquetsOuverts + 1, cartesTirees: etat.stats.cartesTirees + cartes.length },
    },
    tirage,
  };
}

/* ---------- collection ---------- */

export function progression(etat, reserve) {
  const parR = {};
  let possedees = 0;
  for (const c of reserve) {
    const p = parR[c.rarity] || (parR[c.rarity] = { possedees: 0, total: 0 });
    p.total++;
    if (etat.collection[c.id]) { p.possedees++; possedees++; }
  }
  return { possedees, total: reserve.length, parRarete: parR };
}

export function dernieresCartes(etat, n = 10) {
  const vues = new Set(); const out = [];
  for (const h of etat.historique) for (const id of [...h.cartes].reverse()) {
    if (vues.has(id)) continue; vues.add(id); out.push(id);
    if (out.length >= n) return out;
  }
  return out;
}

/* ---------- mode admin (pour tester) ---------- */

export const ajouterPaquets = (etat, n) => ({ ...etat, paquets: Math.max(0, etat.paquets + n) });
export const remettrePaquetDuJour = (etat) => ({ ...etat, dernierPaquetDuJour: null });
// Au moins un exemplaire de chaque carte de la réserve.
export function donnerTout(etat, reserve) {
  const collection = { ...etat.collection };
  for (const c of reserve) collection[c.id] = Math.max(1, collection[c.id] || 0);
  return { ...etat, collection };
}
export const viderCollection = (etat) => ({ ...etat, collection: {}, historique: [] });
export const fixerPaquets = (etat, n) => ({ ...etat, paquets: Math.max(0, Math.floor(n) || 0) });
// Met une carte à n exemplaires (0 la retire de la collection).
export function fixerExemplaires(etat, id, n) {
  const collection = { ...etat.collection };
  const v = Math.max(0, Math.floor(n) || 0);
  if (v) collection[id] = v; else delete collection[id];
  return { ...etat, collection };
}
// La réserve d'un paquet truqué : seulement une rareté et/ou une faction.
// Si rien ne correspond, on garde la réserve entière plutôt qu'un paquet vide.
export function reserveForcee(reserve, rarete = '', faction = '') {
  if (!rarete && !faction) return reserve;
  const r = reserve.filter((c) => (!rarete || c.rarity === rarete) && (!faction || (c.factions || []).includes(faction)));
  return r.length ? r : reserve;
}
