# Atelier

Le labo où on fabrique les visuels des cartes, hors de l'application.

- `moteur/relief.js` et `moteur/helpers.js` viennent de [ClaudeIcones](https://github.com/Pink-Rain/ClaudeIcones)
  (le moteur de relief d'Eraser). Changements : la surface peut être rectangulaire
  (`Relief.setSize(largeur, hauteur)`), et `Relief.distanceField(masque)` donne des biseaux
  sur n'importe quelle forme.
- `codex.html` : le Codex d'Eraser (source de l'artefact « Codex d'Eraser »). Étiquettes, factions et
  fiches ; chaque fiche est rendue directement en carte (agrandir, retourner, modifier avec aperçu),
  et l'onglet Atelier montre les six raretés et les logos. Ses données vivent dans la base de
  l'artefact (claude.ai) : ouvert ailleurs, il s'affiche vide.
- `index.html` : l'ancienne page de l'atelier (la même que l'artefact « Atelier des cartes ») : une carte par
  rareté sur le fond de la faction choisie ; un clic ouvre la carte en grand, un second la retourne.
- `carte/cadre.js` : tout le dessin de la carte, en canvas 2D.
  - **cadre** : base noire, la couleur de la rareté en touches (liserés, filigranes qui s'enrichissent
    de la très commune à la légendaire) ;
  - **face** : logo de la faction lié au cadre (une mise en scène par rareté, sans rien effacer), illustration, nom dans son cadre, puis
    attaque (losange) · titre honorifique · vie (écu), capacité centrée, citation en bas avec son filet ;
  - **dos** : nom, faction et rareté, description (celle de la fiche du Codex).
- `carte/logos.js` : les 21 logos des factions, en traits fins dans le style des filigranes du cadre
  (une boîte de 100 × 100, opérations « add » et « cut »).
- `carte/factions.js` : les factions (noms, couleurs et rangement du Codex), sans couleur en double.

Ouvrir `index.html` dans un navigateur. Le moteur de relief (`moteur/`) n'est plus utilisé pour les cartes.
