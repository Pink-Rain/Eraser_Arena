// Lancer avec : node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { cartesExemples } from '../jeu/donnees.js';
import {
  TAUX, TAUX_DERNIERE, nouvelEtat, normaliser, tirerPaquet, ouvrirPaquet, paquetDuJourDispo, prendrePaquetDuJour,
  avantProchainPaquet, chances, progression, dernieresCartes, RANG, TAILLE_PAQUET, PAQUETS_DE_BIENVENUE,
} from '../jeu/regles.js';

const codex = JSON.parse(fs.readFileSync(new URL('../data/codex.json', import.meta.url)));
const reserve = codex.entries.filter((e) => e.kind !== 'note' && e.rarity);

// Hasard reproductible (mulberry32).
function graine(s) { return () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

test('un nouvel état a les paquets de bienvenue', () => {
  const e = nouvelEtat();
  assert.equal(e.paquets, PAQUETS_DE_BIENVENUE);
  assert.deepEqual(e.collection, {});
});

// La réserve du jeu : les vraies cartes avec leur faction, plus les cartes exemples (communes comprises).
const fac = JSON.parse(fs.readFileSync(new URL('../data/factions.json', import.meta.url)));
const reserveJeu = (() => {
  const vraies = reserve.map((c) => ({ ...c, factions: fac.cartes[c.id] }));
  return [...vraies, ...cartesExemples(new Map(fac.factions.map((f) => [f.id, f])), vraies)];
})();

test('les taux de drop font 100 %', () => {
  const somme = (t) => Object.values(t).reduce((a, b) => a + b, 0);
  assert.equal(somme(TAUX), 100);
  assert.equal(somme(TAUX_DERNIERE), 100);
  assert.ok(Object.keys(TAUX_DERNIERE).every((r) => RANG[r] >= RANG.rare), 'la dernière est au moins rare');
  // Toutes les raretés existent dans la réserve (grâce aux exemples) : les chances affichées sont les taux exacts.
  for (const [r, p] of Object.entries(chances(reserveJeu))) assert.ok(Math.abs(p - TAUX[r] / 100) < 1e-9, r);
  for (const [r, p] of Object.entries(chances(reserveJeu, true))) assert.ok(Math.abs(p - TAUX_DERNIERE[r] / 100) < 1e-9, r);
});

test('un paquet a la bonne taille, trié de la moins rare à la plus rare, la dernière au moins rare', () => {
  const h = graine(1);
  for (let i = 0; i < 2000; i++) {
    const p = tirerPaquet(reserveJeu, h);
    assert.equal(p.length, TAILLE_PAQUET);
    for (let j = 1; j < p.length; j++) assert.ok(RANG[p[j - 1].rarity] <= RANG[p[j].rarity]);
    assert.ok(RANG[p[p.length - 1].rarity] >= RANG.rare);
    assert.equal(new Set(p.map((c) => c.id)).size, p.length, 'pas de doublon dans un paquet');
  }
});

test('les raretés sortent selon les taux, exemples compris', () => {
  const h = graine(7); const n = 40000; const vu = {};
  for (let i = 0; i < n; i++) for (const c of tirerPaquet(reserveJeu, h)) vu[c.rarity] = (vu[c.rarity] || 0) + 1;
  // Par paquet : 4 cartes au taux ordinaire + 1 au taux de la dernière.
  for (const r of Object.keys(TAUX)) {
    const attendu = (4 * TAUX[r] + (TAUX_DERNIERE[r] || 0)) / 100;
    const obtenu = (vu[r] || 0) / n;
    assert.ok(Math.abs(obtenu - attendu) < 0.01 + attendu * 0.05, `${r} : ${obtenu.toFixed(3)} par paquet au lieu de ${attendu.toFixed(3)}`);
  }
  assert.ok(vu.commune && vu.trescommune, 'les exemples communs tombent');
});

test('ouvrir un paquet retire un paquet et remplit la collection', () => {
  let e = nouvelEtat();
  const r = ouvrirPaquet(e, reserve, graine(3));
  assert.equal(r.etat.paquets, PAQUETS_DE_BIENVENUE - 1);
  assert.equal(r.tirage.length, TAILLE_PAQUET);
  assert.ok(r.tirage.every((t) => t.nouvelle && t.exemplaires === 1));
  assert.equal(Object.values(r.etat.collection).reduce((a, b) => a + b, 0), TAILLE_PAQUET);
  assert.equal(r.etat.stats.paquetsOuverts, 1);
  assert.equal(e.paquets, PAQUETS_DE_BIENVENUE, "l'ancien état n'est pas modifié");
  e = r.etat;
  // Un doublon est compté, pas marqué « nouvelle ».
  const id = r.tirage[0].id;
  const r2 = ouvrirPaquet({ ...e, paquets: 1 }, reserve.filter((c) => c.id === id || c.rarity === 'legendaire'), graine(9));
  const t = r2.tirage.find((x) => x.id === id);
  if (t) { assert.equal(t.nouvelle, false); assert.equal(t.exemplaires, 2); }
  assert.throws(() => ouvrirPaquet({ ...e, paquets: 0 }, reserve));
});

test('un paquet du jour par jour local', () => {
  const lundi = new Date(2026, 10, 30, 9, 0);
  let e = nouvelEtat(lundi);
  assert.ok(paquetDuJourDispo(e, lundi));
  e = prendrePaquetDuJour(e, lundi);
  assert.equal(e.paquets, PAQUETS_DE_BIENVENUE + 1);
  assert.ok(!paquetDuJourDispo(e, new Date(2026, 10, 30, 23, 59)));
  assert.equal(prendrePaquetDuJour(e, lundi).paquets, e.paquets, 'pas deux fois le même jour');
  assert.ok(paquetDuJourDispo(e, new Date(2026, 11, 1, 0, 1)));
  assert.equal(avantProchainPaquet(new Date(2026, 10, 30, 23, 0)), 3600000);
});

test('normaliser répare une sauvegarde abîmée', () => {
  const e = normaliser({ paquets: -4, collection: { a: 2, b: 'x', c: 0 }, stats: { paquetsOuverts: 3 } });
  assert.equal(e.paquets, PAQUETS_DE_BIENVENUE);
  assert.deepEqual(e.collection, { a: 2 });
  assert.equal(e.stats.paquetsOuverts, 3);
  assert.equal(e.stats.cartesTirees, 0);
  assert.equal(normaliser(null).paquets, PAQUETS_DE_BIENVENUE);
});

test('progression et dernières cartes', () => {
  let e = nouvelEtat();
  e = ouvrirPaquet(e, reserve, graine(11)).etat;
  e = ouvrirPaquet(e, reserve, graine(12)).etat;
  const p = progression(e, reserve);
  assert.equal(p.total, reserve.length);
  assert.equal(p.possedees, Object.keys(e.collection).length);
  const d = dernieresCartes(e, 4);
  assert.equal(d.length, 4);
  assert.equal(d[0], e.historique[0].cartes.at(-1), 'la plus rare du dernier paquet en premier');
});

test('outils du mode admin', async () => {
  const { ajouterPaquets, remettrePaquetDuJour, donnerTout, viderCollection, reserveForcee } = await import('../jeu/regles.js');
  let e = nouvelEtat();
  assert.equal(ajouterPaquets(e, 10).paquets, PAQUETS_DE_BIENVENUE + 10);
  assert.equal(ajouterPaquets(e, -99).paquets, 0);
  e = prendrePaquetDuJour(e);
  assert.ok(paquetDuJourDispo(remettrePaquetDuJour(e)));
  const tout = donnerTout({ ...e, collection: { [reserve[0].id]: 3 } }, reserve);
  assert.equal(Object.keys(tout.collection).length, reserve.length);
  assert.equal(tout.collection[reserve[0].id], 3, 'les doublons déjà là restent');
  assert.deepEqual(viderCollection(tout).collection, {});
  const leg = reserveForcee(reserve, 'legendaire');
  const r = ouvrirPaquet({ ...e, paquets: 1 }, leg, graine(5));
  assert.ok(r.tirage.every((t) => t.rarity === 'legendaire'));
  assert.equal(reserveForcee(reserve, ''), reserve);
});

test('répartition des factions et cartes exemples', async () => {
  const { RARETES_EXEMPLES } = await import('../jeu/donnees.js');
  const ids = new Set(fac.factions.map((f) => f.id));
  for (const [carte, fs_] of Object.entries(fac.cartes)) {
    assert.ok(reserve.some((c) => c.id === carte), `carte inconnue : ${carte}`);
    assert.ok(fs_.length >= 1 && fs_.length <= 2 && fs_.every((f) => ids.has(f)), `factions de ${carte}`);
  }
  assert.equal(Object.keys(fac.cartes).length, reserve.length, 'chaque carte a sa faction');
  const couleurs = fac.factions.map((f) => f.couleur.toLowerCase());
  assert.equal(new Set(couleurs).size, couleurs.length, 'deux factions jamais de la même couleur');
  const cartes = reserve.map((c) => ({ ...c, factions: fac.cartes[c.id] }));
  const ex = cartesExemples(new Map(fac.factions.map((f) => [f.id, f])), cartes);
  // Chaque couple faction × rareté a soit une vraie carte, soit exactement un exemple.
  for (const f of ids) for (const r of RARETES_EXEMPLES) {
    const vraies = cartes.filter((c) => c.rarity === r && c.factions.includes(f)).length;
    const exs = ex.filter((e) => e.rarity === r && e.factions[0] === f).length;
    assert.equal(exs, vraies ? 0 : 1, `${f} ${r}`);
  }
  assert.ok(ex.every((e) => e.exemple));
});

test('admin : paquets à volonté, cartes une par une, paquets truqués par faction', async () => {
  const { fixerPaquets, fixerExemplaires, reserveForcee } = await import('../jeu/regles.js');
  let e = nouvelEtat();
  assert.equal(fixerPaquets(e, 250).paquets, 250);
  assert.equal(fixerPaquets(e, -3).paquets, 0);
  e = fixerExemplaires(e, 'a', 3);
  assert.equal(e.collection.a, 3);
  e = fixerExemplaires(e, 'a', 0);
  assert.ok(!('a' in e.collection), 'à 0 la carte disparaît');
  const avecFactions = reserve.map((c, i) => ({ ...c, factions: [i % 2 ? 'sang' : 'feu'] }));
  const sang = reserveForcee(avecFactions, '', 'sang');
  assert.ok(sang.length && sang.every((c) => c.factions.includes('sang')));
  const sangLeg = reserveForcee(avecFactions, 'legendaire', 'sang');
  assert.ok(sangLeg.every((c) => c.rarity === 'legendaire' && c.factions.includes('sang')));
  assert.equal(reserveForcee(avecFactions, 'legendaire', 'inconnue').length, avecFactions.length, 'rien ne correspond : réserve entière');
});
