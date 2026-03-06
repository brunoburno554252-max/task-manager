import { eq } from "drizzle-orm";
import { users, tasks, pointsLog } from "../drizzle/schema-d1";
import { publicProcedure, router, protectedProcedure, adminProcedure } from "./trpc";
import { z } from "zod";
import {
  createTask, getTaskById, listTasks, updateTask, deleteTask, reorderTasks,
  getAllUsers, addPoints, getUserPoints, revertPointsByTaskId, getRanking,
  getAllBadges, getUserBadges, checkAndAwardBadges, seedBadges,
  logActivity, getActivityLog, getDashboardStats, getRecentCompletions,
  getUserById, createComment, getCommentsByTaskId, deleteComment,
  getTaskActivities,  getCollaboratorsWithStats, getCompanyCollaboratorsWithStats,  sendChatMessage, getChatMessages, updateUser,
  getChecklistByTaskId, createChecklistItem, createChecklistItems,
  updateChecklistItem, deleteChecklistItem, deleteChecklistByTaskId,
  getAttachmentsByTaskId, getAttachmentById, createAttachment,
  deleteAttachment, deleteAttachmentsByTaskId,
  getAllCompanies, getCompaniesWithStats, getCompanyById, createCompany, updateCompany, deleteCompany,
  getCompanyMembers, addCompanyMember, removeCompanyMember,
  getTaskAssignees, setTaskAssignees,
  createNotification, getNotifications, getUnreadNotificationCount, markNotificationRead, markAllNotificationsRead,
  getManualPointsLog,
  logPointsAudit, getPointsAuditLog, getPointsAuditByTask,
  listIdeas, getIdeaById, createIdea, updateIdeaStatus, deleteIdea,
  addHighlightPoints, getHighlightPointsLog, getHighlightPointsByUser,
  createTaskLog, getTaskLogs, getTaskLogsByCollaborator,
  logAccess, getAccessLogs, getAccessStats,
  generateProtocol, createComplaint, listComplaints, getComplaintById, getComplaintByProtocol,
  updateComplaint, createComplaintResponse, getComplaintResponses, getComplaintStats, deleteComplaint,
} from "./db";

function calculatePoints(priority: string, onTime: boolean): number {
  if (!onTime) return 0; // ATRASADA = 0 PONTOS
  const basePoints: Record<string, number> = {
    low: 5, medium: 10, high: 20, urgent: 30,
  };
  const base = basePoints[priority] ?? 10;
  return base + 5; // Bônus de pontualidade
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
        password: z.string().min(6).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, password, ...data } = input;
        // If password provided, hash it
        if (password) {
          const encoder = new TextEncoder();
          const passData = encoder.encode(password);
          const hashBuffer = await crypto.subtle.digest("SHA-256", passData);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const passwordHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
          await updateUser(ctx.db, id, { ...data, passwordHash } as any);
        } else {
          await updateUser(ctx.db, id, data as any);
        }
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
        avatarUrl: z.string().max(500000).optional().nullable(),
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
    toggleActive: adminProcedure
      .input(z.object({ id: z.number(), isActive: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        if (input.id === ctx.user.id) throw new Error("Não pode inativar a si mesmo");
        await ctx.db.update(users).set({ isActive: input.isActive ? 1 : 0, updatedAt: new Date().toISOString() }).where(eq(users.id, input.id));
        const targetUser = await ctx.db.select().from(users).where(eq(users.id, input.id)).limit(1);
        await logActivity(ctx.db, {
          userId: ctx.user.id,
          action: input.isActive ? "reactivated" : "deactivated",
          entityType: "user",
          entityId: input.id,
          details: `${input.isActive ? "Reativou" : "Inativou"} o colaborador "${targetUser[0]?.name || '#' + input.id}"`,
        });
        // Notify all admins about user status change
        const adminsForToggle = await ctx.db.select({ id: users.id, role: users.role }).from(users);
        for (const admin of adminsForToggle.filter(u => u.role === 'admin' && u.id !== ctx.user.id)) {
          await createNotification(ctx.db, {
            userId: admin.id,
            type: "user_status_changed",
            title: input.isActive ? "Colaborador reativado" : "Colaborador inativado",
            message: `${ctx.user.name || 'Admin'} ${input.isActive ? 'reativou' : 'inativou'} o colaborador "${targetUser[0]?.name || '#' + input.id}".`,
            entityType: "user",
            entityId: input.id,
          });
        }
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (input.id === ctx.user.id) throw new Error("N\u00e3o pode excluir a si mesmo");
        const targetUser = await ctx.db.select().from(users).where(eq(users.id, input.id)).limit(1);
        await ctx.db.delete(users).where(eq(users.id, input.id));
        await logActivity(ctx.db, {
          userId: ctx.user.id,
          action: "deleted",
          entityType: "user",
          entityId: input.id,
          details: `Excluiu permanentemente o colaborador "${targetUser[0]?.name || '#' + input.id}"`,
        });
        // Notify all admins about user deletion
        const adminsForDelete = await ctx.db.select({ id: users.id, role: users.role }).from(users);
        for (const admin of adminsForDelete.filter(u => u.role === 'admin' && u.id !== ctx.user.id)) {
          await createNotification(ctx.db, {
            userId: admin.id,
            type: "user_deleted",
            title: "Colaborador exclu\u00eddo",
            message: `${ctx.user.name || 'Admin'} excluiu permanentemente o colaborador "${targetUser[0]?.name || '#' + input.id}".`,
            entityType: "user",
            entityId: input.id,
          });
        }
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
        assigneeIds: z.array(z.number()).optional(),
        dueDate: z.number().optional(),
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        companyId: z.number().optional(),
        pointsReward: z.number().optional(),
        checklistItems: z.array(z.object({
          title: z.string().min(1).max(500),
        })).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { checklistItems: items, pointsReward, ...taskData } = input;
        const result = await createTask(ctx.db, {
          ...taskData,
          createdById: ctx.user.id,
          pointsReward,
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

        // Notify assigned users about new task
        const assignedIds = input.assigneeIds || (input.assigneeId ? [input.assigneeId] : []);
        for (const assignedId of assignedIds) {
          if (assignedId !== ctx.user.id) {
            await createNotification(ctx.db, {
              userId: assignedId,
              type: "task_assigned",
              title: "Nova tarefa atribu\u00edda",
              message: `Voc\u00ea recebeu a tarefa "${input.title}" (${input.priority === 'urgent' ? '\u26a0\ufe0f URGENTE' : input.priority === 'high' ? '\u2757 Alta' : input.priority}).`,
              entityType: "task",
              entityId: result.id,
            });
          }
        }

        // Notify all admins about new task creation (except creator)
        const allAdmins = await ctx.db.select({ id: users.id, role: users.role }).from(users);
        for (const admin of allAdmins.filter(u => u.role === 'admin' && u.id !== ctx.user.id)) {
          await createNotification(ctx.db, {
            userId: admin.id,
            type: "task_created",
            title: "Nova tarefa criada",
            message: `${ctx.user.name || 'Admin'} criou a tarefa "${input.title}" (${input.priority}).`,
            entityType: "task",
            entityId: result.id,
          });
        }

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
        // Se não for admin, forçar ver apenas as próprias tarefas
        const filters = { ...input };
        if (ctx.user.role !== "admin") {
          filters.assigneeId = ctx.user.id;
        }
        return listTasks(ctx.db, filters);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const task = await getTaskById(ctx.db, input.id);
        if (!task) return null;
        // Se não for admin, checar se é assignee via task_assignees ou legacy assigneeId
        if (ctx.user.role !== "admin") {
          const assignees = await getTaskAssignees(ctx.db, input.id);
          const isAssignee = assignees.some(a => a.id === ctx.user.id) || task.assigneeId === ctx.user.id;
          if (!isAssignee) {
            throw new Error("Sem permissão para ver esta tarefa");
          }
        }
        // Return task with assignees list
        const assignees = await getTaskAssignees(ctx.db, input.id);
        return { ...task, assignees };
      }),

    getAssignees: protectedProcedure
      .input(z.object({ taskId: z.number() }))
      .query(async ({ ctx, input }) => {
        return getTaskAssignees(ctx.db, input.taskId);
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
        assigneeId: z.number().nullable().optional(),
        assigneeIds: z.array(z.number()).optional(),
        dueDate: z.number().nullable().optional(),
        startTime: z.string().nullable().optional(),
        endTime: z.string().nullable().optional(),
        pointsAwarded: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, assigneeIds, ...data } = input;
        if (ctx.user.role !== "admin") {
          throw new Error("Apenas administradores podem editar tarefas");
        }

        // Audit: log points change if pointsAwarded is being modified
        if (data.pointsAwarded !== undefined) {
          const existingTask = await getTaskById(ctx.db, id);
          if (existingTask && existingTask.pointsAwarded !== data.pointsAwarded) {
            await logPointsAudit(ctx.db, {
              taskId: id,
              taskTitle: existingTask.title,
              oldPoints: existingTask.pointsAwarded ?? 0,
              newPoints: data.pointsAwarded,
              changedBy: ctx.user.id,
              changedByName: ctx.user.name,
              action: "manual_edit",
              reason: `Admin editou pontos da tarefa manualmente`,
              statusBefore: existingTask.status,
              statusAfter: existingTask.status,
            });
          }
        }

        await updateTask(ctx.db, id, data);
        // Update assignees if provided
        if (assigneeIds !== undefined) {
          await setTaskAssignees(ctx.db, id, assigneeIds);
        }
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
        status: z.enum(["pending", "in_progress", "review", "completed"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const task = await getTaskById(ctx.db, input.id);
        if (!task) throw new Error("Tarefa não encontrada");

        // Check permission: user must be an assignee (in task_assignees or legacy assigneeId) or admin
        const assignees = await getTaskAssignees(ctx.db, input.id);
        const isAssignee = assignees.some(a => a.id === ctx.user.id) || task.assigneeId === ctx.user.id;
        if (!isAssignee && ctx.user.role !== "admin") {
          throw new Error("Sem permissão para alterar o status desta tarefa");
        }

        // Non-admin users trying to set "completed" should go to "review" instead
        let targetStatus = input.status;
        if (targetStatus === "completed" && ctx.user.role !== "admin") {
          targetStatus = "review";
        }

        // Only admin can approve (move from review to completed)
        if (task.status === "review" && targetStatus === "completed" && ctx.user.role !== "admin") {
          throw new Error("Apenas o administrador pode aprovar tarefas em análise");
        }

        const updateData: Record<string, unknown> = { status: targetStatus };

        // When task enters "review" status, notify all admins
        if (targetStatus === "review" && task.status !== "review") {
          // Get all admin users to notify them
          // Find the assignee to include in the notification for navigation
          const taskAssignees = await getTaskAssignees(ctx.db, task.id);
          const primaryAssignee = taskAssignees.length > 0 ? taskAssignees[0] : (task.assigneeId ? { id: task.assigneeId, name: '' } : null);
          const assigneeId = primaryAssignee?.id || ctx.user.id;
          const assigneeName = ctx.user.name || 'Um colaborador';

          const allUsers = await ctx.db.select({ id: users.id, role: users.role }).from(users);
          const admins = allUsers.filter(u => u.role === "admin");
          for (const admin of admins) {
            await createNotification(ctx.db, {
              userId: admin.id,
              type: "task_review",
              title: "Tarefa aguardando aprovação",
              message: `${assigneeName} enviou a tarefa "${task.title}" para análise. Clique para revisar.`,
              entityType: "task",
              entityId: task.id,
            });
          }
        }

        // ===== COMPLETION LOGIC WITH COMPREHENSIVE LOGGING =====
        const allAssignees = assignees.length > 0 ? assignees : (task.assigneeId ? [{ id: task.assigneeId, name: '', avatarUrl: null }] : []);

        // Admin approving task (review → completed) OR completing directly: award points
        if (targetStatus === "completed" && task.status !== "completed") {
          const now = Date.now();
          updateData.completedAt = now;

          const isOverdue = !!(task.dueDate && now > task.dueDate);
          const onTime = !task.dueDate || now <= task.dueDate;
          const totalPoints = calculatePoints(task.priority, onTime);
          updateData.pointsAwarded = totalPoints;

          const completionType = task.status === "review" ? "approved" : "completed_direct";
          const completionReason = isOverdue
            ? `Tarefa conclu\u00edda COM ATRASO - pontos ZERADOS (prazo: ${new Date(task.dueDate!).toLocaleDateString("pt-BR")})`
            : `Tarefa conclu\u00edda no prazo - ${totalPoints} pontos concedidos`;

          // AUDIT: log points awarded on approval/completion
          await logPointsAudit(ctx.db, {
            taskId: task.id, taskTitle: task.title,
            oldPoints: task.pointsAwarded ?? 0, newPoints: totalPoints,
            changedBy: ctx.user.id, changedByName: ctx.user.name,
            action: completionType, reason: completionReason,
            statusBefore: task.status, statusAfter: targetStatus,
          });

          // LOG: registrar conclus\u00e3o da tarefa
          await createTaskLog(ctx.db, {
            taskId: task.id, taskTitle: task.title,
            userId: ctx.user.id, userName: ctx.user.name,
            action: completionType,
            statusBefore: task.status, statusAfter: targetStatus,
            pointsBefore: task.pointsAwarded ?? 0, pointsAfter: totalPoints,
            pointsChange: totalPoints,
            reason: completionReason,
            isOverdue, dueDate: task.dueDate, completedAt: now,
          });

          // Divide points among all assignees
          if (allAssignees.length > 0 && totalPoints > 0) {
            const pointsPerPerson = Math.max(1, Math.round(totalPoints / allAssignees.length));
            for (const assignee of allAssignees) {
              await addPoints(ctx.db, assignee.id, pointsPerPerson, `Completou tarefa "${task.title}"${allAssignees.length > 1 ? ` (${allAssignees.length} colaboradores)` : ""}`, task.id);

              // LOG: pontos concedidos por colaborador
              await createTaskLog(ctx.db, {
                taskId: task.id, taskTitle: task.title,
                userId: ctx.user.id, userName: ctx.user.name,
                action: "points_awarded",
                statusBefore: task.status, statusAfter: targetStatus,
                pointsBefore: 0, pointsAfter: pointsPerPerson,
                pointsChange: pointsPerPerson,
                reason: `+${pointsPerPerson} pts para ${(assignee as any).name || "Colaborador"} pela conclus\u00e3o da tarefa`,
                isOverdue, dueDate: task.dueDate, completedAt: now,
                affectedUserId: assignee.id, affectedUserName: (assignee as any).name,
              });

              const newBadges = await checkAndAwardBadges(ctx.db, assignee.id);
              for (const badge of newBadges) {
                await logActivity(ctx.db, {
                  userId: assignee.id,
                  action: "earned_badge",
                  entityType: "badge",
                  entityId: badge.id,
                  details: `Conquistou o badge "${badge.name}"`,
                });
              }
              // Notify assignee that task was approved
              if (task.status === "review") {
                await createNotification(ctx.db, {
                  userId: assignee.id,
                  type: "task_approved",
                  title: "Tarefa aprovada!",
                  message: `A tarefa "${task.title}" foi aprovada pelo CEO. Voc\u00ea ganhou ${pointsPerPerson} pontos!`,
                  entityType: "task",
                  entityId: task.id,
                });
              }
            }
          } else if (allAssignees.length > 0 && totalPoints === 0 && isOverdue) {
            // LOG: tarefa atrasada, 0 pontos
            for (const assignee of allAssignees) {
              await createTaskLog(ctx.db, {
                taskId: task.id, taskTitle: task.title,
                userId: ctx.user.id, userName: ctx.user.name,
                action: "points_zeroed_overdue",
                statusBefore: task.status, statusAfter: targetStatus,
                pointsBefore: task.pointsAwarded ?? 0, pointsAfter: 0,
                pointsChange: 0,
                reason: `0 pts para ${(assignee as any).name || "Colaborador"} - tarefa conclu\u00edda ap\u00f3s prazo (${new Date(task.dueDate!).toLocaleDateString("pt-BR")})`,
                isOverdue: true, dueDate: task.dueDate, completedAt: now,
                affectedUserId: assignee.id, affectedUserName: (assignee as any).name,
              });

              // Notify assignee that task was completed but with 0 points
              if (task.status === "review") {
                await createNotification(ctx.db, {
                  userId: assignee.id,
                  type: "task_approved",
                  title: "Tarefa aprovada (sem pontos)",
                  message: `A tarefa "${task.title}" foi aprovada, mas como estava atrasada, n\u00e3o houve pontua\u00e7\u00e3o.`,
                  entityType: "task",
                  entityId: task.id,
                });
              }
            }
          }
        }

        // If task was completed and is now being moved back, revert the awarded points from users
        if (task.status === "completed" && targetStatus !== "completed") {
          updateData.completedAt = null;

          // AUDIT: log points reverted
          await logPointsAudit(ctx.db, {
            taskId: task.id, taskTitle: task.title,
            oldPoints: task.pointsAwarded ?? 0, newPoints: 0,
            changedBy: ctx.user.id, changedByName: ctx.user.name,
            action: "reverted", reason: `Tarefa movida de Conclu\u00edda para ${targetStatus} - pontos revertidos`,
            statusBefore: task.status, statusAfter: targetStatus,
          });

          // Only reset pointsAwarded to 0 if the task had been completed (points were distributed)
          updateData.pointsAwarded = 0;

          const revertedEntries = await revertPointsByTaskId(ctx.db, input.id);
          if (revertedEntries.length > 0) {
            const totalReverted = revertedEntries.reduce((sum, e) => sum + e.points, 0);
            await logActivity(ctx.db, {
              userId: ctx.user.id,
              action: "points_reverted",
              entityType: "task",
              entityId: input.id,
              details: `Pontos revertidos (${totalReverted} pts) ao mover tarefa "${task.title}"`,
            });

            // LOG: pontos revertidos
            for (const entry of revertedEntries) {
              await createTaskLog(ctx.db, {
                taskId: task.id, taskTitle: task.title,
                userId: ctx.user.id, userName: ctx.user.name,
                action: "points_reverted",
                statusBefore: task.status, statusAfter: targetStatus,
                pointsBefore: entry.points, pointsAfter: 0,
                pointsChange: -entry.points,
                reason: `Pontos revertidos: -${entry.points} pts (tarefa movida de Conclu\u00edda)`,
                affectedUserId: entry.userId,
              });
            }
          }
        }

        // Clear completedAt when moving away from completed (but NOT pointsAwarded - that's the configured value)
        if (targetStatus !== "completed" && task.status !== "completed") {
          updateData.completedAt = null;
          // DO NOT reset pointsAwarded here - it's the value configured by admin
        }

        // LOG: registrar toda movimenta\u00e7\u00e3o de status (n\u00e3o duplicar se j\u00e1 logou acima)
        if (targetStatus !== "completed" && task.status !== "completed") {
          await createTaskLog(ctx.db, {
            taskId: task.id, taskTitle: task.title,
            userId: ctx.user.id, userName: ctx.user.name,
            action: "status_changed",
            statusBefore: task.status, statusAfter: targetStatus,
            pointsBefore: task.pointsAwarded ?? 0, pointsAfter: task.pointsAwarded ?? 0,
            pointsChange: 0,
            reason: `Status alterado de ${task.status} para ${targetStatus}`,
            isOverdue: !!(task.dueDate && Date.now() > task.dueDate),
            dueDate: task.dueDate,
          });
        }

        // If admin rejects (review → in_progress/pending), notify assignees
        if (task.status === "review" && (targetStatus === "in_progress" || targetStatus === "pending")) {
          for (const assignee of allAssignees) {
            await createNotification(ctx.db, {
              userId: assignee.id,
              type: "task_rejected",
              title: "Tarefa devolvida",
              message: `A tarefa "${task.title}" foi devolvida pelo CEO para ajustes.`,
              entityType: "task",
              entityId: task.id,
            });
          }
        }

        await updateTask(ctx.db, input.id, updateData as any);

        const statusLabels: Record<string, string> = {
          pending: "Pendente",
          in_progress: "Em Andamento",
          review: "Em An\u00e1lise",
          completed: "Conclu\u00edda",
        };

        await logActivity(ctx.db, {
          userId: ctx.user.id,
          action: "status_changed",
          entityType: "task",
          entityId: input.id,
          details: `Alterou status para "${statusLabels[targetStatus]}"`,
        });

        // Notify admins about ALL status changes (except their own actions)
        const statusAdmins = await ctx.db.select({ id: users.id, role: users.role }).from(users);
        for (const admin of statusAdmins.filter(u => u.role === 'admin' && u.id !== ctx.user.id)) {
          await createNotification(ctx.db, {
            userId: admin.id,
            type: "task_status_changed",
            title: `Tarefa movida para ${statusLabels[targetStatus]}`,
            message: `${ctx.user.name || 'Colaborador'} moveu "${task.title}" de ${statusLabels[task.status] || task.status} para ${statusLabels[targetStatus]}.`,
            entityType: "task",
            entityId: task.id,
          });
        }

        // Notify assignees about status changes made by admin
        if (ctx.user.role === 'admin') {
          for (const assignee of allAssignees) {
            if (assignee.id !== ctx.user.id) {
              await createNotification(ctx.db, {
                userId: assignee.id,
                type: "task_status_changed",
                title: `Tarefa movida para ${statusLabels[targetStatus]}`,
                message: `O admin moveu sua tarefa "${task.title}" para ${statusLabels[targetStatus]}.`,
                entityType: "task",
                entityId: task.id,
              });
            }
          }
        }

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
    manualPointsLog: adminProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        return getManualPointsLog(ctx.db, input.limit || 100);
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
        // Se não for admin, forçar ver apenas seus próprios dados
        const userId = ctx.user.role !== "admin" ? ctx.user.id : input?.userId;
        return getDashboardStats(ctx.db, userId);
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
        // Se não for admin, forçar ver apenas suas próprias atividades
        const filters = { ...input };
        if (ctx.user.role !== "admin") {
          filters.userId = ctx.user.id;
        }
        return getActivityLog(ctx.db, filters);
      }),
  }),

  collaborators: router({
    listWithStats: protectedProcedure.query(async ({ ctx }) => {
      return getCollaboratorsWithStats(ctx.db);
    }),
    listWithStatsByCompany: protectedProcedure
      .input(z.object({ companyId: z.number() }))
      .query(async ({ ctx, input }) => {
        return getCompanyCollaboratorsWithStats(ctx.db, input.companyId);
      }),
  }),

  chat: router({
    messages: protectedProcedure
      .input(z.object({
        limit: z.number().optional(),
        beforeId: z.number().optional(),
        companyId: z.number().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        return getChatMessages(ctx.db, input?.limit ?? 100, input?.beforeId, input?.companyId);
      }),
    send: protectedProcedure
      .input(z.object({
        content: z.string().min(1).max(5000),
        companyId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const msg = await sendChatMessage(ctx.db, ctx.user.id, input.content, input.companyId || undefined);

        // Notify all other users about the new chat message
        try {
          const allUsers = await ctx.db.select({ id: users.id }).from(users);
          const otherUsers = allUsers.filter(u => u.id !== ctx.user.id);
          const preview = input.content.length > 80 ? input.content.substring(0, 80) + "..." : input.content;
          for (const u of otherUsers) {
            await createNotification(ctx.db, {
              userId: u.id,
              type: "chat_message",
              title: `Nova mensagem de ${ctx.user.name || "Alguém"}`,
              message: preview,
              entityType: "chat",
              entityId: 0,
            });
          }
        } catch (e) {
          // Don't fail the message send if notifications fail
          console.error("Failed to create chat notifications:", e);
        }

        return msg;
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
    // Company Members
    members: protectedProcedure
      .input(z.object({ companyId: z.number() }))
      .query(async ({ ctx, input }) => {
        return getCompanyMembers(ctx.db, input.companyId);
      }),
    addMember: adminProcedure
      .input(z.object({ companyId: z.number(), userId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const result = await addCompanyMember(ctx.db, input.companyId, input.userId);
        await logActivity(ctx.db, {
          userId: ctx.user.id,
          action: "created",
          entityType: "company_member",
          entityId: input.companyId,
          details: `Adicionou colaborador #${input.userId} à empresa #${input.companyId}`,
        });
        return result;
      }),
    removeMember: adminProcedure
      .input(z.object({ companyId: z.number(), userId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await removeCompanyMember(ctx.db, input.companyId, input.userId);
        await logActivity(ctx.db, {
          userId: ctx.user.id,
          action: "deleted",
          entityType: "company_member",
          entityId: input.companyId,
          details: `Removeu colaborador #${input.userId} da empresa #${input.companyId}`,
        });
        return { success: true };
      }),
  }),

  notifications: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getNotifications(ctx.db, ctx.user.id);
    }),
    unreadCount: protectedProcedure.query(async ({ ctx }) => {
      return getUnreadNotificationCount(ctx.db, ctx.user.id);
    }),
    markRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await markNotificationRead(ctx.db, input.id);
        return { success: true };
      }),
    markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
      await markAllNotificationsRead(ctx.db, ctx.user.id);
      return { success: true };
    }),
  }),

  admin: router({
    fixOrphanedPoints: adminProcedure
      .mutation(async ({ ctx }) => {
        // Find tasks that are NOT completed but have points_log entries
        // These are cases where the bug already happened
        const allTasks = await ctx.db.select().from(tasks);
        const nonCompletedWithPoints = allTasks.filter(
          (t: any) => t.status !== "completed" && t.id
        );

        let fixedCount = 0;
        let totalPointsReverted = 0;
        const fixes: Array<{ taskId: number; title: string; pointsReverted: number; usersAffected: number }> = [];

        for (const task of nonCompletedWithPoints) {
          // Check if there are points_log entries for this task
          const entries = await ctx.db.select().from(pointsLog)
            .where(eq(pointsLog.taskId, task.id));

          if (entries.length > 0) {
            // Revert points
            const reverted = await revertPointsByTaskId(ctx.db, task.id);
            const pointsSum = reverted.reduce((sum: number, e: any) => sum + e.points, 0);
            
            // Also reset pointsAwarded on the task
            await updateTask(ctx.db, task.id, { pointsAwarded: 0 } as any);

            fixedCount++;
            totalPointsReverted += pointsSum;
            fixes.push({
              taskId: task.id,
              title: task.title,
              pointsReverted: pointsSum,
              usersAffected: reverted.length,
            });
          }
        }

        if (fixedCount > 0) {
          await logActivity(ctx.db, {
            userId: ctx.user.id,
            action: "admin_fix",
            entityType: "system",
            entityId: 0,
            details: `Corrigiu ${fixedCount} tarefa(s) com pontos órfãos. Total revertido: ${totalPointsReverted} pts`,
          });
        }

        return { fixedCount, totalPointsReverted, fixes };
      }),

    pointsAuditLog: adminProcedure
      .input(z.object({ limit: z.number().optional(), taskId: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        if (input.taskId) {
          return getPointsAuditByTask(ctx.db, input.taskId);
        }
        return getPointsAuditLog(ctx.db, input.limit || 200);
      }),
  }),

  // ===== TASK LOGS (SISTEMA DE LOGS COMPLETO) =====
  taskLogs: router({
    list: protectedProcedure
      .input(z.object({
        taskId: z.number().optional(),
        userId: z.number().optional(),
        affectedUserId: z.number().optional(),
        action: z.string().optional(),
        limit: z.number().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        // Non-admin can only see their own logs
        const filters = { ...input };
        if (ctx.user.role !== "admin") {
          filters.affectedUserId = ctx.user.id;
        }
        return getTaskLogs(ctx.db, filters);
      }),

    byCollaborator: protectedProcedure
      .input(z.object({ userId: z.number(), limit: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        return getTaskLogsByCollaborator(ctx.db, input.userId, input.limit || 200);
      }),

    byTask: protectedProcedure
      .input(z.object({ taskId: z.number() }))
      .query(async ({ ctx, input }) => {
        return getTaskLogs(ctx.db, { taskId: input.taskId });
      }),
  }),

  // ===== CAIXA DE IDEIAS =====
  ideas: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return listIdeas(ctx.db);
    }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        return getIdeaById(ctx.db, input.id);
      }),

    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(500),
        description: z.string().max(5000).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const idea = await createIdea(ctx.db, {
          title: input.title,
          description: input.description,
          authorId: ctx.user.id,
        });

        await logActivity(ctx.db, {
          userId: ctx.user.id,
          action: "idea_created",
          entityType: "idea",
          entityId: idea.id,
          details: `Nova ideia: ${input.title}`,
        });

        return idea;
      }),

    updateStatus: adminProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["new", "rejected", "analysis", "approved"]),
        pointsAwarded: z.number().optional(),
        rejectionReason: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const idea = await getIdeaById(ctx.db, input.id);
        if (!idea) throw new Error("Ideia não encontrada");

        const updated = await updateIdeaStatus(ctx.db, input.id, {
          status: input.status,
          approvedById: input.status === "approved" ? ctx.user.id : undefined,
          pointsAwarded: input.pointsAwarded,
          rejectionReason: input.rejectionReason,
        });

        // Se aprovada e tem pontos, adicionar ao autor
        if (input.status === "approved" && input.pointsAwarded && input.pointsAwarded > 0) {
          // Adicionar pontos no ranking do colaborador
          await addPoints(ctx.db, idea.authorId, input.pointsAwarded, `Ideia aprovada: "${idea.title}"`);

          // Também registrar no highlight (destaque)
          await addHighlightPoints(ctx.db, {
            userId: idea.authorId,
            points: input.pointsAwarded,
            reason: `Ideia aprovada: ${idea.title}`,
            awardedById: ctx.user.id,
          });

          await createNotification(ctx.db, {
            userId: idea.authorId,
            type: "idea_approved",
            title: "Sua ideia foi aprovada!",
            message: `Sua ideia "${idea.title}" foi aprovada e você ganhou ${input.pointsAwarded} pontos!`,
            entityType: "idea",
            entityId: idea.id,
          });
        }

        if (input.status === "rejected") {
          await createNotification(ctx.db, {
            userId: idea.authorId,
            type: "idea_rejected",
            title: "Sua ideia foi rejeitada",
            message: `Sua ideia "${idea.title}" foi rejeitada.${input.rejectionReason ? ` Motivo: ${input.rejectionReason}` : ""}`,
            entityType: "idea",
            entityId: idea.id,
          });
        }

        if (input.status === "analysis") {
          await createNotification(ctx.db, {
            userId: idea.authorId,
            type: "idea_analysis",
            title: "Sua ideia está em análise",
            message: `Sua ideia "${idea.title}" está sendo analisada.`,
            entityType: "idea",
            entityId: idea.id,
          });
        }

        await logActivity(ctx.db, {
          userId: ctx.user.id,
          action: `idea_${input.status}`,
          entityType: "idea",
          entityId: input.id,
          details: `Ideia "${idea.title}" movida para ${input.status}`,
        });

        return updated;
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteIdea(ctx.db, input.id);
        return { success: true };
      }),
  }),

  // ===== COLABORADOR DESTAQUE =====
  highlight: router({
    addPoints: adminProcedure
      .input(z.object({
        userId: z.number(),
        points: z.number().min(1),
        reason: z.string().min(1).max(500),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await addHighlightPoints(ctx.db, {
          userId: input.userId,
          points: input.points,
          reason: input.reason,
          awardedById: ctx.user.id,
        });

        const targetUser = await getUserById(ctx.db, input.userId);

        await createNotification(ctx.db, {
          userId: input.userId,
          type: "highlight_points",
          title: "Você recebeu pontos de destaque!",
          message: `Você recebeu ${input.points} pontos. Motivo: ${input.reason}`,
          entityType: "highlight",
          entityId: result.id,
        });

        await logActivity(ctx.db, {
          userId: ctx.user.id,
          action: "highlight_points",
          entityType: "highlight",
          entityId: result.id,
          details: `${input.points} pts para ${targetUser?.name || "Colaborador"}: ${input.reason}`,
        });

        return result;
      }),

    log: protectedProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ ctx, input }) => {
        return getHighlightPointsLog(ctx.db, input?.limit || 100);
      }),

    byUser: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ ctx, input }) => {
        return getHighlightPointsByUser(ctx.db, input.userId);
      }),
   }),

  // ===== OVERDUE CHECK (notifica admins sobre tarefas que ficaram atrasadas) =====
  overdueCheck: router({
    run: adminProcedure.mutation(async ({ ctx }) => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const now = todayStart.getTime();

      // Get all tasks that are overdue and NOT completed
      const allTasks = await ctx.db.select().from(tasks);
      const overdueTasks = allTasks.filter(
        (t: any) => t.dueDate && t.dueDate < now && t.status !== 'completed'
      );

      // Get recent notifications to avoid duplicates (last 24h)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const recentNotifs = await ctx.db.select().from(notifications)
        .where(and(
          eq(notifications.type, 'task_overdue'),
          sql`${notifications.createdAt} > ${oneDayAgo}`
        ));
      const recentlyNotifiedTaskIds = new Set(recentNotifs.map(n => n.entityId));

      const admins = await ctx.db.select({ id: users.id, role: users.role }).from(users);
      const adminUsers = admins.filter(u => u.role === 'admin');
      let notifiedCount = 0;

      for (const task of overdueTasks) {
        if (recentlyNotifiedTaskIds.has(task.id)) continue; // Skip already notified

        const daysOverdue = Math.ceil((Date.now() - task.dueDate!) / (1000 * 60 * 60 * 24));
        const assignees = await getTaskAssignees(ctx.db, task.id);
        const assigneeNames = assignees.map((a: any) => a.name).filter(Boolean).join(', ') || 'Sem responsável';

        for (const admin of adminUsers) {
          await createNotification(ctx.db, {
            userId: admin.id,
            type: 'task_overdue',
            title: `Tarefa atrasada (${daysOverdue} dia${daysOverdue > 1 ? 's' : ''})`,
            message: `"${task.title}" está ${daysOverdue} dia(s) atrasada. Responsável: ${assigneeNames}.`,
            entityType: 'task',
            entityId: task.id,
          });
        }

        // Also notify assignees
        for (const assignee of assignees) {
          await createNotification(ctx.db, {
            userId: assignee.id,
            type: 'task_overdue',
            title: 'Sua tarefa está atrasada!',
            message: `A tarefa "${task.title}" está ${daysOverdue} dia(s) atrasada. Conclua o mais rápido possível.`,
            entityType: 'task',
            entityId: task.id,
          });
        }

        notifiedCount++;
      }

      return { checked: overdueTasks.length, notified: notifiedCount };
    }),
  }),

  // ===== LOGS DE ACESSO À PLATAFORMA =====
  access: router({
    // Registrar acesso (chamado pelo client ao carregar a página)
    log: protectedProcedure
      .input(z.object({
        action: z.enum(["login", "page_view", "heartbeat"]),
        page: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const userAgent = ctx.req.headers.get("user-agent") || null;
        const ip = ctx.req.headers.get("cf-connecting-ip") || ctx.req.headers.get("x-forwarded-for") || null;
        await logAccess(ctx.db, {
          userId: ctx.user!.id,
          userName: ctx.user!.name,
          action: input.action,
          ipAddress: ip,
          userAgent,
          page: input.page || null,
        });
        return { success: true };
      }),

    // Listar logs de acesso (admin)
    list: adminProcedure
      .input(z.object({
        userId: z.number().optional(),
        action: z.string().optional(),
        limit: z.number().optional(),
        daysBack: z.number().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        return getAccessLogs(ctx.db, input);
      }),

    // Estatísticas de acesso por usuário (admin)
    stats: adminProcedure
      .input(z.object({ daysBack: z.number().optional() }).optional())
      .query(async ({ ctx, input }) => {
        return getAccessStats(ctx.db, input?.daysBack ?? 30);
      }),
  }),

  // ===== OUVIDORIA CEO =====
  complaints: router({
    // Listar reclamações (admin vê tudo, colaborador vê só as suas)
    list: protectedProcedure
      .input(z.object({
        status: z.string().optional(),
        type: z.string().optional(),
        category: z.string().optional(),
        priority: z.string().optional(),
        search: z.string().optional(),
        limit: z.number().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        const filters: any = { ...input };
        if (ctx.user.role !== 'admin') {
          filters.authorId = ctx.user.id;
        }
        return listComplaints(ctx.db, filters);
      }),

    // Buscar por ID
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const complaint = await getComplaintById(ctx.db, input.id);
        if (!complaint) throw new Error('Reclama\u00e7\u00e3o n\u00e3o encontrada');
        // Non-admin can only see their own
        if (ctx.user.role !== 'admin' && complaint.authorId !== ctx.user.id) {
          throw new Error('Sem permiss\u00e3o');
        }
        return complaint;
      }),

    // Buscar por protocolo
    getByProtocol: protectedProcedure
      .input(z.object({ protocol: z.string() }))
      .query(async ({ ctx, input }) => {
        const complaint = await getComplaintByProtocol(ctx.db, input.protocol);
        if (!complaint) throw new Error('Protocolo n\u00e3o encontrado');
        if (ctx.user.role !== 'admin' && complaint.authorId !== ctx.user.id) {
          throw new Error('Sem permiss\u00e3o');
        }
        return complaint;
      }),

    // Criar reclama\u00e7\u00e3o (interno - logado)
    create: protectedProcedure
      .input(z.object({
        type: z.enum(['reclamacao', 'sugestao', 'elogio', 'denuncia']),
        category: z.enum(['atendimento', 'infraestrutura', 'gestao', 'comunicacao', 'seguranca', 'outros']),
        priority: z.enum(['baixa', 'media', 'alta', 'urgente']).optional(),
        subject: z.string().min(3).max(500),
        description: z.string().min(3).max(10000),
        occurrenceDate: z.string().optional(),
        occurrenceLocation: z.string().max(500).optional(),
        isAnonymous: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const protocol = await generateProtocol(ctx.db);
        const complaint = await createComplaint(ctx.db, {
          protocol,
          type: input.type,
          category: input.category,
          priority: input.priority,
          subject: input.subject,
          description: input.description,
          occurrenceDate: input.occurrenceDate,
          occurrenceLocation: input.occurrenceLocation,
          authorId: input.isAnonymous ? null : ctx.user.id,
          authorName: input.isAnonymous ? null : ctx.user.name,
          isAnonymous: input.isAnonymous || false,
          isExternal: false,
        });

        // Notify all admins
        const admins = await ctx.db.select({ id: users.id, role: users.role }).from(users);
        for (const admin of admins.filter(u => u.role === 'admin')) {
          await createNotification(ctx.db, {
            userId: admin.id,
            type: 'complaint_new',
            title: `Nova ${input.type === 'reclamacao' ? 'reclama\u00e7\u00e3o' : input.type === 'sugestao' ? 'sugest\u00e3o' : input.type === 'elogio' ? 'elogio' : 'den\u00fancia'} na Ouvidoria`,
            message: `${input.isAnonymous ? 'An\u00f4nimo' : ctx.user.name || 'Colaborador'} registrou: "${input.subject}" [${protocol}]`,
            entityType: 'complaint',
            entityId: complaint.id,
          });
        }

        await logActivity(ctx.db, {
          userId: ctx.user.id,
          action: 'complaint_created',
          entityType: 'complaint',
          entityId: complaint.id,
          details: `Nova ${input.type} na ouvidoria: ${input.subject} [${protocol}]`,
        });

        return complaint;
      }),

    // Atualizar status (admin)
    updateStatus: adminProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(['novo', 'em_analise', 'em_andamento', 'respondido', 'concluido', 'arquivado']),
      }))
      .mutation(async ({ ctx, input }) => {
        const complaint = await getComplaintById(ctx.db, input.id);
        if (!complaint) throw new Error('N\u00e3o encontrada');
        await updateComplaint(ctx.db, input.id, { status: input.status });

        const statusLabels: Record<string, string> = {
          novo: 'Novo', em_analise: 'Em An\u00e1lise', em_andamento: 'Em Andamento',
          respondido: 'Respondido', concluido: 'Conclu\u00eddo', arquivado: 'Arquivado',
        };

        // Notify author if not anonymous
        if (complaint.authorId) {
          await createNotification(ctx.db, {
            userId: complaint.authorId,
            type: 'complaint_status_changed',
            title: `Ouvidoria: Status atualizado`,
            message: `Seu registro [${complaint.protocol}] foi movido para "${statusLabels[input.status]}".`,
            entityType: 'complaint',
            entityId: complaint.id,
          });
        }

        await logActivity(ctx.db, {
          userId: ctx.user.id,
          action: 'complaint_status_changed',
          entityType: 'complaint',
          entityId: input.id,
          details: `Status alterado para "${statusLabels[input.status]}" [${complaint.protocol}]`,
        });

        return { success: true };
      }),

    // Atribuir admin respons\u00e1vel
    assign: adminProcedure
      .input(z.object({ id: z.number(), assignedToId: z.number().nullable() }))
      .mutation(async ({ ctx, input }) => {
        await updateComplaint(ctx.db, input.id, { assignedToId: input.assignedToId });
        return { success: true };
      }),

    // Resolver reclama\u00e7\u00e3o
    resolve: adminProcedure
      .input(z.object({
        id: z.number(),
        resolution: z.string().min(5).max(10000),
      }))
      .mutation(async ({ ctx, input }) => {
        const complaint = await getComplaintById(ctx.db, input.id);
        if (!complaint) throw new Error('N\u00e3o encontrada');

        await updateComplaint(ctx.db, input.id, {
          status: 'concluido',
          resolution: input.resolution,
          resolvedAt: new Date().toISOString(),
          resolvedById: ctx.user.id,
        });

        // Notify author
        if (complaint.authorId) {
          await createNotification(ctx.db, {
            userId: complaint.authorId,
            type: 'complaint_resolved',
            title: 'Ouvidoria: Seu registro foi conclu\u00eddo',
            message: `Seu registro [${complaint.protocol}] "${complaint.subject}" foi conclu\u00eddo com resolu\u00e7\u00e3o.`,
            entityType: 'complaint',
            entityId: complaint.id,
          });
        }

        return { success: true };
      }),

    // Responder/comentar
    respond: protectedProcedure
      .input(z.object({
        complaintId: z.number(),
        message: z.string().min(1).max(10000),
        isInternal: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const complaint = await getComplaintById(ctx.db, input.complaintId);
        if (!complaint) throw new Error('N\u00e3o encontrada');

        // Non-admin can only respond to their own and not internal
        if (ctx.user.role !== 'admin') {
          if (complaint.authorId !== ctx.user.id) throw new Error('Sem permiss\u00e3o');
          input.isInternal = false;
        }

        const response = await createComplaintResponse(ctx.db, {
          complaintId: input.complaintId,
          userId: ctx.user.id,
          userName: ctx.user.name,
          message: input.message,
          isInternal: input.isInternal || false,
        });

        // If admin responds (public), notify author
        if (ctx.user.role === 'admin' && !input.isInternal && complaint.authorId) {
          await createNotification(ctx.db, {
            userId: complaint.authorId,
            type: 'complaint_response',
            title: 'Ouvidoria: Nova resposta',
            message: `Seu registro [${complaint.protocol}] recebeu uma resposta.`,
            entityType: 'complaint',
            entityId: complaint.id,
          });
          // Also update status to 'respondido' if it was 'em_analise' or 'em_andamento'
          if (['em_analise', 'em_andamento', 'novo'].includes(complaint.status)) {
            await updateComplaint(ctx.db, input.complaintId, { status: 'respondido' });
          }
        }

        // If collaborator responds, notify admins
        if (ctx.user.role !== 'admin') {
          const admins = await ctx.db.select({ id: users.id, role: users.role }).from(users);
          for (const admin of admins.filter(u => u.role === 'admin')) {
            await createNotification(ctx.db, {
              userId: admin.id,
              type: 'complaint_response',
              title: 'Ouvidoria: Nova mensagem do autor',
              message: `${ctx.user.name || 'Colaborador'} respondeu no registro [${complaint.protocol}].`,
              entityType: 'complaint',
              entityId: complaint.id,
            });
          }
        }

        return response;
      }),

    // Listar respostas
    responses: protectedProcedure
      .input(z.object({ complaintId: z.number() }))
      .query(async ({ ctx, input }) => {
        const complaint = await getComplaintById(ctx.db, input.complaintId);
        if (!complaint) throw new Error('N\u00e3o encontrada');
        if (ctx.user.role !== 'admin' && complaint.authorId !== ctx.user.id) {
          throw new Error('Sem permiss\u00e3o');
        }
        return getComplaintResponses(ctx.db, input.complaintId, ctx.user.role === 'admin');
      }),

    // Estat\u00edsticas
    stats: adminProcedure.query(async ({ ctx }) => {
      return getComplaintStats(ctx.db);
    }),

    // Deletar (admin)
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteComplaint(ctx.db, input.id);
        return { success: true };
      }),
  }),
});
export type AppRouter = typeof appRouter;
