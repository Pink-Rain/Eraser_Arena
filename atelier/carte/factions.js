// Factions, recopiées du Codex d'Eraser (nom, couleur, rangement).
// Toute étiquette peut être une faction, les groupes compris : une carte peut être
// « Gardiens » sans appartenir aux Neuf. depth sert à indenter la liste.
// Règle : deux factions n'ont jamais la même couleur (vérifié au chargement).
// Plus tard, ces données viendront d'un fichier de données du jeu, séparé du code.
window.FACTIONS = [
  { id: 'mortels', name: 'Mortels', color: '#c9732e', depth: 0 },
  { id: 'peuple-libre', name: 'Peuple libre', color: '#3a8a9e', depth: 1 },
  { id: 'creatures', name: 'Créatures', color: '#4a4a6a', depth: 1 },
  { id: 'sirenes', name: 'Sirènes', color: '#8fc4b0', depth: 2 },
  { id: 'vampires', name: 'Vampires', color: '#4e1a17', depth: 2 },
  { id: 'huvryors', name: "Huvry'ors", color: '#8a6a4a', depth: 1 },
  { id: 'humains', name: 'Humains', color: '#a68a64', depth: 2 },
  { id: 'automes', name: 'Haut-hommes', color: '#8a6a2e', depth: 3 },
  { id: 'valhelm', name: 'Humaines de Valhelm', color: '#5a2a4e', depth: 3 },
  { id: 'sirois', name: "Cir'hois", color: '#2f6b5e', depth: 3 },
  { id: 'orques', name: 'Orcs', color: '#6f8a46', depth: 2 },
  { id: 'orques-sang', name: 'Orcs du sang', color: '#b0202e', depth: 3 },
  { id: 'orques-arides', name: 'Orcs des terres arides', color: '#e0955a', depth: 3 },
  { id: 'orques-forets', name: 'Orcs des forêts', color: '#2f4426', depth: 3 },
  { id: 'heshlir', name: "Hesh'lir", color: '#5c544e', depth: 1 },
  { id: 'nashmur', name: "Nash'mur", color: '#2c4a6e', depth: 1 },
  { id: 'autres', name: 'Les Autres', color: '#7a5aa8', depth: 0 },
  { id: 'gardiens', name: 'Gardiens', color: '#a483c9', depth: 1 },
  { id: 'les-neuf', name: 'Les Neuf (dieux)', short: 'Les Neuf', color: '#d8ccb4', depth: 2 },
  { id: 'titans', name: 'Titans', color: '#8e2a1f', depth: 1 },
  { id: 'nids-morts', name: 'Nimors', color: '#3a2448', depth: 1 },
];
// short : nom affiché sur la carte (par défaut, le nom).
window.FACTIONS.forEach((f) => { if (!f.short) f.short = f.name; });
(() => {
  const seen = new Map();
  for (const f of window.FACTIONS) {
    const c = f.color.toLowerCase();
    if (seen.has(c)) console.warn(`Même couleur pour « ${seen.get(c)} » et « ${f.name} » (${c})`);
    seen.set(c, f.name);
  }
})();
