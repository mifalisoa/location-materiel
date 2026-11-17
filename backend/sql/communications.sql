-- Run once against the production database after the existing schema migrations.
CREATE TABLE IF NOT EXISTS messages (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  reservation_id INT UNSIGNED NOT NULL,
  expediteur_id INT UNSIGNED NOT NULL,
  contenu TEXT NOT NULL,
  envoye_le DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_messages_reservation_date (reservation_id, envoye_le),
  CONSTRAINT fk_messages_reservation FOREIGN KEY (reservation_id) REFERENCES reservations (id) ON DELETE CASCADE,
  CONSTRAINT fk_messages_expediteur FOREIGN KEY (expediteur_id) REFERENCES utilisateurs (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notifications (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  utilisateur_id INT UNSIGNED NOT NULL,
  reservation_id INT UNSIGNED NULL,
  type VARCHAR(40) NOT NULL,
  message VARCHAR(255) NOT NULL,
  cree_le DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  lu_le DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_notifications_user_read_date (utilisateur_id, lu_le, cree_le),
  CONSTRAINT fk_notifications_user FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs (id) ON DELETE CASCADE,
  CONSTRAINT fk_notifications_reservation FOREIGN KEY (reservation_id) REFERENCES reservations (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
