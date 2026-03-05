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
