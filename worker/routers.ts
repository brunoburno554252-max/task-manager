import { publicProcedure, router, protectedProcedure, adminProcedure } from "./trpc";
import { z } from "zod";
import {
  createTask, getTaskById, listTasks, updateTask, deleteTask, reorderTasks,
  getAllUsers, addPoints, getUserPoints, getRanking,
  getAllBadges, getUserBadges, checkAndAwardBadges, seedBadges,
  logActivity, getActivityLog, getDashboardStats, getRecentCompletions,
  getUserById, createComment, getCommentsByTaskId, deleteComment,
  getTaskActivities, getCollaboratorsWithStats,
  sendChatMessage, getChatMessages, updateUser,
} from "./db";

function calculatePoints(priority: string, onTime: boolean): number {
  const basePoints: Record<string, number> = {
    low: 5, medium: 10, high: 20, urgent: 30,
  };
  const base = basePoints[priority] ?? 10;
  return onTime ? base + 5 : base;
}

export const appRouter = router({
  auth: router({
    me: publicProcedure.query(({ ctx }) => ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.resHeaders.set("Set-Cookie", "session=; Path=/; Max-Age=-1; HttpOnly; SameSite=Lax");
      return { success: true } as const;
    }),
  }),

  users: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getAllUsers(ctx.db);
    }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        return getUserById(ctx.db, input.id);
      }),
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        email: z.string().email().max(320).optional(),
        phone: z.string().max(20).optional().nullable(),
        role: z.enum(["user", "admin"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await updateUser(ctx.db, id, data as any);
        await logActivity(ctx.db, {
          userId: ctx.user.id,
          action: "updated",
          entityType: "user",
          entityId: id,
          details: `Atualizou dados do colaborador #${id}`,
        });
        return { success: true };
      }),
    updateProfile: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255).optional(),
        phone: z.string().max(20).optional().nullable(),
      }))
      .mutation(async ({ ctx, input }) => {
        await updateUser(ctx.db, ctx.user.id, input as any);
        return { success: true };
      }),
    create: adminProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        email: z.string().email().max(320),
        password: z.string().min(6),
        role: z.enum(["user", "admin"]).default("user"),
      }))
      .mutation(async ({ ctx, input }) => {
        const { eq } = await import("drizzle-orm");
        const { users } = await import("../drizzle/schema-d1");
        // Check if email exists
        const existing = await ctx.db.select().from(users).where(eq(users.email, input.email)).limit(1);
        if (existing.length > 0) {
          throw new Error("Este email já está cadastrado");
        }
        // Hash password
        const encoder = new TextEncoder();
        const data = encoder.encode(input.password);
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const passwordHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
        const now = new Date().toISOString();
        const openId = `user-${crypto.randomUUID()}`;
        const result = await ctx.db.insert(users).values({
          openId,
          name: input.name,
          email: input.email,
          role: input.role,
          passwordHash,
          totalPoints: 0,
          createdAt: now,
          updatedAt: now,
          lastSignedIn: now,
        }).returning({ id: users.id });
        await logActivity(ctx.db, {
          userId: ctx.user.id,
          action: "created",
          entityType: "user",
          entityId: result[0].id,
          details: `Cadastrou o colaborador "${input.name}"`,
        });
        return { success: true, userId: result[0].id };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (input.id === ctx.user.id) throw new Error("Não pode excluir a si mesmo");
        const { eq } = await import("drizzle-orm");
        const { users } = await import("../drizzle/schema-d1");
        await ctx.db.delete(users).where(eq(users.id, input.id));
        await logActivity(ctx.db, {
          userId: ctx.user.id,
          action: "deleted",
          entityType: "user",
          entityId: input.id,
          details: `Removeu o colaborador #${input.id}`,
        });
        return { success: true };
      }),
  }),

  tasks: router({
    create: adminProcedure
      .input(z.object({
        title: z.string().min(1).max(255),
        description: z.string().optional(),
        priority: z.enum(["low", "medium", "high", "urgent"]),
        assigneeId: z.number().optional(),
        dueDate: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await createTask(ctx.db, {
          ...input,
          createdById: ctx.user.id,
        });
        await logActivity(ctx.db, {
          userId: ctx.user.id,
          action: "created",
          entityType: "task",
          entityId: result.id,
          details: `Criou a tarefa "${input.title}"`,
        });
        return result;
      }),

    list: protectedProcedure
      .input(z.object({
        status: z.string().optional(),
        priority: z.string().optional(),
        assigneeId: z.number().optional(),
        search: z.string().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        return listTasks(ctx.db, input);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        return getTaskById(ctx.db, input.id);
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
        assigneeId: z.number().nullable().optional(),
        dueDate: z.number().nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        if (ctx.user.role !== "admin") {
          throw new Error("Apenas administradores podem editar tarefas");
        }
        await updateTask(ctx.db, id, data);
        await logActivity(ctx.db, {
          userId: ctx.user.id,
          action: "updated",
          entityType: "task",
          entityId: id,
          details: `Atualizou a tarefa #${id}`,
        });
        return { success: true };
      }),

    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["pending", "in_progress", "completed"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const task = await getTaskById(ctx.db, input.id);
        if (!task) throw new Error("Tarefa não encontrada");

        if (task.assigneeId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new Error("Sem permissão para alterar o status desta tarefa");
        }

        const updateData: Record<string, unknown> = { status: input.status };

        if (input.status === "completed" && task.status !== "completed") {
          const now = Date.now();
          updateData.completedAt = now;

          const onTime = !task.dueDate || now <= task.dueDate;
          const points = calculatePoints(task.priority, onTime);
          updateData.pointsAwarded = points;

          if (task.assigneeId) {
            await addPoints(ctx.db, task.assigneeId, points, `Completou tarefa "${task.title}"`, task.id);
            const newBadges = await checkAndAwardBadges(ctx.db, task.assigneeId);
            for (const badge of newBadges) {
              await logActivity(ctx.db, {
                userId: task.assigneeId,
                action: "earned_badge",
                entityType: "badge",
                entityId: badge.id,
                details: `Conquistou o badge "${badge.name}"`,
              });
            }
          }
        }

        if (input.status !== "completed") {
          updateData.completedAt = null;
          updateData.pointsAwarded = 0;
        }

        await updateTask(ctx.db, input.id, updateData as any);

        const statusLabels: Record<string, string> = {
          pending: "Pendente",
          in_progress: "Em Andamento",
          completed: "Concluída",
        };

        await logActivity(ctx.db, {
          userId: ctx.user.id,
          action: "status_changed",
          entityType: "task",
          entityId: input.id,
          details: `Alterou status para "${statusLabels[input.status]}"`,
        });

        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteTask(ctx.db, input.id);
        await logActivity(ctx.db, {
          userId: ctx.user.id,
          action: "deleted",
          entityType: "task",
          entityId: input.id,
          details: `Excluiu a tarefa #${input.id}`,
        });
        return { success: true };
      }),

    comments: protectedProcedure
      .input(z.object({ taskId: z.number() }))
      .query(async ({ ctx, input }) => {
        return getCommentsByTaskId(ctx.db, input.taskId);
      }),

    addComment: protectedProcedure
      .input(z.object({
        taskId: z.number(),
        content: z.string().min(1).max(2000),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await createComment(ctx.db, {
          taskId: input.taskId,
          userId: ctx.user.id,
          content: input.content,
        });
        await logActivity(ctx.db, {
          userId: ctx.user.id,
          action: "commented",
          entityType: "task",
          entityId: input.taskId,
          details: `Comentou na tarefa #${input.taskId}`,
        });
        return result;
      }),

    deleteComment: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteComment(ctx.db, input.id);
        return { success: true };
      }),

    activities: protectedProcedure
      .input(z.object({ taskId: z.number() }))
      .query(async ({ ctx, input }) => {
        return getTaskActivities(ctx.db, input.taskId);
      }),

    reorder: protectedProcedure
      .input(z.object({ orderedIds: z.array(z.number()) }))
      .mutation(async ({ ctx, input }) => {
        await reorderTasks(ctx.db, input.orderedIds);
        return { success: true };
      }),
  }),

  gamification: router({
    ranking: protectedProcedure.query(async ({ ctx }) => {
      return getRanking(ctx.db);
    }),
    badges: protectedProcedure.query(async ({ ctx }) => {
      return getAllBadges(ctx.db);
    }),
    userBadges: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ ctx, input }) => {
        return getUserBadges(ctx.db, input.userId);
      }),
    myBadges: protectedProcedure.query(async ({ ctx }) => {
      return getUserBadges(ctx.db, ctx.user.id);
    }),
    userPoints: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ ctx, input }) => {
        return getUserPoints(ctx.db, input.userId);
      }),
    myPoints: protectedProcedure.query(async ({ ctx }) => {
      return getUserPoints(ctx.db, ctx.user.id);
    }),
  }),

  dashboard: router({
    stats: protectedProcedure
      .input(z.object({ userId: z.number().optional() }).optional())
      .query(async ({ ctx, input }) => {
        return getDashboardStats(ctx.db, input?.userId);
      }),
    recentCompletions: protectedProcedure
      .input(z.object({ days: z.number().optional() }).optional())
      .query(async ({ ctx, input }) => {
        return getRecentCompletions(ctx.db, input?.days ?? 30);
      }),
  }),

  activity: router({
    list: protectedProcedure
      .input(z.object({
        userId: z.number().optional(),
        limit: z.number().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        return getActivityLog(ctx.db, input);
      }),
  }),

  collaborators: router({
    listWithStats: protectedProcedure.query(async ({ ctx }) => {
      return getCollaboratorsWithStats(ctx.db);
    }),
  }),

  chat: router({
    messages: protectedProcedure
      .input(z.object({
        limit: z.number().optional(),
        beforeId: z.number().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        return getChatMessages(ctx.db, input?.limit ?? 100, input?.beforeId);
      }),
    send: protectedProcedure
      .input(z.object({ content: z.string().min(1).max(5000) }))
      .mutation(async ({ ctx, input }) => {
        return sendChatMessage(ctx.db, ctx.user.id, input.content);
      }),
  }),
});

export type AppRouter = typeof appRouter;
