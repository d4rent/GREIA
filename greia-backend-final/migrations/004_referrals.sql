-- 004_referrals.sql
CREATE TABLE IF NOT EXISTS referrals (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  from_agent_user_id BIGINT UNSIGNED NOT NULL,
  to_agent_user_id BIGINT UNSIGNED NOT NULL,
  conversation_id BIGINT UNSIGNED NULL,
  referral_fee_pct DECIMAL(5,2) DEFAULT 25.00,
  property_context JSON NULL,
  status ENUM('offered','accepted','declined','completed') DEFAULT 'offered',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL,
  INDEX idx_referrals_from (from_agent_user_id, created_at),
  INDEX idx_referrals_to (to_agent_user_id, created_at),
  INDEX idx_referrals_status (status, created_at),
  CONSTRAINT fk_referrals_conversation FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
