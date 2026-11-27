# Eraser Arena

Le jeu de cartes du monde d'Eraser : ouvrir des paquets, collectionner les héros, les dieux et les monstres du Codex, puis (bientôt) les faire combattre.

**La page :** https://pink-rain.github.io/Eraser_Arena/ (une fois GitHub Pages activé, voir plus bas)

## Le jeu

Pour l'instant, on ouvre des paquets et on collectionne. Les combats viendront ensuite.

- **Accueil** : tes paquets, le paquet du jour (gratuit, un par jour, renouvelé à minuit), ta collection
  par rareté, tes dernières cartes.
- **Paquets** : 5 cartes par paquet, révélées de la plus modeste à la plus rare ; la dernière est au moins
  super rare. Avant d'être retournées, les grandes raretés brillent déjà ; une épique ou une légendaire
  éclate en étincelles. Les chances de tirage sont affichées.
- **Collection** : toutes les cartes, celles qui manquent en creux, le nombre d'exemplaires.
- **Profil** : tes chiffres, et enregistrer ou recharger ta sauvegarde (pour changer d'appareil).
- Trois paquets de bienvenue au premier lancement. La sauvegarde vit dans le navigateur.

## Ce qu'il y a dans le dépôt

- `index.html`, `app.js`, `app.css` : l'appli (les écrans).
- `jeu/regles.js` : les règles, en fonctions pures (tirage, paquet du jour, collection). Les chances
  de chaque rareté et la taille des paquets se règlent en haut du fichier.
- `jeu/stockage.js` : la sauvegarde. Aujourd'hui dans le navigateur ; demain, un compte en ligne
  prendra sa place sans toucher aux règles.
- `jeu/donnees.js` : lit les cartes dans `data/codex.json`. `jeu/rendu.js` : les dessine (avec un cache).
- `codex.html` : le Codex, toutes les cartes du jeu, même celles qu'on n'a pas.
- `data/codex.json` : les fiches et les étiquettes du Codex d'Eraser, exportées de l'artefact.
- `atelier/` : le labo des visuels (cadres, logos, silhouettes), utilisé directement par le jeu.
- `tests/` : les tests des règles (`npm test`, sans rien installer).

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
