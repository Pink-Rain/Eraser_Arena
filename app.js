// Eraser Arena — l'appli : menu, accueil, ouverture de paquets, collection, profil.
// Les règles vivent dans jeu/regles.js, la sauvegarde dans jeu/stockage.js ; ce fichier ne fait que l'écran.
import { chargerCodex, carteDe, enfants, descendance, typeCourt } from './jeu/donnees.js';
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

// Mode admin : pour tester tout le jeu (paquets à volonté, cartes une par une, paquets truqués).
// On l'active en bas du profil avec le code (ou en ouvrant la page avec ?admin) ; on le quitte depuis le profil.
// Il est retenu par ce navigateur seulement.
const CLE_ADMIN = 'eraser-arena:admin';
const admin = { actif: false, forcer: '', forcerFaction: '' };
{
  const q = new URLSearchParams(location.search);
  let demande = null;
  if (q.has('admin')) { demande = q.get('admin') !== '0'; history.replaceState(null, '', location.pathname + location.hash); }
  try {
    if (demande === true) localStorage.setItem(CLE_ADMIN, '1');
    if (demande === false) localStorage.removeItem(CLE_ADMIN);
    admin.actif = localStorage.getItem(CLE_ADMIN) === '1';
  } catch (_) { admin.actif = demande === true; }
}
function quitterAdmin() {
  admin.actif = false; admin.forcer = ''; admin.forcerFaction = '';
  try { localStorage.removeItem(CLE_ADMIN); } catch (_) {}
}
const carte = (id) => carteDe(codex, codex.parId.get(id));

function changer(nouvel) {
  etat = nouvel;
  if (!stockage.sauver(etat)) toast('Le navigateur refuse de garder la sauvegarde.');
  majMenu();
  const ch = $('chiffres'); if (ch) ch.replaceWith(chiffresProfil());
}

function majMenu() {
  const p = $('pastillePaquets');
  p.hidden = !etat.paquets; p.textContent = etat.paquets;
  $('chipAdmin').hidden = !admin.actif;
  const nom = ecranCourant();
  for (const a of document.querySelectorAll('.onglet')) {
    if (a.dataset.ecran === nom) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  }
}

/* ---------- routes ---------- */
const ECRANS = { accueil, paquets, collection, codex: (m) => codexEcran(m), combat, profil };
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
const titres = { paquets: 'Paquets', collection: 'Collection', codex: 'Codex', combat: 'Combat', profil: 'Profil' };
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
    const r = R.ouvrirPaquet(etat, admin.actif ? R.reserveForcee(codex.cartes, admin.forcer, admin.forcerFaction) : codex.cartes, hasard);
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
    admin.actif && (admin.forcer || admin.forcerFaction) ? h('p', { class: 'pastille-admin' }, 'Admin : paquet truqué — '
      + [admin.forcer && RAR[admin.forcer].label.toLowerCase(), admin.forcerFaction && codex.factions.get(admin.forcerFaction).nom].filter(Boolean).join(', ')) : null,
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

/* ---------- collection et codex : la même galerie ---------- */
// Collection : seulement tes cartes. Codex : toutes les cartes du jeu (et les cartes exemples).
const filtres = {
  collection: { tri: 'rarete', rarete: '', faction: '', type: '', q: '' },
  codex: { tri: 'faction', rarete: '', faction: '', type: '', q: '', exemples: true },
};
const ordreFactions = () => [...codex.factions.keys()];
function legendeDe(e) {
  const f = (e.factions || []).map((id) => codex.factions.get(id).court).join(' · ');
  return (f ? f + ' — ' : '') + typeCourt(codex, e);
}
function collection(main) { galerie(main, 'collection'); }
function codexEcran(main) { galerie(main, 'codex'); }

function galerie(main, mode) {
  const f = filtres[mode];
  const estCodex = mode === 'codex';
  const source = () => estCodex ? [...codex.cartes, ...(f.exemples ? codex.exemples : [])] : codex.cartes.filter((e) => etat.collection[e.id]);

  if (estCodex) {
    main.append(entete('Codex', 'Le Codex',
      `Toutes les cartes du monde d'Eraser : ${codex.cartes.length} cartes, et ${codex.exemples.length} cartes exemples qui montrent les raretés que chaque faction n'a pas encore.`));
  } else {
    const pr = R.progression(etat, codex.cartes);
    const exemplaires = Object.values(etat.collection).reduce((a, b) => a + b, 0);
    main.append(entete('Collection', 'Ta collection', pr.possedees
      ? `${pluriel(pr.possedees, 'carte', 'cartes')} sur ${pr.total}` + (exemplaires > pr.possedees ? `, ${pluriel(exemplaires, 'exemplaire', 'exemplaires')} en tout.` : '.')
      : 'Tu n\'as encore aucune carte.'));
    if (!pr.possedees) {
      main.append(h('div', { class: 'vide' }, h('p', {}, 'Ouvre un paquet pour commencer ta collection.'),
        h('div', { class: 'actions', style: 'justify-content:center' }, h('a', { class: 'btn principal', href: '#paquets' }, 'Ouvrir un paquet'), h('a', { class: 'btn', href: '#codex' }, 'Voir le Codex'))));
      return;
    }
  }

  const segment = (etiquette, options, cle) => {
    const seg = h('div', { class: 'seg', role: 'group', 'aria-label': etiquette });
    const dessiner = () => seg.replaceChildren(...options.map(([v, label, c]) => h('button', {
      type: 'button', 'aria-pressed': f[cle] === v ? 'true' : 'false',
      onclick: () => { f[cle] = v; dessiner(); dessinerGrille(); },
    }, c ? h('span', { class: 'pt', style: '--c:' + c }) : null, label)));
    dessiner();
    return seg;
  };
  const tout = [...codex.cartes, ...codex.exemples];
  const presentes = DE_HAUT_EN_BAS.filter((r) => (estCodex ? tout : source()).some((e) => e.rarity === r));
  const segTri = segment('Trier par', [['rarete', 'Par rareté'], ['faction', 'Par faction']], 'tri');
  const segRar = segment('Rareté', [['', 'Toutes'], ...presentes.map((r) => [r, RAR[r].label, RAR[r].c])], 'rarete');
  const recherche = h('input', { type: 'search', placeholder: 'Chercher un nom, un titre…', 'aria-label': 'Chercher une carte', autocomplete: 'off', value: f.q });
  let qt; recherche.addEventListener('input', () => { clearTimeout(qt); qt = setTimeout(() => { f.q = recherche.value.trim(); dessinerGrille(); }, 120); });
  const selFac = h('select', { 'aria-label': 'Faction', onchange: (e) => { f.faction = e.target.value; dessinerGrille(); } },
    h('option', { value: '' }, 'Toutes les factions'),
    ordreFactions().map((id) => h('option', { value: id }, codex.factions.get(id).nom)));
  selFac.value = f.faction;
  const selType = h('select', { 'aria-label': 'Type', onchange: (e) => { f.type = e.target.value; dessinerGrille(); } }, h('option', { value: '' }, 'Tous les types'));
  const parcourir = (parent, prof) => {
    for (const t of enfants(codex.tags, parent)) {
      const set = descendance(codex.tags, t.id);
      if (codex.cartes.some((e) => (e.tagIds || []).some((x) => set.has(x)))) selType.append(h('option', { value: t.id }, '   '.repeat(prof) + t.name));
      parcourir(t.id, prof + 1);
    }
  };
  parcourir(null, 0);
  selType.value = f.type;
  let caseExemples = null;
  if (estCodex) {
    const c = h('input', { type: 'checkbox', onchange: (e) => { f.exemples = e.target.checked; dessinerGrille(); } });
    c.checked = f.exemples;
    caseExemples = h('label', { class: 'case' }, c, 'Montrer les cartes exemples');
  }
  main.append(h('div', { class: 'filtres' }, recherche, segTri, segRar),
    h('div', { class: 'filtres' }, selFac, selType, caseExemples));

  const compte = h('p', { class: 'compte', 'aria-live': 'polite' });
  const zone = h('div');
  main.append(compte, zone);
  function dessinerGrille() {
    const tset = f.type ? descendance(codex.tags, f.type) : null;
    const q = norm(f.q);
    const liste = source().filter((e) => (!f.rarete || e.rarity === f.rarete)
      && (!tset || (e.tagIds || []).some((x) => tset.has(x)))
      && (!f.faction || (e.factions || []).includes(f.faction))
      && (!q || norm([e.title, e.honor, e.description, typeCourt(codex, e)].join(' ')).includes(q)))
      .sort((a, b) => R.RANG[b.rarity] - R.RANG[a.rarity] || !!a.exemple - !!b.exemple || a.title.localeCompare(b.title, 'fr'));
    const ids = liste.map((e) => e.id);
    compte.textContent = pluriel(liste.length, 'carte', 'cartes');
    zone.replaceChildren();
    if (!liste.length) { zone.append(h('p', { class: 'vide' }, 'Aucune carte ne correspond.')); return; }
    // Les groupes : une rareté, ou une faction (une carte bicolore est dans ses deux factions).
    const groupes = f.tri === 'faction'
      ? [...ordreFactions().map((id) => { const x = codex.factions.get(id); return { titre: x.nom, c: x.couleur, logo: x.logo, cartes: liste.filter((e) => (e.factions || []).includes(id)) }; }),
         { titre: 'Sans faction', c: 'var(--bone-faint)', cartes: liste.filter((e) => !e.factions) }]
      : DE_HAUT_EN_BAS.map((r) => ({ titre: RAR[r].label, c: RAR[r].c, cartes: liste.filter((e) => e.rarity === r) }));
    for (const g of groupes) {
      if (!g.cartes.length) continue;
      zone.append(h('section', { class: 'groupe', 'aria-label': g.titre },
        h('div', { class: 'groupe-tete', style: '--c:' + g.c }, g.logo ? logoFaction(g.logo, g.c) : null, h('h2', {}, g.titre), h('span', {}, String(g.cartes.length))),
        h('div', { class: 'grille' }, g.cartes.map((e) => {
          const n = etat.collection[e.id] || 0;
          return h('div', { class: 'cellule' + (e.exemple ? ' exemple' : '') },
            vignette(e.id, ids, !estCodex && n > 1 ? h('span', { class: 'nombre', 'aria-label': n + ' exemplaires' }, '×' + n) : null),
            h('span', { class: 'legende' }, legendeDe(e)));
        }))));
    }
  }
  dessinerGrille();
}
const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
// Le logo d'une faction, en petit, devant le titre de son groupe.
function logoFaction(logo, couleur) {
  const c = document.createElement('canvas'); c.width = c.height = 72; c.className = 'logo-faction';
  c.style.setProperty('--c', couleur); c.setAttribute('aria-hidden', 'true');
  window.Logos.draw(c.getContext('2d'), logo, 36, 36, 56, [[0, '#fff0bd'], [0.5, '#e3ad48'], [1, '#c88a2a']]);
  return c;
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
function chiffresProfil() {
  const pr = R.progression(etat, codex.cartes);
  return h('div', { class: 'chiffres', id: 'chiffres' },
    h('div', { class: 'chiffre' }, h('b', {}, String(pr.possedees)), h('span', {}, 'cartes différentes')),
    h('div', { class: 'chiffre' }, h('b', {}, String(etat.paquets)), h('span', {}, etat.paquets > 1 ? 'paquets à ouvrir' : 'paquet à ouvrir')),
    h('div', { class: 'chiffre' }, h('b', {}, String(etat.stats.paquetsOuverts)), h('span', {}, 'paquets ouverts')),
    h('div', { class: 'chiffre' }, h('b', {}, String(etat.stats.cartesTirees)), h('span', {}, 'cartes tirées')));
}
function profil(main) {
  const pr = R.progression(etat, codex.cartes);
  const depuis = new Date(etat.creeLe).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  main.append(entete('Profil', 'Ton profil', 'Joueur depuis le ' + depuis + '.'));
  const fiche = h('div', { class: 'fiche' });
  fiche.append(chiffresProfil());
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
  fiche.append(h('p', {}, h('a', { href: '#codex' }, 'Le Codex'), ' montre toutes les cartes du jeu, même celles que tu n\'as pas.'));
  fiche.append(admin.actif ? panneauAdmin() : entreeAdmin());
  main.append(fiche);
}

// L'entrée du mode admin, en bas du profil : un code, pour que les amis n'y touchent pas.
// Le code n'est pas écrit en clair ici, seulement son empreinte (pour le changer, il faut recalculer l'empreinte).
const EMPREINTE_ADMIN = 'afcc8e19';
const empreinte = (s) => { let x = 0x811c9dc5; for (const ch of s) { x ^= ch.codePointAt(0); x = Math.imul(x, 0x01000193) >>> 0; } return x.toString(16); };
function entreeAdmin() {
  const champ = h('input', { type: 'password', placeholder: 'Code admin', 'aria-label': 'Code admin', autocomplete: 'off' });
  const form = h('form', { class: 'entree-admin', hidden: true, onsubmit: (e) => {
    e.preventDefault();
    if (empreinte(norm(champ.value.trim())) !== EMPREINTE_ADMIN) { toast('Code incorrect'); champ.select(); return; }
    admin.actif = true;
    try { localStorage.setItem(CLE_ADMIN, '1'); } catch (_) {}
    toast('Mode admin activé'); afficher();
  } }, champ, h('button', { class: 'btn', type: 'submit' }, 'Entrer'));
  const lien = h('button', { class: 'lien-admin', type: 'button', onclick: () => { lien.hidden = true; form.hidden = false; champ.focus(); } }, 'Mode admin');
  return h('div', {}, lien, form);
}

// Le panneau admin : tester tout le jeu (paquets, cartes, paquets truqués…).
function panneauAdmin() {
  const panneau = h('section', { class: 'admin', 'aria-label': 'Mode admin' });
  const maj = (nouvel, msg) => { changer(nouvel); if (msg) toast(msg); dessiner(); };
  const bouton = (label, onclick, cls = 'btn') => h('button', { class: cls, type: 'button', onclick }, label);
  let recherche = '';
  let rechercheFocus = false;

  function dessiner() {
    // Paquets : un nombre libre, à ajouter, retirer ou fixer.
    const nb = h('input', { type: 'number', min: '0', step: '1', value: '10', 'aria-label': 'Nombre de paquets', class: 'nombre-admin' });
    const lire = () => Math.max(0, Math.floor(Number(nb.value)) || 0);
    const paquets = h('div', { class: 'bloc-admin' },
      h('h3', {}, 'Paquets'),
      h('p', {}, 'Tu as ', h('b', {}, String(etat.paquets)), etat.paquets > 1 ? ' paquets.' : ' paquet.'),
      h('div', { class: 'actions' },
        nb,
        bouton('Ajouter', () => maj(R.ajouterPaquets(etat, lire()), `+${lire()} paquets`), 'btn principal'),
        bouton('Retirer', () => maj(R.ajouterPaquets(etat, -lire()), `−${lire()} paquets`)),
        bouton('En avoir exactement', () => maj(R.fixerPaquets(etat, lire()), `${lire()} paquets`))),
      h('div', { class: 'actions' },
        bouton('+1', () => maj(R.ajouterPaquets(etat, 1), '+1 paquet'), 'btn discret'),
        bouton('+10', () => maj(R.ajouterPaquets(etat, 10), '+10 paquets'), 'btn discret'),
        bouton('+100', () => maj(R.ajouterPaquets(etat, 100), '+100 paquets'), 'btn discret'),
        bouton('Aucun', () => maj(R.fixerPaquets(etat, 0), 'Plus de paquet'), 'btn discret'),
        bouton(R.paquetDuJourDispo(etat) ? 'Paquet du jour : disponible' : 'Remettre le paquet du jour',
          () => maj(R.remettrePaquetDuJour(etat), 'Le paquet du jour est de nouveau disponible'), 'btn discret')));

    // Paquets truqués : une rareté et/ou une faction.
    const selR = h('select', { 'aria-label': 'Rareté des prochains paquets', onchange: (e) => { admin.forcer = e.target.value; } },
      h('option', { value: '' }, 'Toutes raretés (vraies chances)'),
      DE_HAUT_EN_BAS.filter((r) => codex.cartes.some((c) => c.rarity === r)).map((r) => h('option', { value: r }, 'Que des ' + RAR[r].label.toLowerCase() + 's')));
    selR.value = admin.forcer;
    const selF = h('select', { 'aria-label': 'Faction des prochains paquets', onchange: (e) => { admin.forcerFaction = e.target.value; } },
      h('option', { value: '' }, 'Toutes factions'),
      [...codex.factions.values()].filter((f) => codex.cartes.some((c) => (c.factions || []).includes(f.id))).map((f) => h('option', { value: f.id }, 'Que des ' + f.nom.toLowerCase().replace(/^adepte/, 'adeptes'))));
    selF.value = admin.forcerFaction || '';
    const truques = h('div', { class: 'bloc-admin' },
      h('h3', {}, 'Prochains paquets'),
      h('p', {}, 'Pour tester une ouverture : choisis ce qui doit tomber. Ça reste réglé jusqu\'à ce que tu changes.'),
      h('div', { class: 'actions' }, selR, selF, h('a', { class: 'btn', href: '#paquets' }, 'Aller ouvrir')));

    // Cartes : tout donner, tout vider, ou carte par carte.
    let arme = false;
    const vider = bouton('Vider la collection', () => {
      if (!arme) { arme = true; vider.textContent = 'Sûr ? Clique encore'; setTimeout(() => { arme = false; vider.textContent = 'Vider la collection'; }, 4000); return; }
      maj(R.viderCollection(etat), 'Collection vidée');
    }, 'btn danger');
    const champ = h('input', { type: 'search', placeholder: 'Chercher une carte à donner ou retirer…', 'aria-label': 'Chercher une carte', autocomplete: 'off', value: recherche });
    const liste = h('ul', { class: 'liste-admin' });
    const remplirListe = () => {
      const q = norm(recherche);
      const toutes = codex.cartes.filter((e) => !q || norm([e.title, e.honor, legendeDe(e)].join(' ')).includes(q))
        .sort((a, b) => !!etat.collection[b.id] - !!etat.collection[a.id] || R.RANG[b.rarity] - R.RANG[a.rarity] || a.title.localeCompare(b.title, 'fr'));
      const montrees = q ? toutes : toutes.filter((e) => etat.collection[e.id]);
      const lignes = montrees.slice(0, 60).map((e) => {
        const n = etat.collection[e.id] || 0;
        const fixer = (v) => () => { changer(R.fixerExemplaires(etat, e.id, v)); remplirListe(); };
        return h('li', { class: n ? '' : 'pas-a-moi' },
          h('span', { class: 'pt', style: '--c:' + RAR[e.rarity].c, title: RAR[e.rarity].label }),
          h('span', { class: 'nom-admin' }, h('b', {}, e.title), h('small', {}, legendeDe(e))),
          h('span', { class: 'compteur' },
            h('button', { type: 'button', class: 'pilule', 'aria-label': 'Retirer un exemplaire de ' + e.title, disabled: !n, onclick: fixer(n - 1) }, '−'),
            h('b', { 'aria-label': n + ' exemplaires' }, String(n)),
            h('button', { type: 'button', class: 'pilule', 'aria-label': 'Ajouter un exemplaire de ' + e.title, onclick: fixer(n + 1) }, '+'),
            n ? h('button', { type: 'button', class: 'pilule', 'aria-label': 'Retirer ' + e.title + ' de la collection', onclick: fixer(0) }, 'Retirer') : null));
      });
      liste.replaceChildren(...lignes);
      if (!lignes.length) liste.append(h('li', { class: 'vide-admin' }, q ? 'Aucune carte ne correspond.' : 'Ta collection est vide. Cherche une carte pour te la donner.'));
      if (montrees.length > 60) liste.append(h('li', { class: 'vide-admin' }, `… et ${montrees.length - 60} autres : précise ta recherche.`));
    };
    let qt;
    champ.addEventListener('input', () => { clearTimeout(qt); qt = setTimeout(() => { recherche = champ.value.trim(); remplirListe(); }, 120); });
    champ.addEventListener('focus', () => { rechercheFocus = true; });
    champ.addEventListener('blur', () => { rechercheFocus = false; });
    remplirListe();
    const cartes = h('div', { class: 'bloc-admin' },
      h('h3', {}, 'Cartes'),
      h('p', {}, 'Sans recherche : tes cartes. Avec une recherche : toutes les cartes du jeu, pour en donner ou en retirer.'),
      h('div', { class: 'actions' },
        bouton('Donner toutes les cartes', () => maj(R.donnerTout(etat, codex.cartes), 'Toutes les cartes sont à toi')),
        vider),
      champ, liste);

    panneau.replaceChildren(
      h('div', { class: 'tete-admin' }, h('h2', {}, 'Mode admin'),
        bouton('Quitter le mode admin', () => { quitterAdmin(); toast('Mode admin quitté'); afficher(); }, 'btn discret')),
      h('p', {}, 'Pour tester tout le jeu. Il ne s\'active que sur ce navigateur, avec le code.'),
      paquets, truques, cartes);
    if (rechercheFocus) champ.focus();
  }
  dessiner();
  return panneau;
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
