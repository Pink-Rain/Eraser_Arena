// Eraser Arena — silhouettes des peuples, en ombre noire.
// Une silhouette par faction (clé = identifiant du logo de la faction), dans une boîte de w × 1000.
// Elles sont tirées d'images d'inspiration puis fortement lissées : l'allure, pas le dessin d'origine.
// Détails facultatifs, dessinés dans la couleur du cadre : yeux (points lumineux), liseré du haut.
(function (root) {
  'use strict';
  const SILHOUETTES = {
    // Näadrian : crâne penché, grand col dressé, épaules dans la cape.
    naadrian: {
      w: 928, h: 1000,
      d: 'M698 195 Q678 173 658 159 Q639 145 602 130 Q565 114 529 108 Q492 101 463 104 Q435 106 411 114 Q387 121 362 134 Q337 147 319 170 Q301 193 296 206 Q291 219 286 224 Q281 229 261 230 Q240 230 219 235 Q198 240 182 250 Q167 260 160 266 Q154 273 149 286 Q144 299 145 320 Q147 342 174 401 Q201 461 227 543 Q253 626 252 633 Q252 641 243 658 Q235 675 237 697 Q239 719 225 738 Q211 757 194 773 Q178 789 155 804 Q132 819 122 829 Q111 840 110 856 Q109 873 116 884 Q123 895 134 885 Q145 874 151 875 Q157 876 163 883 Q170 891 171 900 Q172 910 165 923 Q158 936 143 951 Q127 966 105 967 Q82 967 74 966 Q67 964 61 967 Q56 969 44 968 Q33 967 23 976 Q13 985 7 988 Q0 990 0 994 Q0 998 365 998 Q730 998 727 984 Q724 969 712 955 Q701 941 684 933 Q667 925 660 919 Q654 913 650 902 Q645 891 646 873 Q647 855 636 828 Q626 801 625 769 Q624 737 630 710 Q636 683 637 655 Q639 627 651 593 Q663 559 667 555 Q672 551 682 546 Q693 541 699 533 Q706 525 708 520 Q709 515 708 506 Q706 497 707 483 Q708 469 712 455 Q716 441 727 429 Q739 417 743 385 Q747 353 748 328 Q748 302 743 279 Q739 255 728 236 Q717 217 698 195 Z',
      eyes: [[405, 428, 34, 24], [634, 458, 26, 20]],
      rim: true,
    },
  };
  root.Silhouettes = { SILHOUETTES, get: (id) => SILHOUETTES[id] || null };
}(window));
