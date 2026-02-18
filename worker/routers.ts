import { eq } from "drizzle-orm";
import { users } from "../drizzle/schema-d1";
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
  getChecklistByTaskId, createChecklistItem, createChecklistItems,
  updateChecklistItem, deleteChecklistItem, deleteChecklistByTaskId,
  getAttachmentsByTaskId, getAttachmentById, createAttachment,
  deleteAttachment, deleteAttachmentsByTaskId,
  getAllCompanies, getCompanyById, createCompany, updateCompany, deleteCompany, getCompaniesWithStats,
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
        phone: z.string().max(20).optional(),
        role: z.enum(["user", "admin"]).default("user"),
      }))
      .mutation(async ({ ctx, input }) => {
        
        
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
          phone: input.phone ?? null,
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
        companyId: z.number().optional(),
        checklistItems: z.array(z.object({
          title: z.string().min(1).max(500),
        })).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { checklistItems: items, ...taskData } = input;
        const result = await createTask(ctx.db, {
          ...taskData,
          createdById: ctx.user.id,
        });
        // Create checklist items if provided
        if (items && items.length > 0) {
          await createChecklistItems(ctx.db, result.id, items.map((item, index) => ({
            title: item.title,
            sortOrder: index,
          })));
        }
        await logActivity(ctx.db, {
          userId: ctx.user.id,
          action: "created",
          entityType: "task",
          entityId: result.id,
          details: `Criou a tarefa "${input.title}"${items && items.length > 0 ? ` com ${items.length} itens de checklist` : ""}`,
        });
        return result;
      }),

    list: protectedProcedure
      .input(z.object({
        status: z.string().optional(),
        priority: z.string().optional(),
        assigneeId: z.number().optional(),
        companyId: z.number().optional(),
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

    // ===== CHECKLIST =====
    checklist: protectedProcedure
      .input(z.object({ taskId: z.number() }))
      .query(async ({ ctx, input }) => {
        return getChecklistByTaskId(ctx.db, input.taskId);
      }),

    addChecklistItem: protectedProcedure
      .input(z.object({
        taskId: z.number(),
        title: z.string().min(1).max(500),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await createChecklistItem(ctx.db, {
          taskId: input.taskId,
          title: input.title,
        });
        await logActivity(ctx.db, {
          userId: ctx.user.id,
          action: "checklist_added",
          entityType: "task",
          entityId: input.taskId,
          details: `Adicionou item ao checklist: "${input.title}"`,
        });
        return result;
      }),

    updateChecklistItem: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).max(500).optional(),
        isCompleted: z.number().min(0).max(1).optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await updateChecklistItem(ctx.db, id, data);
        return { success: true };
      }),

    deleteChecklistItem: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteChecklistItem(ctx.db, input.id);
        return { success: true };
      }),

    // ===== ATTACHMENTS =====
    attachments: protectedProcedure
      .input(z.object({ taskId: z.number() }))
      .query(async ({ ctx, input }) => {
        return getAttachmentsByTaskId(ctx.db, input.taskId);
      }),

    addAttachment: protectedProcedure
      .input(z.object({
        taskId: z.number(),
        fileName: z.string().min(1).max(255),
        fileSize: z.number(),
        fileType: z.string(),
        fileData: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await createAttachment(ctx.db, {
          ...input,
          uploadedById: ctx.user.id,
        });
        await logActivity(ctx.db, {
          userId: ctx.user.id,
          action: "attachment_added",
          entityType: "task",
          entityId: input.taskId,
          details: `Anexou arquivo: "${input.fileName}"`,
        });
        return result;
      }),

    getAttachment: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        return getAttachmentById(ctx.db, input.id);
      }),

    deleteAttachment: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const attachment = await getAttachmentById(ctx.db, input.id);
        await deleteAttachment(ctx.db, input.id);
        if (attachment) {
          await logActivity(ctx.db, {
            userId: ctx.user.id,
            action: "attachment_deleted",
            entityType: "task",
            entityId: attachment.taskId,
            details: `Removeu anexo: "${attachment.fileName}"`,
          });
        }
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
    adjustPoints: adminProcedure
      .input(z.object({
        userId: z.number(),
        points: z.number(),
        reason: z.string().min(1).max(255),
      }))
      .mutation(async ({ ctx, input }) => {
        await addPoints(ctx.db, input.userId, input.points, input.reason);
        await logActivity(ctx.db, {
          userId: ctx.user.id,
          action: input.points > 0 ? "awarded_points" : "deducted_points",
          entityType: "user",
          entityId: input.userId,
          details: `${input.points > 0 ? "Concedeu" : "Removeu"} ${Math.abs(input.points)} pontos: ${input.reason}`,
        });
        const newBadges = await checkAndAwardBadges(ctx.db, input.userId);
        return { success: true, newBadges: newBadges.map(b => b.name) };
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

  companies: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getAllCompanies(ctx.db);
    }),
    listWithStats: protectedProcedure.query(async ({ ctx }) => {
      return getCompaniesWithStats(ctx.db);
    }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        return getCompanyById(ctx.db, input.id);
      }),
    create: adminProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        description: z.string().max(1000).optional(),
        color: z.string().max(20).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await createCompany(ctx.db, input);
        await logActivity(ctx.db, {
          userId: ctx.user.id,
          action: "created",
          entityType: "company",
          entityId: result.id,
          details: `Criou a empresa "${input.name}"`,
        });
        return result;
      }),
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().max(1000).optional().nullable(),
        color: z.string().max(20).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await updateCompany(ctx.db, id, data as any);
        await logActivity(ctx.db, {
          userId: ctx.user.id,
          action: "updated",
          entityType: "company",
          entityId: id,
          details: `Atualizou a empresa #${id}`,
        });
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteCompany(ctx.db, input.id);
        await logActivity(ctx.db, {
          userId: ctx.user.id,
          action: "deleted",
          entityType: "company",
          entityId: input.id,
          details: `Excluiu a empresa #${input.id}`,
        });
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
