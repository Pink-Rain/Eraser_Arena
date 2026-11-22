# Atelier

Le labo où on fabrique les visuels des cartes, hors de l'application.

- `moteur/relief.js` et `moteur/helpers.js` viennent de [ClaudeIcones](https://github.com/Pink-Rain/ClaudeIcones)
  (le moteur de relief d'Eraser). Changements : la surface peut être rectangulaire
  (`Relief.setSize(largeur, hauteur)`), et `Relief.distanceField(masque)` donne des biseaux
  sur n'importe quelle forme.
- `index.html` : la page de l'atelier (la même que l'artefact « Atelier des cartes ») : une carte par
  rareté sur le fond de la faction choisie ; un clic ouvre la carte en grand, un second la retourne.
- `carte/cadre.js` : tout le dessin de la carte, en canvas 2D.
  - **cadre** : base noire, la couleur de la rareté en touches (liserés, filigranes qui s'enrichissent
    de la très commune à la légendaire) ;
  - **face** : étoile d'emblème (provisoire) en haut, illustration, nom dans son cadre, puis
    attaque (losange) · faction · vie (écu), capacité centrée, citation en bas avec son filet ;
  - **dos** : nom, faction et rareté, description (celle de la fiche du Codex).
- `carte/factions.js` : factions d'essai (noms et couleurs du Codex).

Ouvrir `index.html` dans un navigateur. Le moteur de relief (`moteur/`) n'est plus utilisé pour les cartes.
