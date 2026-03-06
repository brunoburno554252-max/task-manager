CREATE TABLE IF NOT EXISTS external_tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  protocol TEXT NOT NULL UNIQUE,
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  status TEXT NOT NULL DEFAULT 'aberto',
  priority TEXT NOT NULL DEFAULT 'media',
  type TEXT NOT NULL DEFAULT 'reclamacao',
  contactName TEXT NOT NULL,
  contactPhone TEXT,
  contactEmail TEXT,
  contactCompany TEXT,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  receivedAt TEXT NOT NULL DEFAULT (datetime('now')),
  dueDate TEXT,
  registeredById INTEGER NOT NULL,
  registeredByName TEXT,
  assignedToId INTEGER,
  assignedToName TEXT,
  resolution TEXT,
  resolvedAt TEXT,
  tags TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_external_tickets_protocol ON external_tickets(protocol);
CREATE INDEX idx_external_tickets_status ON external_tickets(status);
CREATE INDEX idx_external_tickets_channel ON external_tickets(channel);
CREATE INDEX idx_external_tickets_registeredById ON external_tickets(registeredById);
CREATE INDEX idx_external_tickets_assignedToId ON external_tickets(assignedToId);
CREATE INDEX idx_external_tickets_createdAt ON external_tickets(createdAt);

CREATE TABLE IF NOT EXISTS external_ticket_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticketId INTEGER NOT NULL,
  userId INTEGER NOT NULL,
  userName TEXT,
  content TEXT NOT NULL,
  noteType TEXT NOT NULL DEFAULT 'nota',
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_external_ticket_notes_ticketId ON external_ticket_notes(ticketId);
