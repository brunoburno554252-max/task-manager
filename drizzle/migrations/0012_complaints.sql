CREATE TABLE IF NOT EXISTS complaints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  protocol TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT 'reclamacao',
  category TEXT NOT NULL DEFAULT 'outros',
  priority TEXT NOT NULL DEFAULT 'media',
  status TEXT NOT NULL DEFAULT 'novo',
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  occurrenceDate TEXT,
  occurrenceLocation TEXT,
  authorId INTEGER,
  authorName TEXT,
  authorEmail TEXT,
  authorPhone TEXT,
  isAnonymous INTEGER NOT NULL DEFAULT 0,
  isExternal INTEGER NOT NULL DEFAULT 0,
  assignedToId INTEGER,
  resolution TEXT,
  resolvedAt TEXT,
  resolvedById INTEGER,
  ipAddress TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_complaints_protocol ON complaints(protocol);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_type ON complaints(type);
CREATE INDEX IF NOT EXISTS idx_complaints_authorId ON complaints(authorId);
CREATE INDEX IF NOT EXISTS idx_complaints_assignedToId ON complaints(assignedToId);
CREATE INDEX IF NOT EXISTS idx_complaints_createdAt ON complaints(createdAt);

CREATE TABLE IF NOT EXISTS complaint_responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  complaintId INTEGER NOT NULL,
  userId INTEGER,
  userName TEXT,
  message TEXT NOT NULL,
  isInternal INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_complaint_responses_complaintId ON complaint_responses(complaintId);
