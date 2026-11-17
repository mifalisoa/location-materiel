# Backend location de matériel

API NestJS 12 modulaire connectée à la base MySQL/MariaDB `location_projet`. Elle utilise le schéma SQL fourni ; TypeORM est configuré avec `synchronize: false` et ne crée ni ne modifie les tables.

## Démarrage

1. Exécuter le script SQL du projet dans MySQL/MariaDB pour créer les tables.
2. Copier `.env.example` vers `.env`, puis renseigner `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE` et une valeur privée longue pour `JWT_SECRET`.
3. Installer et démarrer : `pnpm install`, puis `pnpm start:dev`.

Pour une base déjà existante, exécuter aussi `sql/evenements.sql` avant de démarrer la version qui gère les événements.

Toutes les routes sont sous `/api`. Les dates sont au format `YYYY-MM-DD`. Les montants sont des entiers en ariary. Une réservation compte les deux dates (`dateFin - dateDebut + 1`).

## Routes disponibles

| Méthode | Route | Accès | Usage |
| --- | --- | --- | --- |
| GET | `/api/catalogue/categories` | Public | Catégories |
| GET | `/api/articles` ou `/api/catalogue/articles` | Public | Catalogue actif, filtre facultatif `?categorie=ID` |
| GET | `/api/evenements` | Public | Événements actifs et articles associés |
| GET | `/api/catalogue/articles/:id` | Public | Détail d’un article actif |
| GET | `/api/disponibilite?debut=YYYY-MM-DD&fin=YYYY-MM-DD` | Public | Quantités disponibles, marge après la date de fin et indisponibilités comprises |
| POST | `/api/auth/inscription` | Public | Création du compte client et de sa fiche |
| POST | `/api/auth/connexion` | Public | Retourne un jeton Bearer |
| POST | `/api/reservations` | Client | Demande en ligne provisoire avec prix figés et expiration |
| GET | `/api/reservations/moi` ou `/api/reservations/mes` | Client | Historique des réservations du client connecté |
| PATCH | `/api/reservations/:id/annuler` | Client propriétaire | Annule une réservation `PROVISOIRE` ou `FERME` |
| GET | `/api/reservations` | Admin | Planning / réservations |
| POST | `/api/reservations/manuelles` | Admin | Crée un devis `PROVISOIRE` ou une réservation `FERME` (`statutInitial`, `stockForce` facultatifs) |
| PATCH | `/api/reservations/:id/decision` | Admin | Passe une demande provisoire à `FERME` ou `REFUSEE` |
| PATCH | `/api/reservations/:id/status` | Admin | Gère la remise (`EN_COURS`), le retour (`TERMINEE`) ou l’annulation |
| GET/POST/PATCH | `/api/admin/catalogue/categories` | Admin | Gère les catégories |
| GET/POST | `/api/admin/clients` | Admin | Liste et crée des fiches clients sans compte |
| GET/POST | `/api/admin/evenements` | Admin | Liste et crée les événements |
| PATCH | `/api/admin/evenements/:id` | Admin | Modifie un événement et les articles associés |
| PATCH | `/api/admin/evenements/:id/actif` | Admin | Publie ou masque un événement |
| PATCH | `/api/admin/clients/:id/notes` | Admin | Modifie les notes internes |
| POST | `/api/admin/catalogue/articles` | Admin | Ajoute un article |
| PATCH | `/api/admin/catalogue/articles/:id` | Admin | Modifie un article, son prix ou son stock |
| PATCH | `/api/admin/catalogue/articles/:id/activer` | Admin | Rend l’article visible |
| PATCH | `/api/admin/catalogue/articles/:id/desactiver` | Admin | Masque l’article du catalogue |
| GET/POST/DELETE | `/api/admin/indisponibilites` | Admin | Déclare ou supprime du stock en réparation / hors service |

Les routes privées attendent `Authorization: Bearer <accessToken>`. Pour attribuer le rôle admin au premier compte créé, exécuter dans la base :

```sql
UPDATE utilisateurs SET role = 'ADMIN' WHERE email = 'adresse-admin@example.com';
```

Les demandes provisoires en ligne bloquent le stock jusqu’à leur expiration automatique (48 h par défaut, contrôle chaque minute) ou décision. `RESERVATION_HOLD_HOURS` règle le délai. Le tableau admin signale les demandes arrivant à expiration dans les six heures. Le serveur envoie aussi une alerte e-mail aux administrateurs actifs toutes les cinq minutes, pour les demandes proches de l’expiration. Configurez `SMTP_URL` et `MAIL_FROM` dans `.env` pour recevoir les e-mails ; sans SMTP, les messages sont journalisés par le transport de développement. Les devis créés manuellement n’expirent pas et peuvent contenir plusieurs articles. Une décision de validation revérifie le stock sous transaction et verrouille les articles concernés. Le contrôle considère le maximum de stock simultanément engagé sur la période demandée et la marge de préparation ajoutée après la date de fin.

### Événements et matériel associé

Sur une base existante, exécuter une fois `sql/evenements.sql` dans MySQL/MariaDB avant de démarrer cette version. Ce script crée les tables `evenements` et `evenement_articles` et ajoute les cinq événements initiaux sans toucher aux articles existants. Pour une nouvelle base, `frontend/base.sql` contient désormais ces tables et ces données initiales. L’admin permet ensuite de créer/modifier des événements, de leur associer des articles et de les masquer temporairement.
