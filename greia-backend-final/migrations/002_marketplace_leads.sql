-- 002_marketplace_leads.sql
CREATE TABLE IF NOT EXISTS marketplace_properties (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  owner_user_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(255) NOT NULL,
  address VARCHAR(255) NULL,
  area_code VARCHAR(32) NOT NULL,
  details JSON NULL,
  status ENUM('open','engaged','closed') DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_marketplace_area (area_code, status),
  INDEX idx_marketplace_owner (owner_user_id),
  CONSTRAINT fk_marketplace_owner FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS leads (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  source ENUM('marketplace','listing','referral','ad') NOT NULL DEFAULT 'marketplace',
  subject VARCHAR(255) NOT NULL,
  related_id BIGINT UNSIGNED NULL,
  owner_user_id BIGINT UNSIGNED NOT NULL,
  assignee_user_id BIGINT UNSIGNED NULL,
  status ENUM('new','claimed','in_conversation','closed') DEFAULT 'new',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_leads_owner (owner_user_id, created_at),
  INDEX idx_leads_assignee (assignee_user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS lead_matches (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  lead_id BIGINT UNSIGNED NOT NULL,
  agent_user_id BIGINT UNSIGNED NOT NULL,
  notified_at TIMESTAMP NULL,
  responded_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE uq_lead_agent (lead_id, agent_user_id),
  CONSTRAINT fk_lead_matches_lead FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
