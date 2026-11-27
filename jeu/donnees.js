// Eraser Arena — les cartes, lues dans data/codex.json (l'export du Codex d'Eraser)
// et data/factions.json (les factions du jeu, et la faction de chaque carte).
//
// Deux notions :
// - la faction (« Adepte du sang »…) donne à la carte sa couleur et son logo ; une carte peut en avoir deux ;
// - le type (une étiquette du Codex : un peuple, un groupe) donne la silhouette et reste écrit au dos.
// Une carte qui n'a pas encore de faction garde l'apparence de son type.

export async function chargerCodex(base = '') {
  const [rc, rf] = await Promise.all([fetch(base + 'data/codex.json', { cache: 'no-cache' }), fetch(base + 'data/factions.json', { cache: 'no-cache' })]);
  if (!rc.ok) throw new Error('Codex introuvable (' + rc.status + ')');
  const data = await rc.json();
  const fac = rf.ok ? await rf.json() : { factions: [], cartes: {} };
  const factions = new Map(fac.factions.map((f) => [f.id, f]));
  const tags = new Map(data.tags.map((t) => [t.id, t]));
  const cartes = data.entries.filter((e) => e.kind !== 'note' && e.rarity).map((e) => {
    const fs = (fac.cartes[e.id] || []).filter((id) => factions.has(id)).slice(0, 2);
    return fs.length ? { ...e, factions: fs } : e;
  });
  return { tags, factions, cartes, parId: new Map(cartes.map((c) => [c.id, c])), exporteLe: data.exportedAt };
}

// Le type de la fiche : l'étiquette choisie comme « faction » dans le Codex (ou la première).
export function typesDe(e) {
  const ids = e.tagIds || [];
  const t1 = e.factionId && ids.includes(e.factionId) ? e.factionId : ids[0];
  const t2 = e.factionId2 && ids.includes(e.factionId2) && e.factionId2 !== t1 ? e.factionId2 : null;
  return [t1, t2];
}

function apparenceType(tags, tagId) {
  const t = tagId && tags.get(tagId);
  if (!t) return { id: 'aucune', name: 'Sans type', short: 'Sans type', color: '#5c5862' };
  const short = t.name.replace(/\s*\(.*\)\s*$/, '');
  return { id: t.logo || t.id, sil: t.silhouette || t.logo || t.id, name: t.name, short, color: t.color || '#8b93a1' };
}

const apparenceFaction = (f, sil) => ({ id: f.logo, sil, name: f.nom, short: f.court, color: f.couleur });

// La fiche telle que le moteur des cartes (atelier/carte/cadre.js) la dessine.
export function carteDe(codex, e) {
  const [t1, t2] = typesDe(e);
  const type1 = apparenceType(codex.tags, t1), type2 = t2 ? apparenceType(codex.tags, t2) : null;
  let faction = type1, faction2 = type2, typeLabel = null;
  if (e.factions && e.factions.length) {
    const [f1, f2] = e.factions.map((id) => codex.factions.get(id));
    faction = apparenceFaction(f1, type1.sil);
    faction2 = f2 ? apparenceFaction(f2, type2 ? type2.sil : null) : null;
    typeLabel = type1.short + (type2 ? ' · ' + type2.short : '');
  }
  return {
    name: e.title || 'Sans nom', honor: e.honor || '', rarity: e.rarity || 'commune',
    faction, faction2, typeLabel,
    ability: e.ability || '', flavor: e.flavor || '', attack: e.attack, life: e.life,
    description: e.description || '', noStats: e.kind !== 'personnage',
  };
}

// Le nom court du type, pour les légendes sous les cartes.
export function typeCourt(codex, e) {
  return typesDe(e).filter(Boolean).map((id) => apparenceType(codex.tags, id).short).join(' · ');
}

// L'arbre des étiquettes : enfants d'une étiquette, et toute sa descendance.
export function enfants(tags, id) {
  return [...tags.values()].filter((t) => (t.parentId || null) === id)
    .sort((a, b) => (a.order || 0) - (b.order || 0) || a.name.localeCompare(b.name, 'fr'));
}
export function descendance(tags, id) {
  const out = new Set([id]);
  for (const c of enfants(tags, id)) for (const x of descendance(tags, c.id)) out.add(x);
  return out;
}
