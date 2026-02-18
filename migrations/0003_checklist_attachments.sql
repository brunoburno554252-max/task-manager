-- Migration: Add checklist items and task attachments tables

CREATE TABLE IF NOT EXISTS checklist_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  taskId INTEGER NOT NULL,
  title TEXT NOT NULL,
  isCompleted INTEGER NOT NULL DEFAULT 0,
  sortOrder INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS task_attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  taskId INTEGER NOT NULL,
  fileName TEXT NOT NULL,
  fileSize INTEGER NOT NULL DEFAULT 0,
  fileType TEXT NOT NULL DEFAULT '',
  fileData TEXT NOT NULL,
  uploadedById INTEGER NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (uploadedById) REFERENCES users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_checklist_items_taskId ON checklist_items(taskId);
CREATE INDEX IF NOT EXISTS idx_task_attachments_taskId ON task_attachments(taskId);
