import { eq, and, desc, asc, sql, inArray, or, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users, tasks, InsertTask, Task,
  pointsLog, badges, userBadges, activityLog,
  Badge, taskComments, chatMessages,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============ USERS ============

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
    totalPoints: users.totalPoints,
    createdAt: users.createdAt,
  }).from(users).orderBy(desc(users.totalPoints));
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============ TASKS ============

export async function createTask(data: {
  title: string;
  description?: string;
  priority: "low" | "medium" | "high" | "urgent";
  assigneeId?: number;
  createdById: number;
  dueDate?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(tasks).values({
    title: data.title,
    description: data.description ?? null,
    priority: data.priority,
    status: "pending",
    assigneeId: data.assigneeId ?? null,
    createdById: data.createdById,
    dueDate: data.dueDate ?? null,
    pointsAwarded: 0,
  });
  return { id: result[0].insertId };
}

export async function getTaskById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function listTasks(filters?: {
  status?: string;
  priority?: string;
  assigneeId?: number;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return { tasks: [], total: 0 };

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

export async function updateTask(id: number, data: Partial<{
  title: string;
  description: string;
  status: "pending" | "in_progress" | "completed";
  priority: "low" | "medium" | "high" | "urgent";
  assigneeId: number | null;
  dueDate: number | null;
  completedAt: number | null;
  pointsAwarded: number;
}>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(tasks).set(data).where(eq(tasks.id, id));
}

export async function deleteTask(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(tasks).where(eq(tasks.id, id));
}

export async function reorderTasks(orderedIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Update sortOrder for each task based on its position in the array
  const updates = orderedIds.map((id, index) =>
    db.update(tasks).set({ sortOrder: index }).where(eq(tasks.id, id))
  );
  await Promise.all(updates);
}

// ============ POINTS ============

export async function addPoints(userId: number, points: number, reason: string, taskId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(pointsLog).values({
    userId,
    points,
    reason,
    taskId: taskId ?? null,
  });
  await db.update(users).set({
    totalPoints: sql`${users.totalPoints} + ${points}`,
  }).where(eq(users.id, userId));
}

export async function getUserPoints(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pointsLog)
    .where(eq(pointsLog.userId, userId))
    .orderBy(desc(pointsLog.createdAt))
    .limit(50);
}

// ============ RANKING ============

export async function getRanking() {
  const db = await getDb();
  if (!db) return [];

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

export async function seedBadges() {
  const db = await getDb();
  if (!db) return;
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

export async function getAllBadges() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(badges).orderBy(asc(badges.threshold));
}

export async function getUserBadges(userId: number) {
  const db = await getDb();
  if (!db) return [];
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

export async function checkAndAwardBadges(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const allBadges = await db.select().from(badges);
  const existingBadges = await db.select().from(userBadges).where(eq(userBadges.userId, userId));
  const existingBadgeIds = new Set(existingBadges.map(b => b.badgeId));

  // Get user stats
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

export async function logActivity(data: {
  userId: number;
  action: string;
  entityType: string;
  entityId?: number;
  details?: string;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(activityLog).values({
    userId: data.userId,
    action: data.action,
    entityType: data.entityType,
    entityId: data.entityId ?? null,
    details: data.details ?? null,
  });
}

export async function getActivityLog(filters?: { userId?: number; limit?: number }) {
  const db = await getDb();
  if (!db) return [];
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

export async function createComment(data: { taskId: number; userId: number; content: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(taskComments).values(data);
  return { id: result[0].insertId };
}

export async function getCommentsByTaskId(taskId: number) {
  const db = await getDb();
  if (!db) return [];
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

export async function deleteComment(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(taskComments).where(eq(taskComments.id, id));
}

export async function getTaskActivities(taskId: number) {
  const db = await getDb();
  if (!db) return [];
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

export async function getDashboardStats(userId?: number) {
  const db = await getDb();
  if (!db) return { total: 0, pending: 0, inProgress: 0, completed: 0, overdue: 0, completionRate: 0 };

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

export async function getRecentCompletions(days: number = 30) {
  const db = await getDb();
  if (!db) return [];
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

export async function getCollaboratorsWithStats() {
  const db = await getDb();
  if (!db) return [];

  const result = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
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

export async function sendChatMessage(userId: number, content: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(chatMessages).values({ userId, content });
  return { id: result[0].insertId };
}

export async function getChatMessages(limit: number = 100, beforeId?: number) {
  const db = await getDb();
  if (!db) return [];
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
