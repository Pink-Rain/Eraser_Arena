# Outils de silhouettes

1. `silhouette.py image sortie.json seuil|cool x0,y0,x1,y1 flou` : tire une silhouette pleine et lissée d'une
   image d'inspiration (fond uni conseillé), cadrée sur la tête et les épaules.
2. `traits.json` : les traits tracés à la main sur l'image (contour du crâne, orbites, visage, gueules…),
   en coordonnées de l'image d'origine, avec le même cadrage.
3. `verifie.py traits.json cle sortie.png zoom` : superpose les traits à l'image pour vérifier qu'ils tombent juste.
4. `assemble.py ../carte/silhouettes.js` : écrit le fichier des silhouettes (contour + traits) pour les cartes.

Il faut OpenCV et numpy (`pip install opencv-python-headless numpy`). Les images de référence ne sont pas
versionnées : ce ne sont pas les nôtres.
