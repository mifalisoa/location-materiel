-- Exécuter une seule fois après le schéma initial et communications.sql.
USE location_projet;
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS suivi_reservation_materiel (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  reservation_id INT UNSIGNED NOT NULL,
  ligne_reservation_id INT UNSIGNED NOT NULL,
  operation ENUM('SORTIE', 'RETOUR') NOT NULL,
  quantite INT UNSIGNED NOT NULL,
  etat ENUM('BON', 'ABIME', 'MANQUANT') NOT NULL,
  note VARCHAR(500) NULL,
  controle_par_id INT UNSIGNED NOT NULL,
  controle_le DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_suivi_reservation_operation (reservation_id, operation),
  KEY idx_suivi_ligne_operation (ligne_reservation_id, operation),
  CONSTRAINT fk_suivi_reservation FOREIGN KEY (reservation_id) REFERENCES reservations (id) ON DELETE CASCADE,
  CONSTRAINT fk_suivi_ligne FOREIGN KEY (ligne_reservation_id) REFERENCES lignes_reservation (id) ON DELETE CASCADE,
  CONSTRAINT fk_suivi_controleur FOREIGN KEY (controle_par_id) REFERENCES utilisateurs (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS paiements_reservation (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  reservation_id INT UNSIGNED NOT NULL,
  type ENUM('PAIEMENT_LOCATION', 'REMBOURSEMENT_LOCATION', 'CAUTION_RECUE', 'CAUTION_RESTITUEE') NOT NULL,
  montant INT UNSIGNED NOT NULL,
  mode ENUM('ESPECES', 'MVOLA', 'ORANGE_MONEY', 'AIRTEL_MONEY', 'VIREMENT', 'CARTE', 'AUTRE') NOT NULL,
  reference VARCHAR(120) NULL,
  note VARCHAR(500) NULL,
  enregistre_par_id INT UNSIGNED NOT NULL,
  enregistre_le DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_paiements_reservation_date (reservation_id, enregistre_le),
  CONSTRAINT fk_paiements_reservation FOREIGN KEY (reservation_id) REFERENCES reservations (id) ON DELETE CASCADE,
  CONSTRAINT fk_paiements_enregistreur FOREIGN KEY (enregistre_par_id) REFERENCES utilisateurs (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
