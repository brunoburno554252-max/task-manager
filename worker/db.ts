import { eq, and, desc, asc, sql, or, like } from "drizzle-orm";
import { drizzle, DrizzleD1Database } from "drizzle-orm/d1";
import {
  InsertUser, users, tasks, InsertTask, Task,
  pointsLog, badges, userBadges, activityLog,
  Badge, taskComments, chatMessages,
  checklistItems, taskAttachments, companies, companyMembers, taskAssignees,
  notifications, pointsAudit, ideas, highlightPoints,
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
    avatarUrl: users.avatarUrl,
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
  avatarUrl: string | null;
}>) {
  await db.update(users).set({ ...data, updatedAt: new Date().toISOString() }).where(eq(users.id, id));
}

// ============ TASKS ============

export async function createTask(db: DrizzleD1Database, data: {
  title: string;
  description?: string;
  priority: "low" | "medium" | "high" | "urgent";
  assigneeId?: number;
  assigneeIds?: number[];
  createdById: number;
  dueDate?: number;
  startTime?: string;
  endTime?: string;
  companyId?: number;
  pointsReward?: number;
}) {
  const now = new Date().toISOString();
  // Use first assignee as primary assigneeId for backward compatibility
  const primaryAssignee = data.assigneeIds && data.assigneeIds.length > 0
    ? data.assigneeIds[0]
    : data.assigneeId ?? null;
  const result = await db.insert(tasks).values({
    title: data.title,
    description: data.description ?? null,
    priority: data.priority,
    status: "pending",
    assigneeId: primaryAssignee,
    createdById: data.createdById,
    dueDate: data.dueDate ?? null,
    startTime: data.startTime ?? null,
    endTime: data.endTime ?? null,
    companyId: data.companyId ?? null,
    pointsAwarded: data.pointsReward ?? 0,
    createdAt: now,
    updatedAt: now,
  }).returning({ id: tasks.id });
  const taskId = result[0].id;
  // Insert all assignees into task_assignees table
  const allAssigneeIds = data.assigneeIds && data.assigneeIds.length > 0
    ? data.assigneeIds
    : data.assigneeId ? [data.assigneeId] : [];
  for (const uid of allAssigneeIds) {
    await db.insert(taskAssignees).values({ taskId, userId: uid, createdAt: now });
  }
  return { id: taskId };
}

export async function getTaskById(db: DrizzleD1Database, id: number) {
  const result = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function listTasks(db: DrizzleD1Database, filters?: {
  status?: string;
  priority?: string;
  assigneeId?: number;
  companyId?: number;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const conditions = [];
  if (filters?.status === "overdue") {
    // Special filter for overdue tasks
    conditions.push(sql`${tasks.status} NOT IN ('completed', 'review')`);
    conditions.push(sql`${tasks.dueDate} IS NOT NULL`);
    conditions.push(sql`${tasks.dueDate} < ${Date.now()}`);
  } else if (filters?.status && filters.status !== "all") {
    conditions.push(eq(tasks.status, filters.status as Task["status"]));
  }
  if (filters?.priority && filters.priority !== "all") {
    conditions.push(eq(tasks.priority, filters.priority as Task["priority"]));
  }
  if (filters?.assigneeId) {
    // Check both the legacy assigneeId column AND the task_assignees table
    conditions.push(
      or(
        eq(tasks.assigneeId, filters.assigneeId),
        sql`${tasks.id} IN (SELECT "taskId" FROM task_assignees WHERE "userId" = ${filters.assigneeId})`
      )
    );
  }
  if (filters?.companyId) {
    conditions.push(eq(tasks.companyId as any, filters.companyId));
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
    db.select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      priority: tasks.priority,
      assigneeId: tasks.assigneeId,
      companyId: tasks.companyId,
      dueDate: tasks.dueDate,
      startTime: tasks.startTime,
      endTime: tasks.endTime,
      pointsAwarded: tasks.pointsAwarded,
      sortOrder: tasks.sortOrder,
      completedAt: tasks.completedAt,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
      assigneeName: sql<string>`(SELECT name FROM users WHERE users.id = tasks.assigneeId)`,
      assigneeAvatarUrl: sql<string>`(SELECT avatarUrl FROM users WHERE users.id = tasks.assigneeId)`,
      companyName: sql<string>`(SELECT name FROM companies WHERE companies.id = tasks.companyId)`,
    }).from(tasks)
      .where(where)
      .orderBy(
        sql`CASE ${tasks.priority} WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END ASC`,
        sql`CASE WHEN ${tasks.dueDate} IS NULL THEN 1 ELSE 0 END ASC`,
        asc(tasks.dueDate),
        desc(tasks.createdAt)
      )
      .limit(filters?.limit ?? 200)
      .offset(filters?.offset ?? 0),
    db.select({ count: sql<number>`count(*)` }).from(tasks).where(where),
  ]);

  return { tasks: taskList, total: countResult[0]?.count ?? 0 };
}

export async function updateTask(db: DrizzleD1Database, id: number, data: Partial<{
  title: string;
  description: string;
  status: "pending" | "in_progress" | "review" | "completed";
  priority: "low" | "medium" | "high" | "urgent";
  assigneeId: number | null;
  dueDate: number | null;
  startTime: string | null;
  endTime: string | null;
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

// ============ TASK ASSIGNEES ============

export async function getTaskAssignees(db: DrizzleD1Database, taskId: number) {
  const result = await db.select({
    id: users.id,
    name: users.name,
    avatarUrl: users.avatarUrl,
  }).from(taskAssignees)
    .innerJoin(users, eq(taskAssignees.userId, users.id))
    .where(eq(taskAssignees.taskId, taskId));
  return result;
}

export async function setTaskAssignees(db: DrizzleD1Database, taskId: number, userIds: number[]) {
  // Remove existing assignees
  await db.delete(taskAssignees).where(eq(taskAssignees.taskId, taskId));
  // Insert new assignees
  const now = new Date().toISOString();
  for (const uid of userIds) {
    await db.insert(taskAssignees).values({ taskId, userId: uid, createdAt: now });
  }
  // Update primary assigneeId on task
  const primaryAssignee = userIds.length > 0 ? userIds[0] : null;
  await db.update(tasks).set({ assigneeId: primaryAssignee, updatedAt: now }).where(eq(tasks.id, taskId));
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

export async function revertPointsByTaskId(db: DrizzleD1Database, taskId: number) {
  // Find all points_log entries for this task
  const entries = await db.select().from(pointsLog)
    .where(eq(pointsLog.taskId, taskId));
  
  // Subtract points from each user's totalPoints
  for (const entry of entries) {
    await db.update(users).set({
      totalPoints: sql`MAX(0, ${users.totalPoints} - ${entry.points})`,
      updatedAt: new Date().toISOString(),
    }).where(eq(users.id, entry.userId));
  }
  
  // Delete the points_log entries for this task
  await db.delete(pointsLog).where(eq(pointsLog.taskId, taskId));
  
  return entries;
}

// ============ RANKING ============

export async function getRanking(db: DrizzleD1Database) {
  const result = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
    totalPoints: users.totalPoints,
    avatarUrl: users.avatarUrl,
    completedTasks: sql<number>`(SELECT COUNT(DISTINCT tasks.id) FROM tasks LEFT JOIN task_assignees ta ON ta.taskId = tasks.id WHERE (tasks.assigneeId = users.id OR ta.userId = users.id) AND tasks.status = 'completed')`,
    onTimeTasks: sql<number>`(SELECT COUNT(DISTINCT tasks.id) FROM tasks LEFT JOIN task_assignees ta ON ta.taskId = tasks.id WHERE (tasks.assigneeId = users.id OR ta.userId = users.id) AND tasks.status = 'completed' AND (tasks.dueDate IS NULL OR tasks.completedAt <= tasks.dueDate))`,
    totalAssigned: sql<number>`(SELECT COUNT(DISTINCT tasks.id) FROM tasks LEFT JOIN task_assignees ta ON ta.taskId = tasks.id WHERE (tasks.assigneeId = users.id OR ta.userId = users.id))`,
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

  const [reviewResult] = await db.select({ count: sql<number>`count(*)` })
    .from(tasks).where(baseCondition ? and(baseCondition, eq(tasks.status, "review" as any)) : eq(tasks.status, "review" as any));

  const [overdueResult] = await db.select({ count: sql<number>`count(*)` })
    .from(tasks).where(
      baseCondition
        ? and(baseCondition, sql`${tasks.status} NOT IN ('completed', 'review')`, sql`${tasks.dueDate} IS NOT NULL`, sql`${tasks.dueDate} < ${now}`)
        : and(sql`${tasks.status} NOT IN ('completed', 'review')`, sql`${tasks.dueDate} IS NOT NULL`, sql`${tasks.dueDate} < ${now}`)
    );

  const total = totalResult?.count ?? 0;
  const completed = completedResult?.count ?? 0;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    total,
    pending: pendingResult?.count ?? 0,
    inProgress: inProgressResult?.count ?? 0,
    review: reviewResult?.count ?? 0,
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
    avatarUrl: users.avatarUrl,
    createdAt: users.createdAt,
    pendingTasks: sql<number>`(SELECT COUNT(*) FROM tasks WHERE tasks.assigneeId = users.id AND tasks.status = 'pending')`,
    inProgressTasks: sql<number>`(SELECT COUNT(*) FROM tasks WHERE tasks.assigneeId = users.id AND tasks.status = 'in_progress')`,
    completedTasks: sql<number>`(SELECT COUNT(*) FROM tasks WHERE tasks.assigneeId = users.id AND tasks.status = 'completed')`,
    totalTasks: sql<number>`(SELECT COUNT(*) FROM tasks WHERE tasks.assigneeId = users.id)`,
    reviewTasks: sql<number>`(SELECT COUNT(*) FROM tasks WHERE tasks.assigneeId = users.id AND tasks.status = 'review')`,
    overdueTasks: sql<number>`(SELECT COUNT(*) FROM tasks WHERE tasks.assigneeId = users.id AND tasks.status NOT IN ('completed', 'review') AND tasks.dueDate IS NOT NULL AND tasks.dueDate < ${Date.now()})`,
  }).from(users).orderBy(desc(users.totalPoints));

  return result;
}

export async function getCollaboratorsWithStatsByCompany(db: DrizzleD1Database, companyId: number) {
  // Retorna todos os colaboradores, mas com stats filtradas por empresa
  const result = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    phone: users.phone,
    role: users.role,
    totalPoints: users.totalPoints,
    avatarUrl: users.avatarUrl,
    createdAt: users.createdAt,
    pendingTasks: sql<number>`(SELECT COUNT(DISTINCT tasks.id) FROM tasks LEFT JOIN task_assignees ta ON ta.taskId = tasks.id WHERE (tasks.assigneeId = users.id OR ta.userId = users.id) AND tasks.companyId = ${companyId} AND tasks.status = 'pending')`,
    inProgressTasks: sql<number>`(SELECT COUNT(DISTINCT tasks.id) FROM tasks LEFT JOIN task_assignees ta ON ta.taskId = tasks.id WHERE (tasks.assigneeId = users.id OR ta.userId = users.id) AND tasks.companyId = ${companyId} AND tasks.status = 'in_progress')`,
    completedTasks: sql<number>`(SELECT COUNT(DISTINCT tasks.id) FROM tasks LEFT JOIN task_assignees ta ON ta.taskId = tasks.id WHERE (tasks.assigneeId = users.id OR ta.userId = users.id) AND tasks.companyId = ${companyId} AND tasks.status = 'completed')`,
    totalTasks: sql<number>`(SELECT COUNT(DISTINCT tasks.id) FROM tasks LEFT JOIN task_assignees ta ON ta.taskId = tasks.id WHERE (tasks.assigneeId = users.id OR ta.userId = users.id) AND tasks.companyId = ${companyId})`,
    overdueTasks: sql<number>`(SELECT COUNT(DISTINCT tasks.id) FROM tasks LEFT JOIN task_assignees ta ON ta.taskId = tasks.id WHERE (tasks.assigneeId = users.id OR ta.userId = users.id) AND tasks.companyId = ${companyId} AND tasks.status != 'completed' AND tasks.dueDate IS NOT NULL AND tasks.dueDate < ${Date.now()})`,
  }).from(users).orderBy(desc(users.totalPoints));

  return result;
}

// ============ CHAT ============

export async function sendChatMessage(db: DrizzleD1Database, userId: number, content: string, companyId?: number) {
  const result = await db.insert(chatMessages).values({ userId, content, companyId: companyId ?? null }).returning({ id: chatMessages.id });
  return { id: result[0].id };
}

export async function getChatMessages(db: DrizzleD1Database, limit: number = 100, beforeId?: number, companyId?: number) {
  const conditions: any[] = [];
  if (beforeId) conditions.push(sql`${chatMessages.id} < ${beforeId}`);
  if (companyId !== undefined) {
    if (companyId === 0) {
      // General chat (no company)
      conditions.push(sql`${chatMessages.companyId} IS NULL`);
    } else {
      conditions.push(eq(chatMessages.companyId, companyId));
    }
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  return db.select({
    id: chatMessages.id,
    userId: chatMessages.userId,
    companyId: chatMessages.companyId,
    content: chatMessages.content,
    createdAt: chatMessages.createdAt,
    userName: users.name,
    userRole: users.role,
    userAvatarUrl: users.avatarUrl,
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

// ============ COMPANIES ============

export async function getAllCompanies(db: DrizzleD1Database) {
  return db.select().from(companies).orderBy(asc(companies.name));
}

export async function getCompanyById(db: DrizzleD1Database, id: number) {
  const result = await db.select().from(companies).where(eq(companies.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createCompany(db: DrizzleD1Database, data: {
  name: string;
  description?: string;
  color?: string;
}) {
  const now = new Date().toISOString();
  const result = await db.insert(companies).values({
    name: data.name,
    description: data.description ?? null,
    color: data.color ?? "#6366f1",
    createdAt: now,
    updatedAt: now,
  }).returning({ id: companies.id });
  return { id: result[0].id };
}

export async function updateCompany(db: DrizzleD1Database, id: number, data: Partial<{
  name: string;
  description: string | null;
  color: string;
}>) {
  await db.update(companies).set({ ...data, updatedAt: new Date().toISOString() }).where(eq(companies.id, id));
}

export async function deleteCompany(db: DrizzleD1Database, id: number) {
  // Set tasks companyId to null before deleting
  await db.update(tasks).set({ companyId: null } as any).where(eq(tasks.companyId as any, id));
  await db.delete(companies).where(eq(companies.id, id));
}

export async function getCompaniesWithStats(db: DrizzleD1Database) {
  const result = await db.select({
    id: companies.id,
    name: companies.name,
    description: companies.description,
    color: companies.color,
    createdAt: companies.createdAt,
    totalTasks: sql<number>`(SELECT COUNT(*) FROM tasks WHERE tasks.companyId = companies.id)`,
    pendingTasks: sql<number>`(SELECT COUNT(*) FROM tasks WHERE tasks.companyId = companies.id AND tasks.status = 'pending')`,
    inProgressTasks: sql<number>`(SELECT COUNT(*) FROM tasks WHERE tasks.companyId = companies.id AND tasks.status = 'in_progress')`,
    completedTasks: sql<number>`(SELECT COUNT(*) FROM tasks WHERE tasks.companyId = companies.id AND tasks.status = 'completed')`,
    reviewTasks: sql<number>`(SELECT COUNT(*) FROM tasks WHERE tasks.companyId = companies.id AND tasks.status = 'review')`,
    overdueTasks: sql<number>`(SELECT COUNT(*) FROM tasks WHERE tasks.companyId = companies.id AND tasks.status NOT IN ('completed', 'review') AND tasks.dueDate IS NOT NULL AND tasks.dueDate < ${Date.now()})`,
    collaboratorCount: sql<number>`(SELECT COUNT(*) FROM company_members WHERE company_members.companyId = companies.id)`,
  }).from(companies).orderBy(asc(companies.name));
  return result;
}

// ============ COMPANY MEMBERS ============

export async function getCompanyMembers(db: DrizzleD1Database, companyId: number) {
  return db.select({
    id: companyMembers.id,
    companyId: companyMembers.companyId,
    userId: companyMembers.userId,
    createdAt: companyMembers.createdAt,
    userName: users.name,
    userEmail: users.email,
    userPhone: users.phone,
    userRole: users.role,
    userTotalPoints: users.totalPoints,
  }).from(companyMembers)
    .leftJoin(users, eq(companyMembers.userId, users.id))
    .where(eq(companyMembers.companyId, companyId))
    .orderBy(asc(users.name));
}

export async function addCompanyMember(db: DrizzleD1Database, companyId: number, userId: number) {
  // Verificar se já existe
  const existing = await db.select().from(companyMembers)
    .where(and(eq(companyMembers.companyId, companyId), eq(companyMembers.userId, userId)))
    .limit(1);
  if (existing.length > 0) return existing[0];
  
  const result = await db.insert(companyMembers).values({ companyId, userId }).returning();
  return result[0];
}

export async function removeCompanyMember(db: DrizzleD1Database, companyId: number, userId: number) {
  await db.delete(companyMembers)
    .where(and(eq(companyMembers.companyId, companyId), eq(companyMembers.userId, userId)));
}

export async function getCompanyMemberIds(db: DrizzleD1Database, companyId: number): Promise<number[]> {
  const members = await db.select({ userId: companyMembers.userId })
    .from(companyMembers)
    .where(eq(companyMembers.companyId, companyId));
  return members.map(m => m.userId);
}

// ============ NOTIFICATIONS ============

export async function createNotification(db: DrizzleD1Database, data: {
  userId: number;
  type: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: number;
}) {
  const result = await db.insert(notifications).values({
    userId: data.userId,
    type: data.type,
    title: data.title,
    message: data.message,
    entityType: data.entityType ?? null,
    entityId: data.entityId ?? null,
  }).returning({ id: notifications.id });
  return { id: result[0].id };
}

export async function getNotifications(db: DrizzleD1Database, userId: number, limit: number = 50) {
  const notifs = await db.select().from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);

  // For task notifications, fetch the assigneeId so frontend can navigate to the right Kanban
  const enriched = await Promise.all(notifs.map(async (n) => {
    if (n.entityType === "task" && n.entityId) {
      const [task] = await db.select({ assigneeId: tasks.assigneeId }).from(tasks).where(eq(tasks.id, n.entityId)).limit(1);
      return { ...n, taskAssigneeId: task?.assigneeId ?? null };
    }
    return { ...n, taskAssigneeId: null };
  }));

  return enriched;
}

export async function getUnreadNotificationCount(db: DrizzleD1Database, userId: number) {
  const [result] = await db.select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, 0)));
  return result?.count ?? 0;
}

export async function getManualPointsLog(db: DrizzleD1Database, limit: number = 100) {
  // Get all manual points (taskId is null) with user info
  const logs = await db.select({
    id: pointsLog.id,
    userId: pointsLog.userId,
    points: pointsLog.points,
    reason: pointsLog.reason,
    createdAt: pointsLog.createdAt,
    userName: users.name,
    userAvatarUrl: users.avatarUrl,
  })
    .from(pointsLog)
    .leftJoin(users, eq(pointsLog.userId, users.id))
    .where(sql`${pointsLog.taskId} IS NULL`)
    .orderBy(desc(pointsLog.createdAt))
    .limit(limit);
  return logs;
}

export async function markNotificationRead(db: DrizzleD1Database, id: number) {
  await db.update(notifications).set({ isRead: 1 }).where(eq(notifications.id, id));
}

export async function markAllNotificationsRead(db: DrizzleD1Database, userId: number) {
  await db.update(notifications).set({ isRead: 1 }).where(eq(notifications.userId, userId));
}

// Atualizar getCollaboratorsWithStatsByCompany para mostrar apenas membros vinculados
export async function getCompanyCollaboratorsWithStats(db: DrizzleD1Database, companyId: number) {
  const result = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    phone: users.phone,
    role: users.role,
    totalPoints: users.totalPoints,
    avatarUrl: users.avatarUrl,
    createdAt: users.createdAt,
    pendingTasks: sql<number>`(SELECT COUNT(DISTINCT tasks.id) FROM tasks LEFT JOIN task_assignees ta ON ta.taskId = tasks.id WHERE (tasks.assigneeId = users.id OR ta.userId = users.id) AND tasks.companyId = ${companyId} AND tasks.status = 'pending')`,
    inProgressTasks: sql<number>`(SELECT COUNT(DISTINCT tasks.id) FROM tasks LEFT JOIN task_assignees ta ON ta.taskId = tasks.id WHERE (tasks.assigneeId = users.id OR ta.userId = users.id) AND tasks.companyId = ${companyId} AND tasks.status = 'in_progress')`,
    completedTasks: sql<number>`(SELECT COUNT(DISTINCT tasks.id) FROM tasks LEFT JOIN task_assignees ta ON ta.taskId = tasks.id WHERE (tasks.assigneeId = users.id OR ta.userId = users.id) AND tasks.companyId = ${companyId} AND tasks.status = 'completed')`,
    totalTasks: sql<number>`(SELECT COUNT(DISTINCT tasks.id) FROM tasks LEFT JOIN task_assignees ta ON ta.taskId = tasks.id WHERE (tasks.assigneeId = users.id OR ta.userId = users.id) AND tasks.companyId = ${companyId})`,
  }).from(users)
    .innerJoin(companyMembers, and(eq(companyMembers.userId, users.id), eq(companyMembers.companyId, companyId)))
    .orderBy(desc(users.totalPoints));

  return result;
}

// ===== POINTS AUDIT SYSTEM =====
export async function logPointsAudit(db: DrizzleD1Database, data: {
  taskId: number;
  taskTitle: string;
  oldPoints: number;
  newPoints: number;
  changedBy: number;
  changedByName: string | null;
  action: string;
  reason: string;
  statusBefore?: string | null;
  statusAfter?: string | null;
}) {
  await db.insert(pointsAudit).values({
    taskId: data.taskId,
    taskTitle: data.taskTitle,
    oldPoints: data.oldPoints,
    newPoints: data.newPoints,
    changedBy: data.changedBy,
    changedByName: data.changedByName,
    action: data.action,
    reason: data.reason,
    statusBefore: data.statusBefore || null,
    statusAfter: data.statusAfter || null,
    createdAt: new Date().toISOString(),
  });
}

export async function getPointsAuditLog(db: DrizzleD1Database, limit: number = 200) {
  return db.select().from(pointsAudit).orderBy(desc(pointsAudit.createdAt)).limit(limit);
}

export async function getPointsAuditByTask(db: DrizzleD1Database, taskId: number) {
  return db.select().from(pointsAudit).where(eq(pointsAudit.taskId, taskId)).orderBy(desc(pointsAudit.createdAt));
}

// ===== CAIXA DE IDEIAS =====
export async function listIdeas(db: DrizzleD1Database) {
  const result = await db.select({
    id: ideas.id,
    title: ideas.title,
    description: ideas.description,
    status: ideas.status,
    authorId: ideas.authorId,
    pointsAwarded: ideas.pointsAwarded,
    approvedById: ideas.approvedById,
    rejectionReason: ideas.rejectionReason,
    createdAt: ideas.createdAt,
    updatedAt: ideas.updatedAt,
    authorName: users.name,
    authorEmail: users.email,
    authorAvatarUrl: users.avatarUrl,
  }).from(ideas)
    .leftJoin(users, eq(ideas.authorId, users.id))
    .orderBy(desc(ideas.createdAt));
  return result;
}

export async function getIdeaById(db: DrizzleD1Database, id: number) {
  const result = await db.select({
    id: ideas.id,
    title: ideas.title,
    description: ideas.description,
    status: ideas.status,
    authorId: ideas.authorId,
    pointsAwarded: ideas.pointsAwarded,
    approvedById: ideas.approvedById,
    rejectionReason: ideas.rejectionReason,
    createdAt: ideas.createdAt,
    updatedAt: ideas.updatedAt,
    authorName: users.name,
    authorEmail: users.email,
    authorAvatarUrl: users.avatarUrl,
  }).from(ideas)
    .leftJoin(users, eq(ideas.authorId, users.id))
    .where(eq(ideas.id, id))
    .limit(1);
  return result[0] || null;
}

export async function createIdea(db: DrizzleD1Database, data: { title: string; description?: string; authorId: number }) {
  const now = new Date().toISOString();
  const result = await db.insert(ideas).values({
    title: data.title,
    description: data.description || null,
    authorId: data.authorId,
    status: "new",
    createdAt: now,
    updatedAt: now,
  }).returning();
  return result[0];
}

export async function updateIdeaStatus(db: DrizzleD1Database, id: number, data: {
  status: string;
  approvedById?: number;
  pointsAwarded?: number;
  rejectionReason?: string;
}) {
  const now = new Date().toISOString();
  const updateData: any = {
    status: data.status,
    updatedAt: now,
  };
  if (data.approvedById !== undefined) updateData.approvedById = data.approvedById;
  if (data.pointsAwarded !== undefined) updateData.pointsAwarded = data.pointsAwarded;
  if (data.rejectionReason !== undefined) updateData.rejectionReason = data.rejectionReason;

  await db.update(ideas).set(updateData).where(eq(ideas.id, id));
  return getIdeaById(db, id);
}

export async function deleteIdea(db: DrizzleD1Database, id: number) {
  await db.delete(ideas).where(eq(ideas.id, id));
}

// ===== COLABORADOR DESTAQUE =====
export async function addHighlightPoints(db: DrizzleD1Database, data: {
  userId: number;
  points: number;
  reason: string;
  awardedById: number;
}) {
  const now = new Date().toISOString();
  const result = await db.insert(highlightPoints).values({
    userId: data.userId,
    points: data.points,
    reason: data.reason,
    awardedById: data.awardedById,
    createdAt: now,
  }).returning();

  // Highlight points are separate from ranking points (totalPoints)
  // They are stored only in highlight_points table

  return result[0];
}

export async function getHighlightPointsLog(db: DrizzleD1Database, limit: number = 100) {
  const result = await db.select({
    id: highlightPoints.id,
    userId: highlightPoints.userId,
    points: highlightPoints.points,
    reason: highlightPoints.reason,
    awardedById: highlightPoints.awardedById,
    createdAt: highlightPoints.createdAt,
    userName: users.name,
    userEmail: users.email,
    userAvatarUrl: users.avatarUrl,
  }).from(highlightPoints)
    .leftJoin(users, eq(highlightPoints.userId, users.id))
    .orderBy(desc(highlightPoints.createdAt))
    .limit(limit);
  return result;
}

export async function getHighlightPointsByUser(db: DrizzleD1Database, userId: number) {
  const result = await db.select({
    id: highlightPoints.id,
    points: highlightPoints.points,
    reason: highlightPoints.reason,
    createdAt: highlightPoints.createdAt,
  }).from(highlightPoints)
    .where(eq(highlightPoints.userId, userId))
    .orderBy(desc(highlightPoints.createdAt));
  return result;
}
