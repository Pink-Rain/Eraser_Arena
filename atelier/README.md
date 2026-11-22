# Atelier

Le labo où on fabrique les visuels des cartes, hors de l'application.

- `moteur/relief.js` et `moteur/helpers.js` viennent de [ClaudeIcones](https://github.com/Pink-Rain/ClaudeIcones)
  (le moteur de relief d'Eraser). Changements : la surface peut être rectangulaire
  (`Relief.setSize(largeur, hauteur)`), et `Relief.distanceField(masque)` donne des biseaux
  sur n'importe quelle forme.
- `carte/carte.js` fabrique une carte au format TCG (63 × 88 mm, rendu en 512 × 716), style TCG moderne :
  - **cadre** : métal lisse à la couleur de la rareté (gris foncé, gris, vert, bleu, violet, doré),
    ornements qui montent avec elle (coins, pierres latérales, crête et ailes, couronne) ;
  - **fond** : couleur de la faction, peint à plat ; reflets et motifs discrets selon la rareté ;
  - **emblème** : médaillon émaillé à la couleur de la faction, en haut à droite (symbole provisoire).
- `carte/factions.js` : factions d'essai (noms et couleurs du Codex).

Ouvrir `carte/index.html` dans Chrome ou Chromium (`?faction=orques-sang`, `?only=rare,epique`).
Une carte se rend en 0,5 à 1 s sur ordinateur : dans le jeu, les images seront générées une fois puis gardées.
