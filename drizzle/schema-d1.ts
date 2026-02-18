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
  status: text("status", { enum: ["pending", "in_progress", "completed"] }).default("pending").notNull(),
  priority: text("priority", { enum: ["low", "medium", "high", "urgent"] }).default("medium").notNull(),
  assigneeId: integer("assigneeId"),
  createdById: integer("createdById").notNull(),
  dueDate: integer("dueDate"),
  completedAt: integer("completedAt"),
  pointsAwarded: integer("pointsAwarded").default(0).notNull(),
  sortOrder: integer("sortOrder").default(0).notNull(),
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
