import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure, adminProcedure } from "./_core/trpc";
import { z } from "zod";
import {
  createTask, getTaskById, listTasks, updateTask, deleteTask,
  getAllUsers, addPoints, getUserPoints, getRanking,
  getAllBadges, getUserBadges, checkAndAwardBadges, seedBadges,
  logActivity, getActivityLog, getDashboardStats, getRecentCompletions,
  getUserById, createComment, getCommentsByTaskId, deleteComment,
  getTaskActivities,
} from "./db";

// Seed badges on startup
seedBadges().catch(console.error);

// Points calculation
function calculatePoints(priority: string, onTime: boolean): number {
  const basePoints: Record<string, number> = {
    low: 5,
    medium: 10,
    high: 20,
    urgent: 30,
  };
  const base = basePoints[priority] ?? 10;
  return onTime ? base + 5 : base;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  users: router({
    list: protectedProcedure.query(async () => {
      return getAllUsers();
    }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getUserById(input.id);
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
        const result = await createTask({
          ...input,
          createdById: ctx.user.id,
        });
        await logActivity({
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
      .query(async ({ input }) => {
        return listTasks(input);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getTaskById(input.id);
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
        // Only admin can edit task details (title, description, priority, assignee, dueDate)
        if (ctx.user.role !== "admin") {
          throw new Error("Apenas administradores podem editar tarefas");
        }
        await updateTask(id, data);
        await logActivity({
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
        const task = await getTaskById(input.id);
        if (!task) throw new Error("Tarefa não encontrada");

        // Only assignee or admin can update status
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
            await addPoints(task.assigneeId, points, `Completou tarefa "${task.title}"`, task.id);
            const newBadges = await checkAndAwardBadges(task.assigneeId);
            if (newBadges.length > 0) {
              for (const badge of newBadges) {
                await logActivity({
                  userId: task.assigneeId,
                  action: "earned_badge",
                  entityType: "badge",
                  entityId: badge.id,
                  details: `Conquistou o badge "${badge.name}"`,
                });
              }
            }
          }
        }

        if (input.status !== "completed") {
          updateData.completedAt = null;
          updateData.pointsAwarded = 0;
        }

        await updateTask(input.id, updateData as any);

        const statusLabels: Record<string, string> = {
          pending: "Pendente",
          in_progress: "Em Andamento",
          completed: "Concluída",
        };

        await logActivity({
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
        await deleteTask(input.id);
        await logActivity({
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
      .query(async ({ input }) => {
        return getCommentsByTaskId(input.taskId);
      }),

    addComment: protectedProcedure
      .input(z.object({
        taskId: z.number(),
        content: z.string().min(1).max(2000),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await createComment({
          taskId: input.taskId,
          userId: ctx.user.id,
          content: input.content,
        });
        await logActivity({
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
        await deleteComment(input.id);
        return { success: true };
      }),

    activities: protectedProcedure
      .input(z.object({ taskId: z.number() }))
      .query(async ({ input }) => {
        return getTaskActivities(input.taskId);
      }),
  }),

  gamification: router({
    ranking: protectedProcedure.query(async () => {
      return getRanking();
    }),

    badges: protectedProcedure.query(async () => {
      return getAllBadges();
    }),

    userBadges: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        return getUserBadges(input.userId);
      }),

    myBadges: protectedProcedure.query(async ({ ctx }) => {
      return getUserBadges(ctx.user.id);
    }),

    userPoints: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        return getUserPoints(input.userId);
      }),

    myPoints: protectedProcedure.query(async ({ ctx }) => {
      return getUserPoints(ctx.user.id);
    }),
  }),

  dashboard: router({
    stats: protectedProcedure
      .input(z.object({ userId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return getDashboardStats(input?.userId);
      }),

    recentCompletions: protectedProcedure
      .input(z.object({ days: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return getRecentCompletions(input?.days ?? 30);
      }),
  }),

  activity: router({
    list: protectedProcedure
      .input(z.object({
        userId: z.number().optional(),
        limit: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        return getActivityLog(input);
      }),
  }),
});

export type AppRouter = typeof appRouter;
