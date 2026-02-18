-- Tabela de vínculo entre empresas e colaboradores (muitos para muitos)
CREATE TABLE IF NOT EXISTS company_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  companyId INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  createdAt TEXT DEFAULT (datetime('now')),
  UNIQUE(companyId, userId)
);

CREATE INDEX IF NOT EXISTS idx_company_members_companyId ON company_members(companyId);
CREATE INDEX IF NOT EXISTS idx_company_members_userId ON company_members(userId);
