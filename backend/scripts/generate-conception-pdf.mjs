import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(here, '../docs/conception-projet.pdf');
const W = 595;
const H = 842;
const M = 44;
const ink = [0.09, 0.18, 0.22];
const teal = [0.06, 0.43, 0.45];
const tealLight = [0.91, 0.96, 0.95];
const orange = [0.77, 0.43, 0.22];
const muted = [0.34, 0.43, 0.47];
const pale = [0.96, 0.98, 0.98];
const rule = [0.83, 0.88, 0.89];

const pages = [
  {
    title: 'Vision du produit',
    intro: 'Une plateforme de location qui relie le catalogue public aux opérations quotidiennes du loueur.',
    sections: [
      { title: 'Client — parcours public', items: [
        'Parcourir le matériel par événement : mariage, conférence, gala, fête privée, concert/festival, et événements ajoutés par le loueur.',
        'Choisir les dates, consulter les disponibilités, composer un panier et estimer prix et caution.',
        'Créer un compte ou se connecter pour envoyer une demande, puis suivre les réservations et télécharger une facture PDF.',
        'Échanger des messages liés à une réservation et consulter les notifications applicatives.'
      ]},
      { title: 'Admin — gestion du loueur', items: [
        'Gérer événements, catégories, articles, tarifs, stock et indisponibilités.',
        'Voir les demandes et le planning, gérer les fiches clients, confirmer ou refuser une réservation.',
        'Créer des réservations manuelles pour les appels ou visites en boutique.',
        'Suivre l’état du matériel à la sortie et au retour, les paiements, les cautions et les échanges.'
      ]},
      { title: 'Principes de conception', items: [
        'Le serveur recalcule le stock et les montants ; le navigateur ne fait qu’afficher une estimation.',
        'Le prix unitaire est figé dans la ligne de réservation au moment de la demande.',
        'Les transitions importantes sont historisées pour permettre le suivi opérationnel.'
      ]}
    ]
  },
  {
    title: 'Architecture technique',
    intro: 'Le système est séparé en site web, API métier et base de données MySQL compatible.',
    flows: [['Navigateur', 'Site React sur Render', 'API NestJS sur Render', 'TiDB Cloud TLS']],
    sections: [
      { title: 'Frontend', items: [
        'React, TypeScript et Vite. Les écrans sont regroupés en authentification, landing/catalogue, panier, espace client et administration.',
        'Le panier est conservé dans le navigateur. Les animations sont produites avec Motion/Framer Motion.',
        'En local, Vite relaie les appels API. En production, les chemins /api/* sont réécrits vers le Web Service NestJS.'
      ]},
      { title: 'Backend', items: [
        'NestJS et TypeScript, organisé par domaines : auth, catalogue, événements, disponibilité, réservations, clients et communications.',
        'TypeORM accède à TiDB. JWT protège les routes privées ; les actions de gestion exigent le rôle ADMIN.',
        'Une tâche vérifie les réservations provisoires expirées au démarrage et chaque minute tant que le service fonctionne.'
      ]},
      { title: 'Hébergement actuel', items: [
        'Render Static Site pour React ; Render Web Service pour NestJS ; TiDB Cloud Starter pour les données persistantes.',
        'Le backend utilise TLS vers TiDB avec DB_SSL=true. Les secrets sont configurés dans les variables d’environnement Render, jamais dans Git.'
      ]}
    ]
  },
  {
    title: 'Modèle de données',
    intro: 'Les 14 tables principales couvrent le catalogue, les réservations, les opérations et la communication.',
    flows: [['Utilisateur', 'Fiche client', 'Réservation', 'Lignes tarifées']],
    sections: [
      { title: 'Catalogue et événements', items: [
        'categories → articles : une catégorie regroupe plusieurs articles. Un article porte prix/jour, caution, stock total, marge de préparation et état actif.',
        'evenements ↔ articles : relation plusieurs-à-plusieurs via evenement_articles ; un article peut servir plusieurs types d’événements.'
      ]},
      { title: 'Clients et locations', items: [
        'utilisateurs contient l’e-mail, le hash du mot de passe et le rôle CLIENT ou ADMIN.',
        'clients porte les coordonnées et les notes admin. Le lien vers utilisateurs est facultatif pour les clients sans compte.',
        'reservations contient référence, dates, statut, source, mode de remise, totaux, expiration et traces de traitement.',
        'lignes_reservation conserve article, quantité, prix journalier unitaire, nombre de jours et total de ligne.'
      ]},
      { title: 'Suivi et historique', items: [
        'indisponibilites réduit le stock utilisable pour réparation, hors service ou autre motif.',
        'historique_statuts conserve les transitions ; suivi_reservation_materiel enregistre les contrôles de sortie/retour.',
        'paiements_reservation, messages et notifications sont reliés aux réservations et aux utilisateurs.'
      ]}
    ]
  },
  {
    title: 'Flux de réservation client',
    intro: 'Le panier devient une demande provisoire uniquement après authentification et validation du stock côté serveur.',
    flows: [['Catalogue + dates', 'Panier navigateur', 'Connexion / inscription', 'POST réservation']],
    sections: [
      { title: 'Création de la demande', items: [
        'Le client sélectionne des articles et quantités. L’interface estime le prix à partir des dates et tarifs affichés.',
        'Après connexion ou inscription, l’API vérifie les dates, l’adresse si livraison et les quantités demandées.',
        'Dans une transaction, l’API verrouille les articles, recalcule l’occupation, puis crée réservation, lignes tarifées et historique.',
        'La réservation en ligne devient PROVISOIRE et bloque le stock jusqu’à traitement ou expiration (48 h par défaut).'
      ]},
      { title: 'Cycle de vie', states: ['PROVISOIRE', 'FERME', 'EN_COURS', 'TERMINEE'], items: [
        'Admin confirme : PROVISOIRE → FERME ; l’expiration est effacée et le traitement est attribué.',
        'Admin refuse : PROVISOIRE → REFUSEE avec motif ; le stock est libéré.',
        'Délai dépassé : PROVISOIRE → EXPIREE par tâche planifiée ; le stock est libéré.',
        'Le client peut annuler PROVISOIRE ou FERME : passage à ANNULEE avec historique.'
      ]},
      { title: 'Après confirmation', items: [
        'Le loueur enregistre la sortie et l’état des unités ; le statut passe à EN_COURS.',
        'Au retour, les quantités et états sont contrôlés ; la réservation passe à TERMINEE.',
        'Le client consulte le statut et peut télécharger le PDF de facture selon ses droits.'
      ]}
    ]
  },
  {
    title: 'Disponibilité et tarification',
    intro: 'La disponibilité dépend du stock, des réservations qui chevauchent les dates et des indisponibilités matérielles.',
    sections: [
      { title: 'Règle de stock', items: [
        'Les statuts bloquants sont PROVISOIRE non expirée, FERME et EN_COURS.',
        'Pour chaque jour de la période, l’API additionne les quantités réservées et indisponibles, puis retient le pic d’occupation.',
        'La marge_jours d’un article prolonge la fin d’occupation afin de laisser le temps de préparer le matériel.',
        'Disponible = max(0, quantité totale − occupation maximale sur la période).'
      ]},
      { title: 'Protection contre la double réservation', items: [
        'Les articles sont verrouillés dans la transaction avant de recalculer le stock.',
        'Si le stock restant est inférieur à la quantité demandée, l’API refuse la demande ; elle ne fait pas confiance au panier du navigateur.',
        'L’admin peut exceptionnellement forcer le stock pour une réservation manuelle ; stock_force trace cette décision.'
      ]},
      { title: 'Calcul du prix', items: [
        'Nombre de jours = différence entre dates, bornes incluses.',
        'Total ligne = quantité × prix journalier figé × nombre de jours.',
        'Caution totale = somme des cautions unitaires × quantités.',
        'Montants enregistrés en entiers ; l’API recalcule le total au moment de créer la réservation.'
      ]}
    ]
  },
  {
    title: 'Flux de l’administration',
    intro: 'L’administration couvre la demande commerciale et les opérations physiques du matériel.',
    sections: [
      { title: 'Demandes et réservations manuelles', items: [
        'Demande en ligne : consulter le dossier et les dates, puis confirmer ou refuser avec un motif.',
        'Réservation manuelle : retrouver ou créer un client, sélectionner dates et matériel, puis créer en PROVISOIRE ou FERME.',
        'Les mêmes règles de disponibilité sont utilisées ; une exception de stock forcé est explicitement tracée.'
      ]},
      { title: 'Sortie et retour', flows: [['FERME', 'Contrôle SORTIE', 'EN_COURS', 'Contrôle RETOUR / TERMINEE']], items: [
        'Chaque contrôle doit couvrir la quantité totale de chaque ligne de réservation.',
        'À la sortie, état BON ou ABIME ; au retour, état BON, ABIME ou MANQUANT.',
        'Si une unité doit être réparée ou retirée du service, créer une indisponibilité correspondante.'
      ]},
      { title: 'Paiements et cautions', items: [
        'Enregistrer paiement de location, remboursement, caution reçue ou caution restituée.',
        'Chaque mouvement garde montant, mode (espèces, mobile money, virement, carte ou autre), référence facultative et responsable.'
      ]}
    ]
  },
  {
    title: 'API, accès et expérience',
    intro: 'Les écrans React utilisent des routes NestJS publiques ou protégées par JWT et rôle.',
    sections: [
      { title: 'Routes représentatives', items: [
        'Public : GET /api/articles, GET /api/catalogue/categories, GET /api/evenements, GET /api/disponibilite.',
        'Authentification : POST /api/auth/inscription et POST /api/auth/connexion.',
        'Client : POST /api/reservations, GET /api/reservations/moi, PATCH /api/reservations/:id/annuler.',
        'Admin : GET /api/reservations, POST /api/reservations/manuelles, PATCH /api/reservations/:id/decision, opérations sortie/retour et paiements.',
        'Communications : GET/POST /api/reservations/:id/messages ; notifications via /api/notifications.',
        'Facture : GET /api/reservations/:id/facture renvoie un document PDF.'
      ]},
      { title: 'Sécurité applicative', items: [
        'Les mots de passe sont hashés ; le JWT signe les sessions et contient rôle/identité.',
        'JWT_SECRET doit être aléatoire et privé. Un changement de secret invalide les sessions déjà enregistrées dans le navigateur.',
        'Les variables DB_PASSWORD, JWT_SECRET, OBSERVE_APP_SECRET et SMTP_URL restent dans les secrets Render et ne sont jamais publiées dans le dépôt.'
      ]},
      { title: 'Services auxiliaires', items: [
        'Les notifications applicatives sont persistées et affichées au bon utilisateur.',
        'L’envoi réel d’e-mail nécessite SMTP ; sans transport, l’application consigne l’e-mail au lieu de le livrer.',
        'NestJS Observe nécessite les clés renouvelées dans l’environnement Render pour envoyer les traces et métriques.'
      ]}
    ]
  },
  {
    title: 'Déploiement et vérifications',
    intro: 'État de démonstration documenté au 18 novembre 2026.',
    sections: [
      { title: 'Architecture publiée', items: [
        'Frontend public : https://location-materiels.onrender.com',
        'API : https://location-materiel-api.onrender.com',
        'Base : TiDB Cloud Starter, base location_projet, accès TLS.',
        'Le Static Site doit réécrire /api/* vers le Web Service API puis / vers /index.html pour les routes React.'
      ]},
      { title: 'Liste de vérification fonctionnelle', items: [
        'Ouvrir le catalogue public et vérifier les événements, catégories, articles et disponibilité.',
        'Tester connexion client et admin, demande, décision, annulation et historique.',
        'Tester réservation manuelle, sortie/retour, indisponibilité, paiements, messages, notifications et facture PDF.',
        'Vérifier CORS_ORIGIN sur l’origine publique exacte du frontend et l’absence de secrets dans Git.'
      ]},
      { title: 'Limites de démonstration', items: [
        'Un service Render gratuit peut s’endormir ; une première requête peut attendre son réveil.',
        'Les tâches planifiées ne tournent pas lorsque le service est arrêté ; les alertes e-mail demandent un transport configuré.',
        'Avant usage commercial : prévoir disponibilité continue, sauvegardes, surveillance, stockage externe pour fichiers et politique de sécurité.'
      ]}
    ]
  }
];

const enc = (value) => {
  const normalized = String(value)
    .replace(/[’‘]/g, "'").replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-').replace(/→/g, '>').replace(/×/g, 'x')
    .replace(/œ/g, 'oe').replace(/Œ/g, 'OE').replace(/…/g, '...');
  let out = '';
  for (const char of normalized) {
    const code = char.codePointAt(0);
    const safe = code <= 255 ? char : '?';
    out += safe.replace(/[\\()]/g, '\\$&');
  }
  return out;
};
const esc = (s) => `${s[0].toFixed(3)} ${s[1].toFixed(3)} ${s[2].toFixed(3)}`;
const textCmd = (text, x, y, size = 10, font = 'F1', color = ink) =>
  `q ${esc(color)} rg BT /${font} ${size} Tf 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${enc(text)}) Tj ET Q`;
const rectCmd = (x, y, w, h, color) => `q ${esc(color)} rg ${x} ${y} ${w} ${h} re f Q`;
const lineCmd = (x1, y1, x2, y2, color = rule, width = 0.8) => `q ${esc(color)} RG ${width} w ${x1} ${y1} m ${x2} ${y2} l S Q`;

function wrap(text, maxChars = 86) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    if (line && `${line} ${word}`.length > maxChars) { lines.push(line); line = word; }
    else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines;
}

function flowCommands(flow, y, commands) {
  const gap = 10;
  const width = (W - 2 * M - gap * (flow.length - 1)) / flow.length;
  const height = 45;
  flow.forEach((label, i) => {
    const x = M + i * (width + gap);
    commands.push(rectCmd(x, y - height + 5, width, height, i === flow.length - 1 ? tealLight : pale));
    commands.push(lineCmd(x, y - height + 5, x + width, y - height + 5, rule, 0.8));
    const parts = wrap(label, Math.max(15, Math.floor(width / 6.3)));
    let ty = y - 13;
    for (const line of parts.slice(0, 3)) { commands.push(textCmd(line, x + 7, ty, 8.3, 'F2', teal)); ty -= 10; }
    if (i < flow.length - 1) commands.push(textCmd('>', x + width + 1, y - 22, 11, 'F2', orange));
  });
  return y - height - 9;
}

function pageContent(page, number) {
  const c = [];
  c.push(rectCmd(0, H - 8, W, 8, teal));
  c.push(textCmd('LOCATION DE MATERIEL EVENEMENTIEL', M, H - 31, 8, 'F2', teal));
  c.push(textCmd(`CONCEPTION  |  ${String(number).padStart(2, '0')}`, W - 170, H - 31, 8, 'F1', muted));
  c.push(textCmd(page.title, M, H - 69, 23, 'F2', ink));
  let y = H - 91;
  for (const line of wrap(page.intro, 90)) { c.push(textCmd(line, M, y, 10, 'F1', muted)); y -= 14; }
  y -= 8;
  if (page.flows) {
    for (const flow of page.flows) y = flowCommands(flow, y, c) - 4;
  }
  for (const section of page.sections) {
    if (section.title) {
      y -= 3;
      c.push(rectCmd(M, y - 3, 4, 13, orange));
      c.push(textCmd(section.title, M + 11, y, 12, 'F2', teal));
      y -= 19;
    }
    if (section.flows) {
      for (const flow of section.flows) y = flowCommands(flow, y, c) - 2;
    }
    if (section.states) {
      const gap = 6;
      const width = (W - 2 * M - gap * (section.states.length - 1)) / section.states.length;
      for (let i = 0; i < section.states.length; i++) {
        const x = M + i * (width + gap);
        c.push(rectCmd(x, y - 26, width, 27, i === 3 ? [0.99, 0.95, 0.91] : tealLight));
        c.push(textCmd(section.states[i], x + 6, y - 17, 8.2, 'F2', teal));
        if (i < section.states.length - 1) c.push(textCmd('>', x + width - 1, y - 17, 9, 'F2', orange));
      }
      y -= 36;
    }
    for (const item of section.items ?? []) {
      const lines = wrap(`- ${item}`, 91);
      for (const line of lines) { c.push(textCmd(line, M + 5, y, 9.2, 'F1', ink)); y -= 12.5; }
      y -= 2;
    }
  }
  if (y < 45) console.warn(`Page ${number} may overflow (baseline ${y.toFixed(0)}pt)`);
  c.push(lineCmd(M, 35, W - M, 35, rule, 0.7));
  c.push(textCmd('Document de conception — version basee sur le code et le deploiement actuels', M, 22, 7.2, 'F1', muted));
  c.push(textCmd(String(number).padStart(2, '0'), W - M - 12, 22, 8, 'F2', teal));
  return c.join('\n');
}

function coverContent() {
  const c = [];
  c.push(rectCmd(0, 0, W, H, [0.06, 0.19, 0.23]));
  c.push(rectCmd(0, 0, W, 15, teal));
  c.push(rectCmd(405, 390, 190, 470, [0.07, 0.27, 0.30]));
  c.push(lineCmd(390, 300, 595, 505, [0.15, 0.47, 0.48], 1.2));
  c.push(lineCmd(425, 260, 595, 430, [0.15, 0.47, 0.48], 1.2));
  c.push(textCmd('CONCEPTION FONCTIONNELLE ET TECHNIQUE', 54, 724, 9, 'F2', [0.96, 0.72, 0.48]));
  c.push(textCmd('LOCATION DE', 54, 650, 31, 'F2', [1, 1, 1]));
  c.push(textCmd('MATERIEL', 54, 609, 36, 'F2', [1, 1, 1]));
  c.push(textCmd('EVENEMENTIEL', 54, 568, 34, 'F2', [0.46, 0.84, 0.78]));
  const subtitle = [
    'Catalogue par evenement, demandes de location,',
    'gestion du stock et suivi des operations du loueur.'
  ];
  subtitle.forEach((line, i) => c.push(textCmd(line, 56, 504 - i * 20, 13, 'F1', [0.86, 0.93, 0.92])));
  c.push(rectCmd(55, 390, 485, 1, [0.25, 0.48, 0.49]));
  c.push(textCmd('DOCUMENT', 56, 358, 8, 'F2', [0.48, 0.84, 0.79]));
  c.push(textCmd('Architecture, donnees et flux metier', 56, 338, 11, 'F1', [1, 1, 1]));
  c.push(textCmd('EDITION', 56, 291, 8, 'F2', [0.48, 0.84, 0.79]));
  c.push(textCmd('18 novembre 2026', 56, 271, 11, 'F1', [1, 1, 1]));
  c.push(textCmd('DEPLOIEMENT', 56, 224, 8, 'F2', [0.48, 0.84, 0.79]));
  c.push(textCmd('Demonstration — Render + TiDB Cloud', 56, 204, 11, 'F1', [1, 1, 1]));
  c.push(textCmd('LOCATION EVENEMENTIELLE  /  CONCEPTION DU PROJET', 56, 46, 8, 'F2', [0.72, 0.85, 0.83]));
  return c.join('\n');
}

const streams = [coverContent(), ...pages.map((page, index) => pageContent(page, index + 1))];
const objects = [];
objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
const pageIds = streams.map((_, i) => 5 + i * 2);
objects[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${streams.length} >>`;
objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
streams.forEach((stream, i) => {
  const pageId = 5 + i * 2;
  const contentId = pageId + 1;
  objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`;
  objects[contentId] = `<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`;
});

let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
const offsets = [0];
for (let id = 1; id < objects.length; id++) {
  offsets[id] = Buffer.byteLength(pdf, 'latin1');
  pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`;
}
const xref = Buffer.byteLength(pdf, 'latin1');
pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
for (let id = 1; id < objects.length; id++) pdf += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, Buffer.from(pdf, 'latin1'));
console.log(`PDF cree: ${outputPath}`);
console.log(`Pages: ${streams.length}`);
