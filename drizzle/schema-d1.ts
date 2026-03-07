import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  openId: text("openId").notNull().unique(),
  name: text("name"),
  email: text("email"),
  phone: text("phone"),
  loginMethod: text("loginMethod"),
  role: text("role", { enum: ["user", "admin"] }).default("user").notNull(),
  passwordHash: text("passwordHash"),
  totalPoints: integer("totalPoints").default(0).notNull(),
  avatarUrl: text("avatarUrl"),
  isActive: integer("isActive").default(1).notNull(), // 1 = ativo, 0 = inativo
  createdAt: text("createdAt").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updatedAt").notNull().$defaultFn(() => new Date().toISOString()),
  lastSignedIn: text("lastSignedIn").notNull().$defaultFn(() => new Date().toISOString()),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status", { enum: ["pending", "in_progress", "review", "completed"] }).default("pending").notNull(),
  priority: text("priority", { enum: ["low", "medium", "high", "urgent"] }).default("medium").notNull(),
  assigneeId: integer("assigneeId"),
  createdById: integer("createdById").notNull(),
  dueDate: integer("dueDate"),
  startTime: text("startTime"),
  endTime: text("endTime"),
  completedAt: integer("completedAt"),
  pointsAwarded: integer("pointsAwarded").default(0).notNull(),
  sortOrder: integer("sortOrder").default(0).notNull(),
  companyId: integer("companyId"),
  createdAt: text("createdAt").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updatedAt").notNull().$defaultFn(() => new Date().toISOString()),
});

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;

export const pointsLog = sqliteTable("points_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  points: integer("points").notNull(),
  reason: text("reason").notNull(),
  taskId: integer("taskId"),
  createdAt: text("createdAt").notNull().$defaultFn(() => new Date().toISOString()),
});

export type PointsLog = typeof pointsLog.$inferSelect;

export const pointsAudit = sqliteTable("points_audit", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  taskId: integer("taskId").notNull(),
  taskTitle: text("taskTitle").notNull(),
  oldPoints: integer("oldPoints").notNull(),
  newPoints: integer("newPoints").notNull(),
  changedBy: integer("changedBy").notNull(),
  changedByName: text("changedByName"),
  action: text("action").notNull(),
  reason: text("reason").notNull(),
  statusBefore: text("statusBefore"),
  statusAfter: text("statusAfter"),
  createdAt: text("createdAt").notNull().$defaultFn(() => new Date().toISOString()),
});

export type PointsAudit = typeof pointsAudit.$inferSelect;

export const badges = sqliteTable("badges", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
  requirement: text("requirement").notNull(),
  threshold: integer("threshold").notNull(),
  createdAt: text("createdAt").notNull().$defaultFn(() => new Date().toISOString()),
});

export type Badge = typeof badges.$inferSelect;

export const userBadges = sqliteTable("user_badges", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  badgeId: integer("badgeId").notNull(),
  earnedAt: text("earnedAt").notNull().$defaultFn(() => new Date().toISOString()),
});

export type UserBadge = typeof userBadges.$inferSelect;

export const activityLog = sqliteTable("activity_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  action: text("action").notNull(),
  entityType: text("entityType").notNull(),
  entityId: integer("entityId"),
  details: text("details"),
  createdAt: text("createdAt").notNull().$defaultFn(() => new Date().toISOString()),
});

export type ActivityLog = typeof activityLog.$inferSelect;

export const taskComments = sqliteTable("task_comments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  taskId: integer("taskId").notNull(),
  userId: integer("userId").notNull(),
  content: text("content").notNull(),
  createdAt: text("createdAt").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updatedAt").notNull().$defaultFn(() => new Date().toISOString()),
});

export type TaskComment = typeof taskComments.$inferSelect;
export type InsertTaskComment = typeof taskComments.$inferInsert;

export const chatMessages = sqliteTable("chat_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  companyId: integer("companyId"),
  content: text("content").notNull(),
  createdAt: text("createdAt").notNull().$defaultFn(() => new Date().toISOString()),
});

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;

export const checklistItems = sqliteTable("checklist_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  taskId: integer("taskId").notNull(),
  title: text("title").notNull(),
  isCompleted: integer("isCompleted").default(0).notNull(),
  sortOrder: integer("sortOrder").default(0).notNull(),
  createdAt: text("createdAt").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updatedAt").notNull().$defaultFn(() => new Date().toISOString()),
});

export type ChecklistItem = typeof checklistItems.$inferSelect;
export type InsertChecklistItem = typeof checklistItems.$inferInsert;

export const taskAttachments = sqliteTable("task_attachments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  taskId: integer("taskId").notNull(),
  fileName: text("fileName").notNull(),
  fileSize: integer("fileSize").default(0).notNull(),
  fileType: text("fileType").default("").notNull(),
  fileData: text("fileData").notNull(),
  uploadedById: integer("uploadedById").notNull(),
  createdAt: text("createdAt").notNull().$defaultFn(() => new Date().toISOString()),
});

export type TaskAttachment = typeof taskAttachments.$inferSelect;
export type InsertTaskAttachment = typeof taskAttachments.$inferInsert;

export const companies = sqliteTable("companies", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color").default("#6366f1").notNull(),
  createdAt: text("createdAt").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updatedAt").notNull().$defaultFn(() => new Date().toISOString()),
});

export type Company = typeof companies.$inferSelect;
export type InsertCompany = typeof companies.$inferInsert;

export const taskAssignees = sqliteTable("task_assignees", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  taskId: integer("taskId").notNull(),
  userId: integer("userId").notNull(),
  createdAt: text("createdAt").notNull().$defaultFn(() => new Date().toISOString()),
});

export type TaskAssignee = typeof taskAssignees.$inferSelect;
export type InsertTaskAssignee = typeof taskAssignees.$inferInsert;

export const companyMembers = sqliteTable("company_members", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("companyId").notNull(),
  userId: integer("userId").notNull(),
  createdAt: text("createdAt").notNull().$defaultFn(() => new Date().toISOString()),
});

export type CompanyMember = typeof companyMembers.$inferSelect;
export type InsertCompanyMember = typeof companyMembers.$inferInsert;

export const notifications = sqliteTable("notifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  entityType: text("entityType"),
  entityId: integer("entityId"),
  isRead: integer("isRead").default(0).notNull(),
  createdAt: text("createdAt").notNull().$defaultFn(() => new Date().toISOString()),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// ===== CAIXA DE IDEIAS =====
export const ideas = sqliteTable("ideas", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status", { enum: ["new", "rejected", "analysis", "approved"] }).default("new").notNull(),
  authorId: integer("authorId").notNull(),
  pointsAwarded: integer("pointsAwarded").default(0).notNull(),
  approvedById: integer("approvedById"),
  rejectionReason: text("rejectionReason"),
  createdAt: text("createdAt").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updatedAt").notNull().$defaultFn(() => new Date().toISOString()),
});

export type Idea = typeof ideas.$inferSelect;
export type InsertIdea = typeof ideas.$inferInsert;

// ===== SISTEMA DE LOGS COMPLETO =====
export const taskLogs = sqliteTable("task_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  taskId: integer("taskId").notNull(),
  taskTitle: text("taskTitle").notNull(),
  userId: integer("userId").notNull(),
  userName: text("userName"),
  action: text("action").notNull(),
  statusBefore: text("statusBefore"),
  statusAfter: text("statusAfter"),
  pointsBefore: integer("pointsBefore").default(0).notNull(),
  pointsAfter: integer("pointsAfter").default(0).notNull(),
  pointsChange: integer("pointsChange").default(0).notNull(),
  reason: text("reason").notNull(),
  isOverdue: integer("isOverdue").default(0).notNull(),
  dueDate: integer("dueDate"),
  completedAt: integer("completedAt"),
  affectedUserId: integer("affectedUserId"),
  affectedUserName: text("affectedUserName"),
  createdAt: text("createdAt").notNull().$defaultFn(() => new Date().toISOString()),
});

export type TaskLog = typeof taskLogs.$inferSelect;
export type InsertTaskLog = typeof taskLogs.$inferInsert;

// ===== COLABORADOR DESTAQUE (pontos livres) =====
export const highlightPoints = sqliteTable("highlight_points", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  points: integer("points").notNull(),
  reason: text("reason").notNull(),
  awardedById: integer("awardedById").notNull(),
  createdAt: text("createdAt").notNull().$defaultFn(() => new Date().toISOString()),
});

export type HighlightPoint = typeof highlightPoints.$inferSelect;
export type InsertHighlightPoint = typeof highlightPoints.$inferInsert;

// ===== LOGS DE ACESSO À PLATAFORMA =====
export const accessLogs = sqliteTable("access_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  userName: text("userName"),
  action: text("action").notNull(), // 'login' | 'page_view' | 'heartbeat'
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  page: text("page"), // qual página acessou
  sessionStart: text("sessionStart"),
  createdAt: text("createdAt").notNull().$defaultFn(() => new Date().toISOString()),
});
export type AccessLog = typeof accessLogs.$inferSelect;
export type InsertAccessLog = typeof accessLogs.$inferInsert;

// ===== OUVIDORIA CEO =====
export const complaints = sqliteTable("complaints", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  // Protocolo único para rastreamento (ex: OUV-2026-00001)
  protocol: text("protocol").notNull().unique(),
  // Tipo: reclamacao, sugestao, elogio, denuncia
  type: text("type", { enum: ["reclamacao", "sugestao", "elogio", "denuncia"] }).default("reclamacao").notNull(),
  // Categoria
  category: text("category", { enum: ["atraso_diploma", "atendimento_aluno", "atendimento_polo", "estorno_devolucao", "elogio", "procon", "judicial", "colaborador", "interno", "outros"] }).default("outros").notNull(),
  // Prioridade
  priority: text("priority", { enum: ["baixa", "media", "alta", "urgente"] }).default("media").notNull(),
  // Status do andamento
  status: text("status", { enum: ["em_analise", "resolvido", "encerrado_sem_resolucao", "aguardando_informacoes"] }).default("em_analise").notNull(),
  // Nome e telefone do envolvido
  involvedName: text("involvedName"),
  involvedPhone: text("involvedPhone"),
  // Data da resolução
  resolutionDate: text("resolutionDate"),
  // Assunto e descrição detalhada
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  // Data da ocorrência (quando o fato aconteceu)
  occurrenceDate: text("occurrenceDate"),
  // Local da ocorrência
  occurrenceLocation: text("occurrenceLocation"),
  // Autor (null = anônimo externo)
  authorId: integer("authorId"),
  authorName: text("authorName"), // Para externos que queiram se identificar
  authorEmail: text("authorEmail"), // Para contato de retorno
  authorPhone: text("authorPhone"),
  // Se é anônimo
  isAnonymous: integer("isAnonymous").default(0).notNull(),
  // Se veio do formulário externo
  isExternal: integer("isExternal").default(0).notNull(),
  // Admin responsável pelo caso
  assignedToId: integer("assignedToId"),
  // Resolução final
  resolution: text("resolution"),
  resolvedAt: text("resolvedAt"),
  resolvedById: integer("resolvedById"),
  // IP do remetente (para externos)
  ipAddress: text("ipAddress"),
  // Timestamps
  createdAt: text("createdAt").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updatedAt").notNull().$defaultFn(() => new Date().toISOString()),
});

export type Complaint = typeof complaints.$inferSelect;
export type InsertComplaint = typeof complaints.$inferInsert;

// Respostas/acompanhamento das reclamações
export const complaintResponses = sqliteTable("complaint_responses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  complaintId: integer("complaintId").notNull(),
  userId: integer("userId"), // null = sistema
  userName: text("userName"),
  message: text("message").notNull(),
  // Se é resposta interna (só admin vê) ou pública (autor vê)
  isInternal: integer("isInternal").default(0).notNull(),
  createdAt: text("createdAt").notNull().$defaultFn(() => new Date().toISOString()),
});

export type ComplaintResponse = typeof complaintResponses.$inferSelect;
export type InsertComplaintResponse = typeof complaintResponses.$inferInsert;

// ===== CHAMADOS EXTERNOS (WhatsApp, Bitrix, Telefone, E-mail, etc.) =====
export const externalTickets = sqliteTable("external_tickets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  // Protocolo único (ex: CHE-2026-00001)
  protocol: text("protocol").notNull().unique(),
  // Canal de origem
  channel: text("channel", { enum: ["whatsapp", "bitrix", "telefone", "email", "instagram", "presencial", "outro"] }).default("whatsapp").notNull(),
  // Status
  status: text("status", { enum: ["aberto", "em_andamento", "aguardando", "resolvido", "cancelado"] }).default("aberto").notNull(),
  // Prioridade
  priority: text("priority", { enum: ["baixa", "media", "alta", "urgente"] }).default("media").notNull(),
  // Tipo do chamado
  type: text("type", { enum: ["reclamacao", "duvida", "solicitacao", "sugestao", "informacao", "outro"] }).default("reclamacao").notNull(),
  // Dados do solicitante externo
  contactName: text("contactName").notNull(),
  contactPhone: text("contactPhone"),
  contactEmail: text("contactEmail"),
  contactCompany: text("contactCompany"), // empresa do solicitante
  // Conteúdo do chamado
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  // Data/hora que o chamado foi recebido (pode ser diferente do createdAt)
  receivedAt: text("receivedAt").notNull().$defaultFn(() => new Date().toISOString()),
  // Prazo para resposta/resolução
  dueDate: text("dueDate"),
  // Quem registrou no sistema
  registeredById: integer("registeredById").notNull(),
  registeredByName: text("registeredByName"),
  // Admin responsável pelo caso
  assignedToId: integer("assignedToId"),
  assignedToName: text("assignedToName"),
  // Resolução
  resolution: text("resolution"),
  resolvedAt: text("resolvedAt"),
  // Tags/etiquetas para organização
  tags: text("tags"), // separadas por vírgula
  // Timestamps
  createdAt: text("createdAt").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updatedAt").notNull().$defaultFn(() => new Date().toISOString()),
});

export type ExternalTicket = typeof externalTickets.$inferSelect;
export type InsertExternalTicket = typeof externalTickets.$inferInsert;

// Notas/acompanhamento dos chamados externos
export const externalTicketNotes = sqliteTable("external_ticket_notes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ticketId: integer("ticketId").notNull(),
  userId: integer("userId").notNull(),
  userName: text("userName"),
  content: text("content").notNull(),
  // Tipo da nota: anotação interna, resposta ao cliente, ligação feita, etc.
  noteType: text("noteType", { enum: ["nota", "resposta", "ligacao", "email_enviado", "whatsapp_enviado", "atualizacao"] }).default("nota").notNull(),
  createdAt: text("createdAt").notNull().$defaultFn(() => new Date().toISOString()),
});

export type ExternalTicketNote = typeof externalTicketNotes.$inferSelect;
export type InsertExternalTicketNote = typeof externalTicketNotes.$inferInsert;

// ===== SISTEMA BRUTO DE PONTOS =====
export const pointTransactions = sqliteTable("point_transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  userName: text("userName"), // snapshot do nome no momento
  amount: integer("amount").notNull(), // positivo = ganho, negativo = perda
  balanceBefore: integer("balanceBefore").notNull(), // saldo ANTES da transação
  balanceAfter: integer("balanceAfter").notNull(), // saldo DEPOIS da transação
  type: text("type", { enum: [
    "task_completion", // ganhou pontos por completar tarefa
    "task_overdue_penalty", // perdeu pontos por atraso
    "task_revert", // pontos revertidos (tarefa rejeitada, etc)
    "manual_add", // admin adicionou manualmente
    "manual_remove", // admin removeu manualmente
    "manual_adjust", // admin ajustou manualmente
    "highlight_bonus", // bônus de destaque
    "achievement_bonus", // bônus de conquista
    "correction", // correção de inconsistência
  ] }).notNull(),
  taskId: integer("taskId"), // referência à tarefa (se aplicável)
  taskTitle: text("taskTitle"), // snapshot do título da tarefa
  reason: text("reason").notNull(), // descrição detalhada
  performedBy: integer("performedBy"), // quem executou (admin ID, ou null se sistema)
  performedByName: text("performedByName"), // snapshot do nome de quem executou
  metadata: text("metadata"), // JSON com dados extras (prioridade, prazo, etc)
  createdAt: text("createdAt").notNull().$defaultFn(() => new Date().toISOString()),
});
export type PointTransaction = typeof pointTransactions.$inferSelect;
export type InsertPointTransaction = typeof pointTransactions.$inferInsert;
