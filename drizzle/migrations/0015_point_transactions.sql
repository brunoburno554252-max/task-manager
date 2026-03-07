CREATE TABLE IF NOT EXISTS point_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  userName TEXT,
  amount INTEGER NOT NULL,
  balanceBefore INTEGER NOT NULL,
  balanceAfter INTEGER NOT NULL,
  type TEXT NOT NULL DEFAULT 'manual_add',
  taskId INTEGER,
  taskTitle TEXT,
  reason TEXT NOT NULL,
  performedBy INTEGER,
  performedByName TEXT,
  metadata TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_pt_userId ON point_transactions(userId);
CREATE INDEX IF NOT EXISTS idx_pt_type ON point_transactions(type);
CREATE INDEX IF NOT EXISTS idx_pt_taskId ON point_transactions(taskId);
CREATE INDEX IF NOT EXISTS idx_pt_createdAt ON point_transactions(createdAt);
CREATE INDEX IF NOT EXISTS idx_pt_performedBy ON point_transactions(performedBy);
