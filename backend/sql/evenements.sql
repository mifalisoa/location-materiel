-- À exécuter une seule fois sur une base location_projet déjà créée.
USE location_projet;
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS evenements (
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

CREATE TABLE IF NOT EXISTS evenement_articles (
  evenement_id INT UNSIGNED NOT NULL,
  article_id   INT UNSIGNED NOT NULL,
  PRIMARY KEY (evenement_id, article_id),
  KEY idx_evenement_articles_article (article_id),
  CONSTRAINT fk_evenement_articles_evenement FOREIGN KEY (evenement_id)
    REFERENCES evenements (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_evenement_articles_article FOREIGN KEY (article_id)
    REFERENCES articles (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO evenements (nom, slug, sous_titre, description, ordre) VALUES
  ('Mariage', 'mariage', 'Réception & cérémonie', 'Une réception élégante, des invités confortablement installés et une ambiance qui reste en mémoire.', 1),
  ('Conférence', 'conference', 'Entreprise & séminaire', 'Des prises de parole nettes, une bonne visibilité et un aménagement professionnel pour vos équipes.', 2),
  ('Gala', 'gala', 'Soirée d’entreprise & networking', 'Un cadre festif et prestigieux pour réunir vos invités autour de la musique et de la restauration.', 3),
  ('Fête privée', 'fete-privee', 'Anniversaire & garden party', 'Une fête chaleureuse à la maison ou au jardin, avec tout le confort et l’ambiance qu’il faut.', 4),
  ('Concert & festival', 'concert-festival', 'Scène & plein air', 'Une installation résistante et du matériel technique adapté au spectacle vivant et au grand public.', 5);
