// Eraser Arena — les cartes, lues dans data/codex.json (l'export du Codex d'Eraser).
// Une fiche du Codex devient une carte : sa faction (une étiquette) donne la couleur du fond,
// le logo du cadre et la silhouette.

export async function chargerCodex(url = 'data/codex.json') {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error('Codex introuvable (' + res.status + ')');
  const data = await res.json();
  const tags = new Map(data.tags.map((t) => [t.id, t]));
  const cartes = data.entries.filter((e) => e.kind !== 'note' && e.rarity);
  return { tags, cartes, parId: new Map(cartes.map((c) => [c.id, c])), exporteLe: data.exportedAt };
}

export function factionDe(tags, tagId) {
  const t = tagId && tags.get(tagId);
  if (!t) return { id: 'aucune', name: 'Sans faction', short: 'Sans faction', color: '#5c5862' };
  const short = t.name.replace(/\s*\(.*\)\s*$/, '');
  return { id: t.logo || t.id, sil: t.silhouette || t.logo || t.id, name: t.name, short, color: t.color || '#8b93a1' };
}

// La fiche telle que le moteur des cartes (atelier/carte/cadre.js) la dessine.
export function carteDe(tags, e) {
  const ids = e.tagIds || [];
  const f1 = e.factionId && ids.includes(e.factionId) ? e.factionId : ids[0];
  const f2 = e.factionId2 && ids.includes(e.factionId2) && e.factionId2 !== f1 ? e.factionId2 : null;
  return {
    name: e.title || 'Sans nom', honor: e.honor || '', rarity: e.rarity || 'commune',
    faction: factionDe(tags, f1), faction2: f2 ? factionDe(tags, f2) : null,
    ability: e.ability || '', flavor: e.flavor || '', attack: e.attack, life: e.life,
    description: e.description || '', noStats: e.kind !== 'personnage',
  };
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
