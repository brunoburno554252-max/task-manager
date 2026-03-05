CREATE TABLE IF NOT EXISTS task_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  taskId INTEGER NOT NULL,
  taskTitle TEXT NOT NULL,
  userId INTEGER NOT NULL,
  userName TEXT,
  action TEXT NOT NULL,
  statusBefore TEXT,
  statusAfter TEXT,
  pointsBefore INTEGER NOT NULL DEFAULT 0,
  pointsAfter INTEGER NOT NULL DEFAULT 0,
  pointsChange INTEGER NOT NULL DEFAULT 0,
  reason TEXT NOT NULL,
  isOverdue INTEGER NOT NULL DEFAULT 0,
  dueDate INTEGER,
  completedAt INTEGER,
  affectedUserId INTEGER,
  affectedUserName TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_task_logs_taskId ON task_logs(taskId);
CREATE INDEX IF NOT EXISTS idx_task_logs_userId ON task_logs(userId);
CREATE INDEX IF NOT EXISTS idx_task_logs_affectedUserId ON task_logs(affectedUserId);
CREATE INDEX IF NOT EXISTS idx_task_logs_action ON task_logs(action);
CREATE INDEX IF NOT EXISTS idx_task_logs_createdAt ON task_logs(createdAt);
