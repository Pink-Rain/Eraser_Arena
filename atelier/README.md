# Atelier

Le labo où on fabrique les visuels des cartes, hors de l'application.

- `moteur/relief.js` et `moteur/helpers.js` viennent de [ClaudeIcones](https://github.com/Pink-Rain/ClaudeIcones)
  (le moteur de relief d'Eraser). Changements : la surface peut être rectangulaire
  (`Relief.setSize(largeur, hauteur)`), et `Relief.distanceField(masque)` donne des biseaux
  sur n'importe quelle forme.
- `carte/carte.js` dessine une carte au format TCG (63 × 88 mm, rendu en 512 × 716) en canvas 2D,
  style moderne en aplats (pas de relief, pas de métal) :
  - **cadre** : couleur pleine de la rareté en dégradé (gris foncé, gris, vert, bleu, violet, doré),
    lueur dans les fenêtres, encoches, pierres latérales, chevron (épique) ou couronne (légendaire) ;
  - **fond** : couleur de la faction en halo ; trame, rayons ou étincelles selon la rareté ;
  - **emblème** : pastille à la couleur de la faction, en haut à droite (symbole provisoire).
  Le moteur de relief n'est plus utilisé pour les cartes ; il reste là pour d'autres éléments.
- `carte/factions.js` : factions d'essai (noms et couleurs du Codex).

Ouvrir `carte/index.html` dans Chrome ou Chromium (`?faction=orques-sang`, `?only=rare,epique`).
Une carte se dessine en quelques millisecondes.
