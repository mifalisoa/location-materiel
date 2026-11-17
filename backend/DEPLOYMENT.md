# Déploiement de démonstration (Render + TiDB Cloud)

Cette configuration sépare le site statique, l'API NestJS et la base MySQL-compatible. Les commandes sont à saisir dans les tableaux de bord des hébergeurs ; ne commitez jamais les valeurs réelles des secrets.

## 1. Créer et préparer la base

Créer un cluster **TiDB Cloud Starter** MySQL-compatible, puis récupérer l'hôte, le port, l'utilisateur et le mot de passe dans son écran Connect. Pour une base vide, créer `location_projet`, puis importer dans cet ordre :

1. `frontend/base.sql` (schéma principal ; le script sélectionne `location_projet` avec `USE`).
2. `backend/sql/evenements.sql`.
3. `backend/sql/communications.sql`.
4. `backend/sql/suivi_location.sql`.

Pour transférer les données locales, exporter le schéma et les données de `location_projet` avec MySQL Workbench et importer ce dump à la place de l'étape 1. Les scripts d'événements, communications et suivi utilisent `IF NOT EXISTS` et peuvent être appliqués après l'import.

TiDB Cloud Starter exige TLS sur son endpoint public. Le backend l'active quand `DB_SSL=true`.

## 2. Déployer l'API NestJS

Créer un **Web Service** connecté au dépôt Git :

- Root Directory : `backend`
- Build Command : `pnpm install --frozen-lockfile && pnpm run build`
- Start Command : `pnpm run start:prod`

Configurer les variables suivantes dans Render :

| Variable | Valeur |
| --- | --- |
| `DB_HOST` | Hôte fourni par TiDB |
| `DB_PORT` | Port fourni par TiDB (généralement `4000`) |
| `DB_USERNAME` | Utilisateur TiDB complet |
| `DB_PASSWORD` | Mot de passe généré par TiDB |
| `DB_DATABASE` | `location_projet` |
| `DB_SSL` | `true` |
| `JWT_SECRET` | Secret aléatoire d'au moins 32 caractères |
| `CORS_ORIGIN` | URL publique du site Render |
| `INVOICE_ISSUER_NAME` | Nom de l'entreprise affiché sur les PDF |

Render fournit `PORT` automatiquement. Si NestJS Observe est conservé, fournir ses vraies clés `OBSERVE_APP_KEY` et `OBSERVE_APP_SECRET` ; ne laissez pas les valeurs de démonstration. `SMTP_URL` est facultatif. Sans transport e-mail, l'application journalise les e-mails au lieu de les envoyer.

## 3. Déployer le front React/Vite

Créer un **Static Site** dans le même dépôt :

- Root Directory : `frontend`
- Build Command : `pnpm install --frozen-lockfile && pnpm run build`
- Publish Directory : `dist`

Ajouter les règles de réécriture Render dans cet ordre :

| Source | Destination | Action |
| --- | --- | --- |
| `/api/*` | `https://URL-DU-BACKEND.onrender.com/api/*` | Rewrite |
| `/*` | `/index.html` | Rewrite |

La première règle transmet les appels `/api/...` du navigateur à NestJS ; la seconde sert l'application React sur ses routes internes telles que `/admin`.

## 4. Vérifications après déploiement

Tester le catalogue public, inscription/connexion, demande de réservation, validation admin, messagerie, génération PDF, sortie/retour, indisponibilités et paiements/cautions. Vérifier aussi que le premier compte admin possède bien le rôle `ADMIN` dans `utilisateurs`.

## Limites du palier gratuit

Le Web Service Render gratuit s'endort après 15 minutes d'inactivité. La tâche d'expiration des réservations s'exécute au démarrage et chaque minute lorsque l'API fonctionne, mais les alertes e-mail planifiées ne partent pas pendant la veille. Les ports SMTP usuels peuvent aussi être bloqués par Render. Ce montage convient à une démo ; il ne garantit pas une disponibilité continue pour une activité commerciale.
