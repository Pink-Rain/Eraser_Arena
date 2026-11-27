# Eraser Arena

Le jeu de cartes du monde d'Eraser. Les héros, les dieux et les monstres du Codex, chacun en carte.

**La page :** https://pink-rain.github.io/Eraser_Arena/ (une fois GitHub Pages activé, voir plus bas)

## Ce qu'il y a dans le dépôt

- `index.html` : la page publique. Toutes les cartes du Codex, rangées par rareté, avec une recherche,
  un filtre par faction (une faction montre aussi ses sous-factions) et un filtre par rareté.
  Une carte s'ouvre en grand ; un clic la retourne ; les flèches (ou un balayage sur téléphone) passent à la voisine.
- `data/codex.json` : les fiches et les étiquettes du Codex d'Eraser, exportées de l'artefact.
  C'est la seule source de la page : la mettre à jour suffit à changer les cartes affichées.
- `atelier/` : le labo des visuels (cadres, logos, silhouettes). La page réutilise directement
  `atelier/carte/cadre.js`, `logos.js` et `silhouettes.js` : une carte retouchée dans l'atelier
  change aussi sur la page. Voir `atelier/README.md`.

## Activer la page GitHub

Une seule fois, dans le dépôt sur GitHub : **Settings → Pages → Build and deployment**,
source **Deploy from a branch**, branche **main**, dossier **/ (root)**. La page est en ligne
une minute plus tard, et se met à jour à chaque fusion dans `main`.

GitHub Pages rend la page publique, même si le dépôt devient privé (selon l'offre GitHub).

## Mettre à jour les cartes

Les fiches vivent dans l'artefact « Codex d'Eraser » sur claude.ai. Pour que la page suive,
demander à Claude de réexporter le Codex dans `data/codex.json`. Le fichier garde la même forme :

```json
{ "exportedAt": "2026-11-27",
  "tags": [{ "id": "titans", "name": "Titans", "parentId": "autres", "color": "#8e2a1f", "logo": "…" }],
  "entries": [{ "id": "c-marggorn", "title": "Marggorn", "rarity": "legendaire", "honor": "…",
                "tagIds": ["titans"], "factionId": "titans", "ability": "…", "flavor": "…",
                "attack": 3, "life": 5, "description": "…" }] }
```

## Voir la page sur son ordinateur

Ouverte directement depuis le disque, la page ne peut pas lire `data/codex.json`. Lancer un petit serveur à la racine du dépôt :

```bash
python3 -m http.server 8000
```

puis ouvrir http://localhost:8000.
