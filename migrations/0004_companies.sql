-- Tabela de empresas/sedes
CREATE TABLE IF NOT EXISTS companies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366f1',
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Adicionar coluna companyId na tabela tasks (a tarefa pertence a uma empresa)
ALTER TABLE tasks ADD COLUMN companyId INTEGER REFERENCES companies(id) ON DELETE SET NULL;

-- Índice para buscar tarefas por empresa
CREATE INDEX IF NOT EXISTS idx_tasks_companyId ON tasks(companyId);
