// Eraser Arena — l'appli : menu, accueil, ouverture de paquets, collection, profil.
// Les règles vivent dans jeu/regles.js, la sauvegarde dans jeu/stockage.js ; ce fichier ne fait que l'écran.
import { chargerCodex, carteDe, enfants, descendance } from './jeu/donnees.js';
import * as R from './jeu/regles.js';
import { stockageLocal as stockage } from './jeu/stockage.js';
import { face, revers, dos, prechauffer } from './jeu/rendu.js';

/* ---------- petits outils ---------- */
const $ = (id) => document.getElementById(id);
function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'style') el.style.cssText = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  el.append(...kids.flat().filter((x) => x != null && x !== false));
  return el;
}
// replaceChildren sans les trous (null, false) qu'il écrirait en texte.
const remplacer = (el, ...kids) => el.replaceChildren(...kids.filter((x) => x != null && x !== false));
const RAR = window.Cadre.RARITIES;
const DE_HAUT_EN_BAS = [...R.RARETES].reverse();
const pluriel = (n, un, plus) => n + ' ' + (n > 1 ? plus : un);
const hasard = () => crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
const sansAnimation = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
let minuteur = null; // le rafraîchissement d'un écran (compte à rebours…)

let toastT;
function toast(msg) {
  const t = $('toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2600);
}

/* ---------- état ---------- */
let codex = null;
let etat = null;
const carte = (id) => carteDe(codex.tags, codex.parId.get(id));

function changer(nouvel) {
  etat = nouvel;
  if (!stockage.sauver(etat)) toast('Le navigateur refuse de garder la sauvegarde.');
  majMenu();
}

function majMenu() {
  const p = $('pastillePaquets');
  p.hidden = !etat.paquets; p.textContent = etat.paquets;
  const nom = ecranCourant();
  for (const a of document.querySelectorAll('.onglet')) {
    if (a.dataset.ecran === nom) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  }
}

/* ---------- routes ---------- */
const ECRANS = { accueil, paquets, collection, combat, profil };
const ecranCourant = () => { const n = location.hash.slice(1); return n in ECRANS ? n : 'accueil'; };
function afficher() {
  clearInterval(minuteur); minuteur = null;
  const nom = ecranCourant();
  const main = $('ecran');
  main.replaceChildren();
  ECRANS[nom](main);
  majMenu();
  document.title = (nom === 'accueil' ? '' : titres[nom] + ' · ') + 'Eraser Arena';
}
const titres = { paquets: 'Paquets', collection: 'Collection', combat: 'Combat', profil: 'Profil' };
addEventListener('hashchange', () => { afficher(); scrollTo(0, 0); });

/* ---------- morceaux communs ---------- */
function entete(surtitre, titre, chapo) {
  return h('div', { class: 'ecran-titre' }, h('span', { class: 'surtitre' }, surtitre), h('h1', {}, titre), chapo ? h('p', { class: 'chapo' }, chapo) : null);
}
function paquetVisuel(attrs = {}, mini = false) {
  return h(attrs.onclick ? 'button' : 'div', { class: 'paquet' + (mini ? ' mini' : ''), type: attrs.onclick ? 'button' : null, ...attrs },
    h('span', { class: 'enveloppe' }),
    h('span', { class: 'embleme', 'aria-hidden': 'true' }, h('span', { class: 'lettre' }, 'E'), h('span', { class: 'nom' }, 'ERASER'), h('span', { class: 'sous' }, R.TAILLE_PAQUET + ' cartes')));
}
function listeRaretes(lignes) {
  return h('ul', { class: 'raretes' }, lignes.map(([r, txt, part]) =>
    h('li', {}, h('span', {}, RAR[r].label), h('span', { class: 'barre' }, h('i', { style: `--p:${Math.round(part * 100)}%;--c:${RAR[r].c}` })), h('b', {}, txt))));
}
function duree(ms) {
  const m = Math.max(1, Math.ceil(ms / 60000)); const hh = Math.floor(m / 60), mm = m % 60;
  return hh ? `${hh} h ${String(mm).padStart(2, '0')}` : `${mm} min`;
}
// Une vignette de carte, dessinée seulement quand elle approche de l'écran.
const observateur = 'IntersectionObserver' in window ? new IntersectionObserver((l) => {
  for (const it of l) if (it.isIntersecting) { peindre(it.target); observateur.unobserve(it.target); }
}, { rootMargin: '400px 0px' }) : null;
function peindre(el) { if (!el.querySelector('canvas')) el.prepend(face(el.dataset.id, carte(el.dataset.id))); }
function vignette(id, liste, extra = null) {
  const c = carte(id);
  const b = h('button', { class: 'vignette', type: 'button', 'data-id': id, style: '--c:' + RAR[c.rarity].c,
    'aria-label': c.name + (c.honor ? ', ' + c.honor : '') + ' — ' + RAR[c.rarity].label + '. Ouvrir en grand',
    onclick: () => visionneuse(liste, liste.indexOf(id)) }, extra);
  if (observateur) observateur.observe(b); else peindre(b);
  return b;
}

/* ---------- accueil ---------- */
function accueil(main) {
  const maintenant = new Date();
  const premier = !etat.stats.paquetsOuverts;
  main.append(entete(
    maintenant.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
    premier ? 'Bienvenue sur Eraser' : 'Te revoilà',
    premier ? `Trois paquets t'attendent pour commencer ta collection. Ouvre-les, et reviens chaque jour chercher le paquet du jour.`
      : `Les héros, les dieux et les monstres d'Eraser n'attendent que toi.`));

  const t = h('div', { class: 'tableau' });
  // Paquets à ouvrir.
  const n = etat.paquets;
  t.append(h('section', { class: 'panneau p-paquets', 'aria-label': 'Tes paquets' },
    paquetVisuel({}, true),
    h('div', { class: 'texte' },
      h('h2', {}, 'Tes paquets'),
      h('div', { class: 'grand-nombre' }, String(n), h('small', {}, n > 1 ? 'paquets à ouvrir' : 'paquet à ouvrir')),
      n ? h('a', { class: 'btn principal', href: '#paquets' }, 'Ouvrir un paquet')
        : h('p', {}, 'Plus de paquet pour l\'instant. Reviens demain pour le paquet du jour.'))));

  // Paquet du jour.
  const jour = h('section', { class: 'panneau p-jour', 'aria-label': 'Paquet du jour' });
  const dessinerJour = () => {
    const dispo = R.paquetDuJourDispo(etat);
    jour.classList.toggle('dispo', dispo);
    remplacer(jour, h('h2', {}, 'Paquet du jour'),
      dispo ? h('p', {}, 'Un paquet gratuit, chaque jour. Celui d\'aujourd\'hui est prêt.')
        : h('p', {}, 'Récupéré. Le prochain arrive dans ', h('span', { class: 'compte-a-rebours' }, duree(R.avantProchainPaquet())), '.'),
      dispo ? h('div', { class: 'actions' }, h('button', { class: 'btn principal', type: 'button', onclick: () => {
        changer(R.prendrePaquetDuJour(etat)); toast('Paquet du jour récupéré !'); afficher();
      } }, 'Récupérer le paquet')) : null);
  };
  dessinerJour();
  minuteur = setInterval(dessinerJour, 30000);
  t.append(jour);

  // Collection.
  const pr = R.progression(etat, codex.cartes);
  t.append(h('section', { class: 'panneau p-collection', 'aria-label': 'Ta collection' },
    h('h2', {}, 'Collection'),
    h('div', { class: 'grand-nombre' }, String(pr.possedees), h('small', {}, 'sur ' + pr.total + ' cartes')),
    h('div', { class: 'barre' }, h('i', { style: `--p:${(pr.possedees / pr.total) * 100}%` })),
    listeRaretes(DE_HAUT_EN_BAS.filter((r) => pr.parRarete[r]).map((r) => {
      const p = pr.parRarete[r]; return [r, p.possedees + '/' + p.total, p.possedees / p.total];
    })),
    h('div', { class: 'actions' }, h('a', { class: 'btn discret', href: '#collection' }, 'Voir la collection'))));

  // Dernières cartes.
  const derniers = R.dernieresCartes(etat, 10).filter((id) => codex.parId.has(id));
  t.append(h('section', { class: 'panneau p-derniers', 'aria-label': 'Tes dernières cartes' },
    h('h2', {}, 'Dernières cartes tirées'),
    derniers.length ? h('div', { class: 'bande' }, derniers.map((id) => vignette(id, derniers)))
      : h('p', {}, 'Rien encore. Ouvre ton premier paquet pour commencer ta collection.')));

  // À venir.
  t.append(h('section', { class: 'panneau', 'aria-label': 'Bientôt' },
    h('h2', {}, 'Bientôt dans l\'arène'),
    h('ul', { class: 'bientot-liste' },
      h('li', {}, h('strong', {}, 'Combats'), 'Ton deck contre une IA, puis contre tes amis.'),
      h('li', {}, h('strong', {}, 'Quêtes'), 'Des défis qui rapportent des paquets.'),
      h('li', {}, h('strong', {}, 'Comptes'), 'Garder ta collection partout, et voir celle des autres.'))));
  main.append(t);
}

/* ---------- ouverture de paquets ---------- */
function paquets(main) {
  main.append(entete('Paquets', 'Ouvrir un paquet',
    `${R.TAILLE_PAQUET} cartes par paquet, révélées de la plus modeste à la plus rare. La dernière est au moins ${RAR[R.GARANTIE_DERNIERE].label.toLowerCase()}.`));
  const zone = h('div');
  main.append(zone);
  scelle(zone);
}

function tableChances() {
  const ord = R.chances(codex.cartes), der = R.chances(codex.cartes, R.GARANTIE_DERNIERE);
  const pc = (x) => (x * 100 >= 10 ? Math.round(x * 100) : (x * 100).toFixed(1).replace('.', ',')) + ' %';
  return h('details', { class: 'chances' }, h('summary', {}, 'Chances de tirage'),
    h('p', { style: 'margin:8px 0 0' }, 'Pour chacune des quatre premières cartes :'),
    listeRaretes(DE_HAUT_EN_BAS.filter((r) => ord[r]).map((r) => [r, pc(ord[r]), ord[r]])),
    h('p', { style: 'margin:12px 0 0' }, 'Pour la dernière :'),
    listeRaretes(DE_HAUT_EN_BAS.filter((r) => der[r]).map((r) => [r, pc(der[r]), der[r]])));
}

function scelle(zone) {
  if (!etat.paquets) {
    const dispo = R.paquetDuJourDispo(etat);
    zone.replaceChildren(h('div', { class: 'scene' },
      paquetVisuel({ 'aria-disabled': 'true', style: 'opacity:.35;filter:grayscale(.6)' }),
      h('p', { class: 'consigne' }, 'Tu n\'as plus de paquet.'),
      dispo ? h('button', { class: 'btn principal', type: 'button', onclick: () => { changer(R.prendrePaquetDuJour(etat)); scelle(zone); } }, 'Récupérer le paquet du jour')
        : h('p', { class: 'stock' }, 'Prochain paquet du jour dans ' + duree(R.avantProchainPaquet())),
      h('a', { class: 'btn discret', href: '#collection' }, 'Voir ma collection'),
      tableChances()));
    return;
  }
  let parti = false;
  const p = paquetVisuel({ 'aria-label': 'Ouvrir le paquet', onclick: () => {
    if (parti) return; parti = true;
    const r = R.ouvrirPaquet(etat, codex.cartes, hasard);
    changer(r.etat); // sauvegardé tout de suite : recharger la page ne relance pas le tirage
    r.tirage.forEach((t) => { face(t.id, carte(t.id)); }); // dessinées pendant que le paquet se déchire
    if (sansAnimation()) return devoiler(zone, r.tirage);
    p.classList.add('dechire');
    setTimeout(() => devoiler(zone, r.tirage), 780);
  } });
  zone.replaceChildren(h('div', { class: 'scene' },
    p,
    h('p', { class: 'consigne' }, 'Touche le paquet pour l\'ouvrir'),
    h('p', { class: 'stock' }, etat.paquets > 1 ? `Encore ${etat.paquets - 1} après celui-ci` : 'C\'est ton dernier paquet'),
    tableChances()));
}

function devoiler(zone, tirage) {
  const ids = tirage.map((t) => t.id);
  const rangee = h('div', { class: 'tirage' });
  const apres = h('div', { class: 'apres' });
  let restantes = tirage.length;

  const fin = () => remplacer(apres,
    etat.paquets ? h('button', { class: 'btn principal', type: 'button', onclick: () => scelle(zone) }, `Ouvrir le suivant (${etat.paquets})`) : null,
    h('a', { class: 'btn', href: '#collection' }, 'Voir la collection'),
    h('a', { class: 'btn discret', href: '#accueil' }, 'Accueil'));

  const cartes = tirage.map((t, i) => {
    const c = carte(t.id), r = RAR[t.rarity];
    const el = h('button', { class: 'tiree', type: 'button', style: `--i:${i};--c:${r.c}`, 'data-rang': r.rank,
      'aria-label': 'Carte face cachée ' + (i + 1) + '. La retourner' },
      h('span', { class: 'tourne' }, h('span', { class: 'face dos' }, dos()), h('span', { class: 'face avant' }, face(t.id, c))),
      h('span', { class: 'marque-carte' + (t.nouvelle ? ' nouvelle' : '') }, t.nouvelle ? 'Nouvelle !' : '×' + t.exemplaires));
    el.addEventListener('click', () => {
      if (el.classList.contains('retournee')) return visionneuse(ids, i);
      retourner(el, t, c);
      if (--restantes === 0) fin();
    });
    el._retourner = () => { if (!el.classList.contains('retournee')) { retourner(el, t, c); if (--restantes === 0) fin(); } };
    return el;
  });
  rangee.append(...cartes);
  apres.append(h('button', { class: 'btn', type: 'button', onclick: (e) => {
    e.currentTarget.disabled = true;
    cartes.forEach((el, i) => setTimeout(() => el._retourner(), sansAnimation() ? 0 : i * 320));
  } }, 'Tout retourner'));
  zone.replaceChildren(rangee, apres);
  cartes[0].focus({ preventScroll: true });
}

function retourner(el, t, c) {
  el.classList.add('retournee');
  el.setAttribute('aria-label', c.name + ' — ' + RAR[t.rarity].label + (t.nouvelle ? ', nouvelle' : ', exemplaire ' + t.exemplaires) + '. Ouvrir en grand');
  const rang = RAR[t.rarity].rank;
  if (rang < 4 || sansAnimation()) return;
  // Épique et légendaire : un éclat de lumière et des étincelles ; la légendaire fait trembler l'écran.
  const n = rang === 5 ? 34 : 20;
  const eclat = h('span', { class: 'eclat', 'aria-hidden': 'true' }, h('span', { class: 'flash' }),
    Array.from({ length: n }, (_, k) => {
      const a = (k / n) * Math.PI * 2 + Math.random() * .4, d = 90 + Math.random() * (rang === 5 ? 150 : 90);
      return h('span', { class: 'p', style: `--x:${Math.cos(a) * d}px;--y:${Math.sin(a) * d}px;--d:${200 + Math.random() * 250}` });
    }));
  el.append(eclat);
  setTimeout(() => eclat.remove(), 1700);
  if (rang === 5) { document.body.classList.add('secousse'); setTimeout(() => document.body.classList.remove('secousse'), 900); }
}

/* ---------- collection ---------- */
const filtre = { rarete: '', faction: '', miennes: false };
function collection(main) {
  const pr = R.progression(etat, codex.cartes);
  const exemplaires = Object.values(etat.collection).reduce((a, b) => a + b, 0);
  main.append(entete('Collection', 'Ta collection',
    `${pr.possedees} cartes sur ${pr.total}` + (exemplaires > pr.possedees ? `, ${pluriel(exemplaires, 'exemplaire', 'exemplaires')} en tout.` : '.')));

  const seg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Rareté' });
  const presentes = DE_HAUT_EN_BAS.filter((r) => pr.parRarete[r]);
  const dessinerSeg = () => seg.replaceChildren(...['', ...presentes].map((r) => h('button', {
    type: 'button', 'aria-pressed': filtre.rarete === r ? 'true' : 'false',
    onclick: () => { filtre.rarete = r; dessinerSeg(); dessinerGrille(); },
  }, r ? h('span', { class: 'pt', style: '--c:' + RAR[r].c }) : null, r ? RAR[r].label : 'Toutes')));
  dessinerSeg();

  const sel = h('select', { 'aria-label': 'Faction', onchange: (e) => { filtre.faction = e.target.value; dessinerGrille(); } }, h('option', { value: '' }, 'Toutes les factions'));
  const parcourir = (parent, prof) => {
    for (const t of enfants(codex.tags, parent)) {
      const set = descendance(codex.tags, t.id);
      const n = codex.cartes.filter((e) => (e.tagIds || []).some((x) => set.has(x))).length;
      if (n) sel.append(h('option', { value: t.id }, '   '.repeat(prof) + t.name));
      parcourir(t.id, prof + 1);
    }
  };
  parcourir(null, 0);
  sel.value = filtre.faction;
  const coche = h('input', { type: 'checkbox', onchange: (e) => { filtre.miennes = e.target.checked; dessinerGrille(); } });
  coche.checked = filtre.miennes;
  main.append(h('div', { class: 'filtres' }, sel, seg, h('label', { class: 'case' }, coche, 'Seulement les miennes')));

  const zone = h('div');
  main.append(zone);
  function dessinerGrille() {
    const set = filtre.faction ? descendance(codex.tags, filtre.faction) : null;
    const liste = codex.cartes.filter((e) => (!filtre.rarete || e.rarity === filtre.rarete)
      && (!set || (e.tagIds || []).some((x) => set.has(x)))
      && (!filtre.miennes || etat.collection[e.id]));
    const visibles = liste.filter((e) => etat.collection[e.id]).map((e) => e.id);
    zone.replaceChildren();
    if (!liste.length) { zone.append(h('p', { class: 'vide' }, filtre.miennes && !pr.possedees ? 'Tu n\'as encore aucune carte. Va ouvrir un paquet !' : 'Aucune carte ne correspond.')); return; }
    for (const r of DE_HAUT_EN_BAS) {
      const dans = liste.filter((e) => e.rarity === r);
      if (!dans.length) continue;
      const a = dans.filter((e) => etat.collection[e.id]).length;
      const grille = h('div', { class: 'grille' });
      for (const e of dans) {
        const n = etat.collection[e.id] || 0;
        if (n) {
          const c = carte(e.id);
          grille.append(h('div', { class: 'cellule' },
            vignette(e.id, visibles, n > 1 ? h('span', { class: 'nombre', 'aria-label': n + ' exemplaires' }, '×' + n) : null),
            h('span', { class: 'legende' }, c.faction.short + (c.faction2 ? ' · ' + c.faction2.short : ''))));
        } else {
          grille.append(h('div', { class: 'cellule' },
            h('div', { class: 'vignette manquante', style: '--c:' + RAR[r].c, role: 'img', 'aria-label': 'Carte ' + RAR[r].label.toLowerCase() + ' pas encore tirée' },
              h('span', { class: 'q', 'aria-hidden': 'true' }, '?'), h('small', {}, 'Pas encore tirée')),
            h('span', { class: 'legende' }, ' ')));
        }
      }
      zone.append(h('section', { class: 'groupe', 'aria-label': RAR[r].label },
        h('div', { class: 'groupe-tete', style: '--c:' + RAR[r].c }, h('h2', {}, RAR[r].label), h('span', {}, a + ' / ' + dans.length)),
        grille));
    }
  }
  dessinerGrille();
}

/* ---------- combat (à venir) ---------- */
function combat(main) {
  main.append(entete('Combat', 'L\'arène se prépare',
    'Les combats arrivent après les paquets et la collection : d\'abord ton deck contre une IA, puis contre tes amis.'));
  main.append(h('div', { class: 'fiche' },
    h('p', { class: 'note' }, 'Les cartes ont déjà leur attaque (le losange) et leur vie (l\'écu). Les règles du combat restent à écrire ensemble, peut-être en reprenant celles du jeu de rôle.'),
    h('div', { class: 'actions' }, h('a', { class: 'btn', href: '#collection' }, 'Préparer ma collection'))));
}

/* ---------- profil ---------- */
function profil(main) {
  const pr = R.progression(etat, codex.cartes);
  const depuis = new Date(etat.creeLe).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  main.append(entete('Profil', 'Ton profil', 'Joueur depuis le ' + depuis + '.'));
  const fiche = h('div', { class: 'fiche' });
  fiche.append(h('div', { class: 'chiffres' },
    h('div', { class: 'chiffre' }, h('b', {}, String(pr.possedees)), h('span', {}, 'cartes différentes')),
    h('div', { class: 'chiffre' }, h('b', {}, String(etat.stats.paquetsOuverts)), h('span', {}, 'paquets ouverts')),
    h('div', { class: 'chiffre' }, h('b', {}, String(etat.stats.cartesTirees)), h('span', {}, 'cartes tirées'))));
  fiche.append(h('p', { class: 'note' }, h('strong', {}, 'Comptes : bientôt. '),
    'Pour l\'instant, ta collection est gardée dans ce navigateur, sur cet appareil. Pour la déplacer, enregistre-la ici puis recharge-la ailleurs.'));

  const fichier = h('input', { type: 'file', accept: 'application/json,.json', hidden: true, onchange: async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const brut = JSON.parse(await f.text());
      if (!brut || typeof brut.collection !== 'object') throw new Error('pas une sauvegarde');
      changer(R.normaliser(brut)); toast('Sauvegarde chargée'); afficher();
    } catch (_) { toast('Ce fichier n\'est pas une sauvegarde d\'Eraser Arena.'); }
  } });
  let arme = false;
  const raz = h('button', { class: 'btn danger', type: 'button', onclick: () => {
    if (!arme) { arme = true; raz.textContent = 'Sûr ? Toute la collection sera perdue'; setTimeout(() => { arme = false; raz.textContent = 'Recommencer à zéro'; }, 4000); return; }
    stockage.effacer(); changer(R.nouvelEtat()); toast('Nouvelle partie : trois paquets t\'attendent'); location.hash = '#accueil'; afficher();
  } }, 'Recommencer à zéro');
  fiche.append(h('div', { class: 'actions' },
    h('button', { class: 'btn', type: 'button', onclick: () => {
      const url = URL.createObjectURL(new Blob([JSON.stringify(etat, null, 1)], { type: 'application/json' }));
      h('a', { href: url, download: 'eraser-arena-sauvegarde.json' }).click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } }, 'Enregistrer ma sauvegarde'),
    h('button', { class: 'btn', type: 'button', onclick: () => fichier.click() }, 'Charger une sauvegarde'),
    fichier, raz));
  fiche.append(h('p', {}, h('a', { href: 'codex.html' }, 'Le Codex'), ' montre toutes les cartes du jeu, même celles que tu n\'as pas.'));
  main.append(fiche);
}

/* ---------- carte en grand ---------- */
const vis = { liste: [], i: 0 };
function montrer(i) {
  const n = vis.liste.length; if (!n) return;
  vis.i = (i + n) % n;
  const id = vis.liste[vis.i], c = carte(id);
  $('devant').replaceChildren(face(id, c));
  $('arriere').replaceChildren(revers(id, c));
  $('grande').setAttribute('aria-pressed', 'false');
  $('grande').setAttribute('aria-label', c.name + ' — retourner la carte');
  $('prec').hidden = $('suiv').hidden = n < 2;
}
function visionneuse(liste, i) {
  vis.liste = liste; montrer(i);
  if (!$('visionneuse').open) $('visionneuse').showModal();
  $('grande').focus();
}
$('grande').addEventListener('click', () => { const g = $('grande'); g.setAttribute('aria-pressed', g.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'); });
$('fermer').addEventListener('click', () => $('visionneuse').close());
$('prec').addEventListener('click', () => montrer(vis.i - 1));
$('suiv').addEventListener('click', () => montrer(vis.i + 1));
$('plateau').addEventListener('click', (e) => { if (e.target.id === 'plateau') $('visionneuse').close(); });
$('visionneuse').addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') { e.preventDefault(); montrer(vis.i - 1); }
  if (e.key === 'ArrowRight') { e.preventDefault(); montrer(vis.i + 1); }
});
let x0 = null;
$('grande').addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
$('grande').addEventListener('touchend', (e) => {
  if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null;
  if (Math.abs(dx) > 50) { e.preventDefault(); montrer(vis.i + (dx < 0 ? 1 : -1)); }
});

/* ---------- démarrage ---------- */
(async () => {
  try {
    codex = await chargerCodex();
    try {
      await Promise.all(['700 26px "Cinzel"', '600 15px "Cinzel"', '500 19px "Alegreya Sans"', '600 15px "Alegreya Sans"', 'italic 17px "Alegreya"', '118px "IM Fell English SC"']
        .map((f) => document.fonts.load(f)));
    } catch (_) {}
    const brut = stockage.charger();
    etat = R.normaliser(brut);
    if (!brut) stockage.sauver(etat);
    afficher();
    // Les cartes déjà possédées sont dessinées à l'avance, pendant que rien ne se passe.
    prechauffer(Object.keys(etat.collection).filter((id) => codex.parId.has(id)).map((id) => [id, carte(id)]));
  } catch (err) {
    console.error(err);
    $('ecran').replaceChildren(h('p', { class: 'etat' },
      'Le jeu n\'a pas pu se charger. Ouvert directement depuis le disque, la page ne peut pas lire data/codex.json : lance un petit serveur (python3 -m http.server) ou ouvre la page GitHub.'));
  }
})();
