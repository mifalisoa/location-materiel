-- =====================================================================
-- Schéma : location de matériel (MySQL / MariaDB, XAMPP)
-- Base    : location_projet
-- Moteur  : InnoDB (transactions + verrous de ligne)
-- Prix    : entiers (plus petite unité monétaire, ex. ariary)
-- =====================================================================

USE location_projet;

SET NAMES utf8mb4;

-- ---------------------------------------------------------------------
-- 1. utilisateurs : comptes de connexion
-- ---------------------------------------------------------------------
CREATE TABLE utilisateurs (
  id                 INT UNSIGNED NOT NULL AUTO_INCREMENT,
  email              VARCHAR(190) NOT NULL,
  mot_de_passe_hash  VARCHAR(255) NOT NULL,
  role               ENUM('CLIENT','ADMIN') NOT NULL DEFAULT 'CLIENT',
  actif              TINYINT(1) NOT NULL DEFAULT 1,
  cree_le            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modifie_le         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_utilisateurs_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 2. clients : fiche client (avec ou sans compte)
-- ---------------------------------------------------------------------
CREATE TABLE clients (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  utilisateur_id  INT UNSIGNED NULL,
  nom             VARCHAR(120) NOT NULL,
  prenom          VARCHAR(120) NOT NULL,
  societe         VARCHAR(160) NULL,
  telephone       VARCHAR(30) NOT NULL,
  email           VARCHAR(190) NULL,
  adresse         VARCHAR(255) NULL,
  notes_admin     TEXT NULL,
  cree_le         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modifie_le      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_clients_utilisateur (utilisateur_id),
  KEY idx_clients_nom (nom, prenom),
  KEY idx_clients_telephone (telephone),
  CONSTRAINT fk_clients_utilisateur
    FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs (id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 3. categories
-- ---------------------------------------------------------------------
CREATE TABLE categories (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nom         VARCHAR(120) NOT NULL,
  slug        VARCHAR(140) NOT NULL,
  ordre       INT NOT NULL DEFAULT 0,
  cree_le     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modifie_le  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 4. articles : catalogue et stock
-- ---------------------------------------------------------------------
CREATE TABLE articles (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  categorie_id     INT UNSIGNED NOT NULL,
  nom              VARCHAR(160) NOT NULL,
  slug             VARCHAR(180) NOT NULL,
  description      TEXT NULL,
  image_url        VARCHAR(255) NULL,
  prix_jour        INT UNSIGNED NOT NULL,
  caution          INT UNSIGNED NOT NULL DEFAULT 0,
  quantite_totale  INT UNSIGNED NOT NULL DEFAULT 0,
  marge_jours      INT UNSIGNED NOT NULL DEFAULT 0,
  actif            TINYINT(1) NOT NULL DEFAULT 1,
  cree_le          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modifie_le       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_articles_slug (slug),
  KEY idx_articles_categorie (categorie_id),
  KEY idx_articles_actif (actif),
  CONSTRAINT fk_articles_categorie
    FOREIGN KEY (categorie_id) REFERENCES categories (id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 5. evenements et materiel associé
-- ---------------------------------------------------------------------
CREATE TABLE evenements (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nom         VARCHAR(120) NOT NULL,
  slug        VARCHAR(140) NOT NULL,
  sous_titre  VARCHAR(180) NULL,
  description TEXT NULL,
  image_url   VARCHAR(255) NULL,
  ordre       INT NOT NULL DEFAULT 0,
  actif       TINYINT(1) NOT NULL DEFAULT 1,
  cree_le     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modifie_le  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_evenements_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE evenement_articles (
  evenement_id INT UNSIGNED NOT NULL,
  article_id   INT UNSIGNED NOT NULL,
  PRIMARY KEY (evenement_id, article_id),
  KEY idx_evenement_articles_article (article_id),
  CONSTRAINT fk_evenement_articles_evenement FOREIGN KEY (evenement_id)
    REFERENCES evenements (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_evenement_articles_article FOREIGN KEY (article_id)
    REFERENCES articles (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO evenements (nom, slug, sous_titre, description, ordre) VALUES
  ('Mariage', 'mariage', 'Réception & cérémonie', 'Une réception élégante, des invités confortablement installés et une ambiance qui reste en mémoire.', 1),
  ('Conférence', 'conference', 'Entreprise & séminaire', 'Des prises de parole nettes, une bonne visibilité et un aménagement professionnel pour vos équipes.', 2),
  ('Gala', 'gala', 'Soirée d’entreprise & networking', 'Un cadre festif et prestigieux pour réunir vos invités autour de la musique et de la restauration.', 3),
  ('Fête privée', 'fete-privee', 'Anniversaire & garden party', 'Une fête chaleureuse à la maison ou au jardin, avec tout le confort et l’ambiance qu’il faut.', 4),
  ('Concert & festival', 'concert-festival', 'Scène & plein air', 'Une installation résistante et du matériel technique adapté au spectacle vivant et au grand public.', 5);

-- ---------------------------------------------------------------------
-- 6. indisponibilites : matériel en réparation / hors service / interne
-- ---------------------------------------------------------------------
CREATE TABLE indisponibilites (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  article_id  INT UNSIGNED NOT NULL,
  quantite    INT UNSIGNED NOT NULL DEFAULT 1,
  date_debut  DATE NOT NULL,
  date_fin    DATE NULL,                       -- NULL = indéfini
  motif       ENUM('REPARATION','HORS_SERVICE','AUTRE') NOT NULL DEFAULT 'AUTRE',
  note        VARCHAR(255) NULL,
  cree_le     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modifie_le  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_indispo_article_dates (article_id, date_debut, date_fin),
  CONSTRAINT fk_indispo_article
    FOREIGN KEY (article_id) REFERENCES articles (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT chk_indispo_quantite CHECK (quantite > 0),
  CONSTRAINT chk_indispo_dates CHECK (date_fin IS NULL OR date_fin >= date_debut)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 6. reservations
-- ---------------------------------------------------------------------
CREATE TABLE reservations (
  id                 INT UNSIGNED NOT NULL AUTO_INCREMENT,
  reference          VARCHAR(20) NOT NULL,
  client_id          INT UNSIGNED NOT NULL,
  statut             ENUM('PROVISOIRE','FERME','EN_COURS','TERMINEE','REFUSEE','EXPIREE','ANNULEE')
                     NOT NULL DEFAULT 'PROVISOIRE',
  source             ENUM('EN_LIGNE','MANUELLE') NOT NULL DEFAULT 'EN_LIGNE',
  date_debut         DATE NOT NULL,
  date_fin           DATE NOT NULL,
  expire_le          DATETIME NULL,
  mode_remise        ENUM('RETRAIT','LIVRAISON') NOT NULL DEFAULT 'RETRAIT',
  adresse_livraison  VARCHAR(255) NULL,
  total              INT UNSIGNED NOT NULL DEFAULT 0,
  caution_totale     INT UNSIGNED NOT NULL DEFAULT 0,
  note_client        TEXT NULL,
  note_admin         TEXT NULL,
  motif_refus        VARCHAR(255) NULL,
  stock_force        TINYINT(1) NOT NULL DEFAULT 0,
  cree_par_id        INT UNSIGNED NULL,
  traite_par_id      INT UNSIGNED NULL,
  traite_le          DATETIME NULL,
  cree_le            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modifie_le         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_reservations_reference (reference),
  KEY idx_reservations_dispo (statut, date_debut, date_fin),
  KEY idx_reservations_expire (expire_le),
  KEY idx_reservations_client (client_id),
  CONSTRAINT fk_reservations_client
    FOREIGN KEY (client_id) REFERENCES clients (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_reservations_cree_par
    FOREIGN KEY (cree_par_id) REFERENCES utilisateurs (id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_reservations_traite_par
    FOREIGN KEY (traite_par_id) REFERENCES utilisateurs (id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT chk_reservations_dates CHECK (date_fin >= date_debut)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 7. lignes_reservation (prix figé à la demande)
-- ---------------------------------------------------------------------
CREATE TABLE lignes_reservation (
  id                  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  reservation_id      INT UNSIGNED NOT NULL,
  article_id          INT UNSIGNED NOT NULL,
  quantite            INT UNSIGNED NOT NULL,
  prix_jour_unitaire  INT UNSIGNED NOT NULL,
  nb_jours            INT UNSIGNED NOT NULL,
  total_ligne         INT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  KEY idx_lignes_reservation (reservation_id),
  KEY idx_lignes_article (article_id),
  CONSTRAINT fk_lignes_reservation
    FOREIGN KEY (reservation_id) REFERENCES reservations (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_lignes_article
    FOREIGN KEY (article_id) REFERENCES articles (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_lignes_quantite CHECK (quantite > 0),
  CONSTRAINT chk_lignes_jours CHECK (nb_jours > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 8. historique_statuts (traçabilité)
-- ---------------------------------------------------------------------
CREATE TABLE historique_statuts (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  reservation_id  INT UNSIGNED NOT NULL,
  ancien_statut   ENUM('PROVISOIRE','FERME','EN_COURS','TERMINEE','REFUSEE','EXPIREE','ANNULEE') NULL,
  nouveau_statut  ENUM('PROVISOIRE','FERME','EN_COURS','TERMINEE','REFUSEE','EXPIREE','ANNULEE') NOT NULL,
  utilisateur_id  INT UNSIGNED NULL,           -- NULL = action automatique (expiration)
  commentaire     VARCHAR(255) NULL,
  cree_le         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_histo_reservation (reservation_id, cree_le),
  CONSTRAINT fk_histo_reservation
    FOREIGN KEY (reservation_id) REFERENCES reservations (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_histo_utilisateur
    FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs (id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
