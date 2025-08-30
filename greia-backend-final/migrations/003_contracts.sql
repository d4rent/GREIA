-- 003_contracts.sql
CREATE TABLE IF NOT EXISTS contracts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  conversation_id BIGINT UNSIGNED NULL,
  created_by_user_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(255) NOT NULL,
  type ENUM('listing','referral','nda','custom') DEFAULT 'custom',
  version INT DEFAULT 1,
  status ENUM('draft','sent','signed','void') DEFAULT 'draft',
  file_s3_key VARCHAR(512) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sent_at TIMESTAMP NULL,
  signed_at TIMESTAMP NULL,
  INDEX idx_contracts_conversation (conversation_id),
  INDEX idx_contracts_creator (created_by_user_id),
  CONSTRAINT fk_contracts_conversation FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS contract_signers (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  contract_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  role ENUM('owner','agent','referrer','other') DEFAULT 'other',
  signed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE uq_contract_signer (contract_id, user_id),
  INDEX idx_contract_signers_user (user_id),
  CONSTRAINT fk_contract_signers_contract FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
