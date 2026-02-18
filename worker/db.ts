import { eq, and, desc, asc, sql, or, like } from "drizzle-orm";
import { drizzle, DrizzleD1Database } from "drizzle-orm/d1";
import {
  InsertUser, users, tasks, InsertTask, Task,
  pointsLog, badges, userBadges, activityLog,
  Badge, taskComments, chatMessages,
  checklistItems, taskAttachments,
} from "../drizzle/schema-d1";

export type Env = {
  DB: D1Database;
  OWNER_OPEN_ID?: string;
  JWT_SECRET?: string;
  VITE_APP_ID?: string;
  OAUTH_SERVER_URL?: string;
  BUILT_IN_FORGE_API_URL?: string;
  BUILT_IN_FORGE_API_KEY?: string;
};

export function getDb(env: Env): DrizzleD1Database {
  return drizzle(env.DB);
}

// ============ USER UPSERT ============

export async function upsertUser(db: DrizzleD1Database, user: InsertUser, ownerOpenId?: string): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const existing = await db.select().from(users).where(eq(users.openId, user.openId)).limit(1);

  const now = new Date().toISOString();

  if (existing.length === 0) {
    // INSERT
    const role = (user.role ?? (user.openId === ownerOpenId ? "admin" : "user")) as "user" | "admin";
    await db.insert(users).values({
      openId: user.openId,
      name: user.name ?? null,
      email: user.email ?? null,
      phone: user.phone ?? null,
      loginMethod: user.loginMethod ?? null,
      role,
      lastSignedIn: user.lastSignedIn ?? now,
      createdAt: now,
      updatedAt: now,
    });
  } else {
    // UPDATE
    const updateData: Record<string, unknown> = { updatedAt: now };
    if (user.name !== undefined) updateData.name = user.name;
    if (user.email !== undefined) updateData.email = user.email;
    if (user.loginMethod !== undefined) updateData.loginMethod = user.loginMethod;
    if (user.lastSignedIn !== undefined) updateData.lastSignedIn = user.lastSignedIn;
    if (user.role !== undefined) {
      updateData.role = user.role;
    } else if (user.openId === ownerOpenId) {
      updateData.role = "admin";
    }
    if (!user.lastSignedIn) updateData.lastSignedIn = now;

    await db.update(users).set(updateData).where(eq(users.openId, user.openId));
  }
}

export async function getUserByOpenId(db: DrizzleD1Database, openId: string) {
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============ USERS ============

export async function getAllUsers(db: DrizzleD1Database) {
  return db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
    totalPoints: users.totalPoints,
    createdAt: users.createdAt,
  }).from(users).orderBy(desc(users.totalPoints));
}

export async function getUserById(db: DrizzleD1Database, id: number) {
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUser(db: DrizzleD1Database, id: number, data: Partial<{
  name: string | null;
  email: string | null;
  phone: string | null;
  role: "user" | "admin";
}>) {
  await db.update(users).set({ ...data, updatedAt: new Date().toISOString() }).where(eq(users.id, id));
}

// ============ TASKS ============

export async function createTask(db: DrizzleD1Database, data: {
  title: string;
  description?: string;
  priority: "low" | "medium" | "high" | "urgent";
  assigneeId?: number;
  createdById: number;
  dueDate?: number;
}) {
  const now = new Date().toISOString();
  const result = await db.insert(tasks).values({
    title: data.title,
    description: data.description ?? null,
    priority: data.priority,
    status: "pending",
    assigneeId: data.assigneeId ?? null,
    createdById: data.createdById,
    dueDate: data.dueDate ?? null,
    pointsAwarded: 0,
    createdAt: now,
    updatedAt: now,
  }).returning({ id: tasks.id });
  return { id: result[0].id };
}

export async function getTaskById(db: DrizzleD1Database, id: number) {
  const result = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function listTasks(db: DrizzleD1Database, filters?: {
  status?: string;
  priority?: string;
  assigneeId?: number;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const conditions = [];
  if (filters?.status && filters.status !== "all") {
    conditions.push(eq(tasks.status, filters.status as Task["status"]));
  }
  if (filters?.priority && filters.priority !== "all") {
    conditions.push(eq(tasks.priority, filters.priority as Task["priority"]));
  }
  if (filters?.assigneeId) {
    conditions.push(eq(tasks.assigneeId, filters.assigneeId));
  }
  if (filters?.search) {
    conditions.push(
      or(
        like(tasks.title, `%${filters.search}%`),
        like(tasks.description, `%${filters.search}%`)
      )
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [taskList, countResult] = await Promise.all([
    db.select().from(tasks)
      .where(where)
      .orderBy(asc(tasks.sortOrder), desc(tasks.createdAt))
      .limit(filters?.limit ?? 50)
      .offset(filters?.offset ?? 0),
    db.select({ count: sql<number>`count(*)` }).from(tasks).where(where),
  ]);

  return { tasks: taskList, total: countResult[0]?.count ?? 0 };
}

export async function updateTask(db: DrizzleD1Database, id: number, data: Partial<{
  title: string;
  description: string;
  status: "pending" | "in_progress" | "completed";
  priority: "low" | "medium" | "high" | "urgent";
  assigneeId: number | null;
  dueDate: number | null;
  completedAt: number | null;
  pointsAwarded: number;
}>) {
  await db.update(tasks).set({ ...data, updatedAt: new Date().toISOString() }).where(eq(tasks.id, id));
}

export async function deleteTask(db: DrizzleD1Database, id: number) {
  await db.delete(tasks).where(eq(tasks.id, id));
}

export async function reorderTasks(db: DrizzleD1Database, orderedIds: number[]) {
  for (let i = 0; i < orderedIds.length; i++) {
    await db.update(tasks).set({ sortOrder: i }).where(eq(tasks.id, orderedIds[i]));
  }
}

// ============ POINTS ============

export async function addPoints(db: DrizzleD1Database, userId: number, points: number, reason: string, taskId?: number) {
  await db.insert(pointsLog).values({
    userId,
    points,
    reason,
    taskId: taskId ?? null,
  });
  await db.update(users).set({
    totalPoints: sql`${users.totalPoints} + ${points}`,
    updatedAt: new Date().toISOString(),
  }).where(eq(users.id, userId));
}

export async function getUserPoints(db: DrizzleD1Database, userId: number) {
  return db.select().from(pointsLog)
    .where(eq(pointsLog.userId, userId))
    .orderBy(desc(pointsLog.createdAt))
    .limit(50);
}

// ============ RANKING ============

export async function getRanking(db: DrizzleD1Database) {
  const result = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
    totalPoints: users.totalPoints,
    completedTasks: sql<number>`(SELECT COUNT(*) FROM tasks WHERE tasks.assigneeId = users.id AND tasks.status = 'completed')`,
    onTimeTasks: sql<number>`(SELECT COUNT(*) FROM tasks WHERE tasks.assigneeId = users.id AND tasks.status = 'completed' AND (tasks.dueDate IS NULL OR tasks.completedAt <= tasks.dueDate))`,
    totalAssigned: sql<number>`(SELECT COUNT(*) FROM tasks WHERE tasks.assigneeId = users.id)`,
  }).from(users).orderBy(desc(users.totalPoints));

  return result;
}

// ============ BADGES ============

export async function seedBadges(db: DrizzleD1Database) {
  const existing = await db.select().from(badges);
  if (existing.length > 0) return;

  const defaultBadges = [
    { name: "Primeira Tarefa", description: "Completou a primeira tarefa", icon: "🎯", requirement: "tasks_completed", threshold: 1 },
    { name: "Produtivo", description: "Completou 10 tarefas", icon: "⚡", requirement: "tasks_completed", threshold: 10 },
    { name: "Máquina", description: "Completou 50 tarefas", icon: "🔥", requirement: "tasks_completed", threshold: 50 },
    { name: "Lenda", description: "Completou 100 tarefas", icon: "🏆", requirement: "tasks_completed", threshold: 100 },
    { name: "Pontual", description: "Completou 5 tarefas no prazo", icon: "⏰", requirement: "on_time", threshold: 5 },
    { name: "Relógio Suíço", description: "Completou 25 tarefas no prazo", icon: "🕐", requirement: "on_time", threshold: 25 },
    { name: "Iniciante", description: "Alcançou 100 pontos", icon: "⭐", requirement: "points", threshold: 100 },
    { name: "Experiente", description: "Alcançou 500 pontos", icon: "🌟", requirement: "points", threshold: 500 },
    { name: "Mestre", description: "Alcançou 1000 pontos", icon: "💎", requirement: "points", threshold: 1000 },
    { name: "Velocista", description: "Completou 5 tarefas urgentes", icon: "🚀", requirement: "urgent_completed", threshold: 5 },
  ];

  await db.insert(badges).values(defaultBadges);
}

export async function getAllBadges(db: DrizzleD1Database) {
  return db.select().from(badges).orderBy(asc(badges.threshold));
}

export async function getUserBadges(db: DrizzleD1Database, userId: number) {
  const result = await db.select({
    id: userBadges.id,
    badgeId: userBadges.badgeId,
    earnedAt: userBadges.earnedAt,
    name: badges.name,
    description: badges.description,
    icon: badges.icon,
  }).from(userBadges)
    .innerJoin(badges, eq(userBadges.badgeId, badges.id))
    .where(eq(userBadges.userId, userId));
  return result;
}

export async function checkAndAwardBadges(db: DrizzleD1Database, userId: number) {
  const allBadges = await db.select().from(badges);
  const existingBadges = await db.select().from(userBadges).where(eq(userBadges.userId, userId));
  const existingBadgeIds = new Set(existingBadges.map(b => b.badgeId));

  const [completedResult] = await db.select({
    count: sql<number>`count(*)`,
  }).from(tasks).where(and(eq(tasks.assigneeId, userId), eq(tasks.status, "completed")));

  const [onTimeResult] = await db.select({
    count: sql<number>`count(*)`,
  }).from(tasks).where(and(
    eq(tasks.assigneeId, userId),
    eq(tasks.status, "completed"),
    or(
      sql`${tasks.dueDate} IS NULL`,
      sql`${tasks.completedAt} <= ${tasks.dueDate}`
    )
  ));

  const [urgentResult] = await db.select({
    count: sql<number>`count(*)`,
  }).from(tasks).where(and(
    eq(tasks.assigneeId, userId),
    eq(tasks.status, "completed"),
    eq(tasks.priority, "urgent")
  ));

  const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const userPoints = user[0]?.totalPoints ?? 0;

  const stats: Record<string, number> = {
    tasks_completed: completedResult?.count ?? 0,
    on_time: onTimeResult?.count ?? 0,
    points: userPoints,
    urgent_completed: urgentResult?.count ?? 0,
  };

  const newBadges: Badge[] = [];
  for (const badge of allBadges) {
    if (existingBadgeIds.has(badge.id)) continue;
    const stat = stats[badge.requirement] ?? 0;
    if (stat >= badge.threshold) {
      await db.insert(userBadges).values({ userId, badgeId: badge.id });
      newBadges.push(badge);
    }
  }

  return newBadges;
}

// ============ ACTIVITY LOG ============

export async function logActivity(db: DrizzleD1Database, data: {
  userId: number;
  action: string;
  entityType: string;
  entityId?: number;
  details?: string;
}) {
  await db.insert(activityLog).values({
    userId: data.userId,
    action: data.action,
    entityType: data.entityType,
    entityId: data.entityId ?? null,
    details: data.details ?? null,
  });
}

export async function getActivityLog(db: DrizzleD1Database, filters?: { userId?: number; limit?: number }) {
  const conditions = [];
  if (filters?.userId) {
    conditions.push(eq(activityLog.userId, filters.userId));
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  return db.select().from(activityLog)
    .where(where)
    .orderBy(desc(activityLog.createdAt))
    .limit(filters?.limit ?? 100);
}

// ============ COMMENTS ============

export async function createComment(db: DrizzleD1Database, data: { taskId: number; userId: number; content: string }) {
  const result = await db.insert(taskComments).values(data).returning({ id: taskComments.id });
  return { id: result[0].id };
}

export async function getCommentsByTaskId(db: DrizzleD1Database, taskId: number) {
  return db.select({
    id: taskComments.id,
    taskId: taskComments.taskId,
    userId: taskComments.userId,
    content: taskComments.content,
    createdAt: taskComments.createdAt,
    userName: users.name,
  }).from(taskComments)
    .leftJoin(users, eq(taskComments.userId, users.id))
    .where(eq(taskComments.taskId, taskId))
    .orderBy(desc(taskComments.createdAt));
}

export async function deleteComment(db: DrizzleD1Database, id: number) {
  await db.delete(taskComments).where(eq(taskComments.id, id));
}

export async function getTaskActivities(db: DrizzleD1Database, taskId: number) {
  return db.select({
    id: activityLog.id,
    userId: activityLog.userId,
    action: activityLog.action,
    details: activityLog.details,
    createdAt: activityLog.createdAt,
    userName: users.name,
  }).from(activityLog)
    .leftJoin(users, eq(activityLog.userId, users.id))
    .where(and(eq(activityLog.entityType, "task"), eq(activityLog.entityId, taskId)))
    .orderBy(desc(activityLog.createdAt));
}

// ============ DASHBOARD STATS ============

export async function getDashboardStats(db: DrizzleD1Database, userId?: number) {
  const now = Date.now();
  const baseCondition = userId ? eq(tasks.assigneeId, userId) : undefined;

  const [totalResult] = await db.select({ count: sql<number>`count(*)` })
    .from(tasks).where(baseCondition);

  const [pendingResult] = await db.select({ count: sql<number>`count(*)` })
    .from(tasks).where(baseCondition ? and(baseCondition, eq(tasks.status, "pending")) : eq(tasks.status, "pending"));

  const [inProgressResult] = await db.select({ count: sql<number>`count(*)` })
    .from(tasks).where(baseCondition ? and(baseCondition, eq(tasks.status, "in_progress")) : eq(tasks.status, "in_progress"));

  const [completedResult] = await db.select({ count: sql<number>`count(*)` })
    .from(tasks).where(baseCondition ? and(baseCondition, eq(tasks.status, "completed")) : eq(tasks.status, "completed"));

  const [overdueResult] = await db.select({ count: sql<number>`count(*)` })
    .from(tasks).where(
      baseCondition
        ? and(baseCondition, sql`${tasks.status} != 'completed'`, sql`${tasks.dueDate} IS NOT NULL`, sql`${tasks.dueDate} < ${now}`)
        : and(sql`${tasks.status} != 'completed'`, sql`${tasks.dueDate} IS NOT NULL`, sql`${tasks.dueDate} < ${now}`)
    );

  const total = totalResult?.count ?? 0;
  const completed = completedResult?.count ?? 0;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    total,
    pending: pendingResult?.count ?? 0,
    inProgress: inProgressResult?.count ?? 0,
    completed,
    overdue: overdueResult?.count ?? 0,
    completionRate,
  };
}

export async function getRecentCompletions(db: DrizzleD1Database, days: number = 30) {
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  return db.select({
    completedAt: tasks.completedAt,
    assigneeId: tasks.assigneeId,
  }).from(tasks)
    .where(and(
      eq(tasks.status, "completed"),
      sql`${tasks.completedAt} IS NOT NULL`,
      sql`${tasks.completedAt} >= ${since}`
    ))
    .orderBy(asc(tasks.completedAt));
}

// ============ COLLABORATOR STATS ============

export async function getCollaboratorsWithStats(db: DrizzleD1Database) {
  const result = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    phone: users.phone,
    role: users.role,
    totalPoints: users.totalPoints,
    createdAt: users.createdAt,
    pendingTasks: sql<number>`(SELECT COUNT(*) FROM tasks WHERE tasks.assigneeId = users.id AND tasks.status = 'pending')`,
    inProgressTasks: sql<number>`(SELECT COUNT(*) FROM tasks WHERE tasks.assigneeId = users.id AND tasks.status = 'in_progress')`,
    completedTasks: sql<number>`(SELECT COUNT(*) FROM tasks WHERE tasks.assigneeId = users.id AND tasks.status = 'completed')`,
    totalTasks: sql<number>`(SELECT COUNT(*) FROM tasks WHERE tasks.assigneeId = users.id)`,
  }).from(users).orderBy(desc(users.totalPoints));

  return result;
}

// ============ CHAT ============

export async function sendChatMessage(db: DrizzleD1Database, userId: number, content: string) {
  const result = await db.insert(chatMessages).values({ userId, content }).returning({ id: chatMessages.id });
  return { id: result[0].id };
}

export async function getChatMessages(db: DrizzleD1Database, limit: number = 100, beforeId?: number) {
  const conditions = beforeId ? [sql`${chatMessages.id} < ${beforeId}`] : [];
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  return db.select({
    id: chatMessages.id,
    userId: chatMessages.userId,
    content: chatMessages.content,
    createdAt: chatMessages.createdAt,
    userName: users.name,
    userRole: users.role,
  }).from(chatMessages)
    .leftJoin(users, eq(chatMessages.userId, users.id))
    .where(where)
    .orderBy(desc(chatMessages.createdAt))
    .limit(limit);
}

// ============ CHECKLIST ============

export async function getChecklistByTaskId(db: DrizzleD1Database, taskId: number) {
  return db.select().from(checklistItems)
    .where(eq(checklistItems.taskId, taskId))
    .orderBy(asc(checklistItems.sortOrder), asc(checklistItems.id));
}

export async function createChecklistItem(db: DrizzleD1Database, data: {
  taskId: number;
  title: string;
  sortOrder?: number;
}) {
  const result = await db.insert(checklistItems).values({
    taskId: data.taskId,
    title: data.title,
    isCompleted: 0,
    sortOrder: data.sortOrder ?? 0,
  }).returning({ id: checklistItems.id });
  return { id: result[0].id };
}

export async function createChecklistItems(db: DrizzleD1Database, taskId: number, items: { title: string; sortOrder: number }[]) {
  if (items.length === 0) return [];
  const results = [];
  for (const item of items) {
    const result = await db.insert(checklistItems).values({
      taskId,
      title: item.title,
      isCompleted: 0,
      sortOrder: item.sortOrder,
    }).returning({ id: checklistItems.id });
    results.push({ id: result[0].id });
  }
  return results;
}

export async function updateChecklistItem(db: DrizzleD1Database, id: number, data: Partial<{
  title: string;
  isCompleted: number;
  sortOrder: number;
}>) {
  await db.update(checklistItems).set({
    ...data,
    updatedAt: new Date().toISOString(),
  }).where(eq(checklistItems.id, id));
}

export async function deleteChecklistItem(db: DrizzleD1Database, id: number) {
  await db.delete(checklistItems).where(eq(checklistItems.id, id));
}

export async function deleteChecklistByTaskId(db: DrizzleD1Database, taskId: number) {
  await db.delete(checklistItems).where(eq(checklistItems.taskId, taskId));
}

// ============ ATTACHMENTS ============

export async function getAttachmentsByTaskId(db: DrizzleD1Database, taskId: number) {
  return db.select({
    id: taskAttachments.id,
    taskId: taskAttachments.taskId,
    fileName: taskAttachments.fileName,
    fileSize: taskAttachments.fileSize,
    fileType: taskAttachments.fileType,
    uploadedById: taskAttachments.uploadedById,
    createdAt: taskAttachments.createdAt,
    uploaderName: users.name,
  }).from(taskAttachments)
    .leftJoin(users, eq(taskAttachments.uploadedById, users.id))
    .where(eq(taskAttachments.taskId, taskId))
    .orderBy(desc(taskAttachments.createdAt));
}

export async function getAttachmentById(db: DrizzleD1Database, id: number) {
  const result = await db.select().from(taskAttachments).where(eq(taskAttachments.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createAttachment(db: DrizzleD1Database, data: {
  taskId: number;
  fileName: string;
  fileSize: number;
  fileType: string;
  fileData: string;
  uploadedById: number;
}) {
  const result = await db.insert(taskAttachments).values(data).returning({ id: taskAttachments.id });
  return { id: result[0].id };
}

export async function deleteAttachment(db: DrizzleD1Database, id: number) {
  await db.delete(taskAttachments).where(eq(taskAttachments.id, id));
}

export async function deleteAttachmentsByTaskId(db: DrizzleD1Database, taskId: number) {
  await db.delete(taskAttachments).where(eq(taskAttachments.taskId, taskId));
}
