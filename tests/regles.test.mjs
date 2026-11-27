// Lancer avec : node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  nouvelEtat, normaliser, tirerPaquet, ouvrirPaquet, paquetDuJourDispo, prendrePaquetDuJour,
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

test('un paquet a la bonne taille, trié, avec la dernière carte au moins super rare', () => {
  const h = graine(1);
  for (let i = 0; i < 500; i++) {
    const p = tirerPaquet(reserve, h);
    assert.equal(p.length, TAILLE_PAQUET);
    for (let j = 1; j < p.length; j++) assert.ok(RANG[p[j - 1].rarity] <= RANG[p[j].rarity]);
    assert.ok(RANG[p[p.length - 1].rarity] >= RANG.superrare);
    assert.equal(new Set(p.map((c) => c.id)).size, p.length, 'pas de doublon dans un paquet');
  }
});

test('les raretés sortent à peu près selon leurs chances', () => {
  const h = graine(7); const n = 20000; const vu = {};
  for (let i = 0; i < n; i++) for (const c of tirerPaquet(reserve, h, 1)) vu[c.rarity] = (vu[c.rarity] || 0) + 1;
  // Paquet d'une carte : c'est la « dernière », donc super rare ou mieux.
  const ch = chances(reserve, 'superrare');
  for (const [r, p] of Object.entries(ch)) assert.ok(Math.abs(vu[r] / n - p) < 0.02, `${r} : ${vu[r] / n} au lieu de ${p}`);
  assert.equal(vu.rare, undefined);
  const somme = Object.values(chances(reserve)).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(somme - 1) < 1e-9);
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
  const { cartesExemples, RARETES_EXEMPLES } = await import('../jeu/donnees.js');
  const fac = JSON.parse(fs.readFileSync(new URL('../data/factions.json', import.meta.url)));
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
