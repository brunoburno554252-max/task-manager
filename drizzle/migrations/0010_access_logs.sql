CREATE TABLE IF NOT EXISTS access_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  userName TEXT,
  action TEXT NOT NULL,
  ipAddress TEXT,
  userAgent TEXT,
  page TEXT,
  sessionStart TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_access_logs_userId ON access_logs(userId);
CREATE INDEX IF NOT EXISTS idx_access_logs_action ON access_logs(action);
CREATE INDEX IF NOT EXISTS idx_access_logs_createdAt ON access_logs(createdAt);
CREATE INDEX IF NOT EXISTS idx_access_logs_userId_createdAt ON access_logs(userId, createdAt);
