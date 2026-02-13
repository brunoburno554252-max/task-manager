import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Plus, MoreHorizontal, Pencil, Trash2, Calendar, User, AlertTriangle,
  Clock, CheckCircle2, Circle, GripVertical, Filter, Flame, Zap,
  ArrowUp, ArrowRight, ArrowDown, Timer, Sparkles, Target, Search, X,
  MessageSquare, History, Send, LayoutGrid, Columns3, ChevronRight,
  UserCircle, FileText, Tag,
} from "lucide-react";
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext, DragOverlay, closestCorners, KeyboardSensor, PointerSensor,
  useSensor, useSensors, useDroppable,
  type DragStartEvent, type DragEndEvent, type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ==================== TYPES ====================
type TaskStatus = "pending" | "in_progress" | "completed";
type Priority = "low" | "medium" | "high" | "urgent";
type ViewMode = "kanban" | "cards";

type TaskItem = {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  assigneeId: number | null;
  createdById: number;
  dueDate: number | null;
  completedAt: number | null;
  pointsAwarded: number;
  createdAt: Date;
  updatedAt: Date;
};

type TaskForm = {
  title: string;
  description: string;
  priority: Priority;
  assigneeId: string;
  dueDate: string;
};

const emptyForm: TaskForm = { title: "", description: "", priority: "medium", assigneeId: "", dueDate: "" };

// ==================== CONFIG ====================
const columnConfig: Record<TaskStatus, {
  label: string; icon: typeof Circle; gradient: string; headerBg: string;
  emptyIcon: typeof Target; emptyText: string; pipelineColor: string;
}> = {
  pending: {
    label: "Pendente", icon: Circle, gradient: "from-amber-500 to-orange-500",
    headerBg: "bg-gradient-to-r from-amber-500/10 to-orange-500/5",
    emptyIcon: Target, emptyText: "Nenhuma tarefa pendente",
    pipelineColor: "bg-gradient-to-r from-amber-500 to-orange-500",
  },
  in_progress: {
    label: "Em Andamento", icon: Clock, gradient: "from-blue-500 to-cyan-500",
    headerBg: "bg-gradient-to-r from-blue-500/10 to-cyan-500/5",
    emptyIcon: Zap, emptyText: "Nenhuma tarefa em andamento",
    pipelineColor: "bg-gradient-to-r from-blue-500 to-cyan-500",
  },
  completed: {
    label: "Concluída", icon: CheckCircle2, gradient: "from-emerald-500 to-teal-500",
    headerBg: "bg-gradient-to-r from-emerald-500/10 to-teal-500/5",
    emptyIcon: Sparkles, emptyText: "Nenhuma tarefa concluída",
    pipelineColor: "bg-gradient-to-r from-emerald-500 to-teal-500",
  },
};

const priorityConfig: Record<Priority, {
  label: string; icon: typeof ArrowDown; color: string; bg: string; border: string;
}> = {
  low: { label: "Baixa", icon: ArrowDown, color: "text-slate-400", bg: "bg-slate-500/15", border: "border-slate-500/20" },
  medium: { label: "Média", icon: ArrowRight, color: "text-blue-400", bg: "bg-blue-500/15", border: "border-blue-500/20" },
  high: { label: "Alta", icon: ArrowUp, color: "text-orange-400", bg: "bg-orange-500/15", border: "border-orange-500/20" },
  urgent: { label: "Urgente", icon: Flame, color: "text-red-400", bg: "bg-red-500/15", border: "border-red-500/25" },
};

const statusOrder: TaskStatus[] = ["pending", "in_progress", "completed"];

// ==================== HELPERS ====================
function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name.split(" ").map(n => n[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

function getAvatarColor(id: number): string {
  const colors = [
    "from-violet-500 to-purple-600", "from-blue-500 to-cyan-600",
    "from-emerald-500 to-teal-600", "from-orange-500 to-amber-600",
    "from-pink-500 to-rose-600", "from-indigo-500 to-blue-600",
    "from-teal-500 to-green-600", "from-fuchsia-500 to-pink-600",
  ];
  return colors[id % colors.length];
}

function getDueDateInfo(dueDate: number | null, status: TaskStatus) {
  if (!dueDate || status === "completed") return { label: "", urgency: "none" as const, color: "", bg: "" };
  const diff = dueDate - Date.now();
  const days = Math.ceil(diff / 86400000);
  if (diff < 0) return { label: `${Math.abs(days)}d atrasado`, urgency: "overdue" as const, color: "text-red-400", bg: "bg-red-500/15 border-red-500/30" };
  if (days === 0) return { label: "Hoje", urgency: "today" as const, color: "text-amber-400", bg: "bg-amber-500/15 border-amber-500/30" };
  if (days <= 2) return { label: `${days}d`, urgency: "soon" as const, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" };
  return { label: new Date(dueDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }), urgency: "normal" as const, color: "text-muted-foreground", bg: "bg-muted/40 border-border/30" };
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ==================== DROPPABLE COLUMN ====================
function DroppableColumn({ id, children, isOver }: { id: string; children: React.ReactNode; isOver?: boolean }) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`space-y-2.5 flex-1 min-h-[200px] p-3 rounded-b-xl transition-all duration-200 ${isOver ? "bg-primary/5 ring-1 ring-primary/20" : ""}`}>
      {children}
    </div>
  );
}

// ==================== SORTABLE CARD ====================
function SortableTaskCard({ task, onClick }: { task: TaskItem; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `task-${task.id}` });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const pc = priorityConfig[task.priority];
  const PIcon = pc.icon;
  const dueInfo = getDueDateInfo(task.dueDate, task.status);

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: isDragging ? 0.4 : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className={`kanban-card-premium group relative cursor-pointer ${isDragging ? "kanban-card-dragging" : ""} ${dueInfo.urgency === "overdue" ? "kanban-card-overdue" : ""}`}
      onClick={onClick}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="absolute left-0 top-0 bottom-0 w-5 flex items-center justify-center opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-all cursor-grab active:cursor-grabbing z-10 rounded-l-xl hover:bg-white/5"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
      </button>

      {/* Priority accent */}
      <div className={`absolute top-0 left-0 w-1 h-full rounded-l-xl ${
        task.priority === "urgent" ? "bg-gradient-to-b from-red-500 to-red-600" :
        task.priority === "high" ? "bg-gradient-to-b from-orange-500 to-amber-500" :
        task.priority === "medium" ? "bg-gradient-to-b from-blue-500 to-blue-600" :
        "bg-gradient-to-b from-slate-500 to-slate-600"
      }`} />

      <div className="pl-4 pr-3 py-3">
        <h4 className={`text-[13px] font-semibold leading-snug tracking-tight ${task.status === "completed" ? "line-through text-muted-foreground/60" : "text-foreground"}`}>
          {task.title}
        </h4>
        {task.description && (
          <p className="text-xs text-muted-foreground/60 mt-1 line-clamp-1">{task.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${pc.bg} ${pc.border} ${pc.color}`}>
            <PIcon className="h-2.5 w-2.5" />{pc.label}
          </span>
          {dueInfo.urgency !== "none" && (
            <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${dueInfo.bg} ${dueInfo.color} ${dueInfo.urgency === "overdue" ? "animate-pulse" : ""}`}>
              {dueInfo.urgency === "overdue" ? <AlertTriangle className="h-2.5 w-2.5" /> : <Calendar className="h-2.5 w-2.5" />}
              {dueInfo.label}
            </span>
          )}
          {task.pointsAwarded > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/15 border border-primary/25 text-primary">
              <Zap className="h-2.5 w-2.5" />+{task.pointsAwarded}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ==================== TASK DETAIL PANEL ====================
function TaskDetailPanel({
  task,
  isAdmin,
  allUsers,
  onClose,
  onEdit,
  onStatusChange,
  onDelete,
}: {
  task: TaskItem;
  isAdmin: boolean;
  allUsers: { id: number; name: string | null; email: string | null; role: string }[] | undefined;
  onClose: () => void;
  onEdit: (task: TaskItem) => void;
  onStatusChange: (id: number, status: TaskStatus) => void;
  onDelete: (id: number) => void;
}) {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [commentText, setCommentText] = useState("");
  const [activeTab, setActiveTab] = useState("comments");
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  const { data: comments, isLoading: commentsLoading } = trpc.tasks.comments.useQuery({ taskId: task.id });
  const { data: activities, isLoading: activitiesLoading } = trpc.tasks.activities.useQuery({ taskId: task.id });

  const addCommentMutation = trpc.tasks.addComment.useMutation({
    onSuccess: () => {
      utils.tasks.comments.invalidate({ taskId: task.id });
      utils.tasks.activities.invalidate({ taskId: task.id });
      utils.activity.list.invalidate();
      setCommentText("");
      toast.success("Comentário adicionado!");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    addCommentMutation.mutate({ taskId: task.id, content: commentText.trim() });
  };

  const assignee = allUsers?.find(u => u.id === task.assigneeId);
  const creator = allUsers?.find(u => u.id === task.createdById);
  const pc = priorityConfig[task.priority];
  const PIcon = pc.icon;
  const dueInfo = getDueDateInfo(task.dueDate, task.status);
  const canChangeStatus = isAdmin || task.assigneeId === user?.id;

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className="fixed inset-y-0 right-0 w-full sm:w-[520px] lg:w-[600px] z-50 task-detail-sheet shadow-2xl flex flex-col"
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm -z-10"
        onClick={onClose}
      />

      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b border-border/20">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono text-muted-foreground/50">#{task.id}</span>
              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${pc.bg} ${pc.border} ${pc.color}`}>
                <PIcon className="h-2.5 w-2.5" />{pc.label}
              </span>
              {dueInfo.urgency !== "none" && (
                <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${dueInfo.bg} ${dueInfo.color}`}>
                  {dueInfo.urgency === "overdue" ? <AlertTriangle className="h-2.5 w-2.5" /> : <Calendar className="h-2.5 w-2.5" />}
                  {dueInfo.label}
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold tracking-tight text-foreground">{task.title}</h2>
          </div>
          <div className="flex items-center gap-1.5">
            {isAdmin && (
              <>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => onEdit(task)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost" size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => { if (confirm("Excluir esta tarefa?")) { onDelete(task.id); onClose(); } }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Pipeline steps */}
        {canChangeStatus && (
          <div className="flex items-center gap-2 mt-4">
            {statusOrder.map((s, i) => {
              const cfg = columnConfig[s];
              const isActive = task.status === s;
              const Icon = cfg.icon;
              return (
                <div key={s} className="flex items-center gap-2">
                  {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />}
                  <button
                    onClick={() => { if (!isActive) onStatusChange(task.id, s); }}
                    className={`pipeline-step flex items-center gap-1.5 ${isActive ? `active ${cfg.pipelineColor} shadow-lg` : "inactive"}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {cfg.label}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="px-6 py-5">
          {/* Info grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">Responsável</span>
              {assignee ? (
                <div className="flex items-center gap-2">
                  <div className={`h-7 w-7 rounded-full bg-gradient-to-br ${getAvatarColor(assignee.id)} flex items-center justify-center shadow-sm`}>
                    <span className="text-[9px] font-bold text-white">{getInitials(assignee.name)}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{assignee.name}</p>
                    <p className="text-[10px] text-muted-foreground">{assignee.role === "admin" ? "Admin" : "Colaborador"}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground/50">
                  <UserCircle className="h-5 w-5" />
                  <span className="text-sm italic">Não atribuído</span>
                </div>
              )}
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">Criado por</span>
              {creator ? (
                <div className="flex items-center gap-2">
                  <div className={`h-7 w-7 rounded-full bg-gradient-to-br ${getAvatarColor(creator.id)} flex items-center justify-center shadow-sm`}>
                    <span className="text-[9px] font-bold text-white">{getInitials(creator.name)}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{creator.name}</p>
                    <p className="text-[10px] text-muted-foreground">{formatDate(task.createdAt)}</p>
                  </div>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground/50">—</span>
              )}
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">Prazo</span>
              <p className={`text-sm font-medium ${dueInfo.urgency === "overdue" ? "text-red-400" : dueInfo.urgency === "today" ? "text-amber-400" : "text-foreground"}`}>
                {task.dueDate ? new Date(task.dueDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }) : "Sem prazo"}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">Pontos</span>
              <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-primary" />
                {task.pointsAwarded > 0 ? `+${task.pointsAwarded} pontos` : "Pendente"}
              </p>
            </div>
          </div>

          {/* Description */}
          {task.description && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-muted-foreground/50" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">Descrição</span>
              </div>
              <div className="p-3 rounded-xl bg-muted/10 border border-border/20">
                <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{task.description}</p>
              </div>
            </div>
          )}

          <Separator className="mb-5 bg-border/20" />

          {/* Tabs: Comments + Activity */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-muted/20 border border-border/20 mb-4">
              <TabsTrigger value="comments" className="gap-1.5 text-xs data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
                <MessageSquare className="h-3.5 w-3.5" />
                Comentários
                {comments && comments.length > 0 && (
                  <span className="ml-1 text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-bold">{comments.length}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="activity" className="gap-1.5 text-xs data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
                <History className="h-3.5 w-3.5" />
                Atividades
              </TabsTrigger>
            </TabsList>

            <TabsContent value="comments" className="mt-0">
              {/* Add comment */}
              <div className="mb-4">
                <div className="flex items-start gap-3">
                  <div className={`h-8 w-8 rounded-full bg-gradient-to-br ${user ? getAvatarColor(user.id) : "from-slate-500 to-slate-600"} flex items-center justify-center shadow-sm shrink-0 mt-0.5`}>
                    <span className="text-[9px] font-bold text-white">{getInitials(user?.name)}</span>
                  </div>
                  <div className="flex-1 space-y-2">
                    <Textarea
                      ref={commentInputRef}
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Escreva um comentário..."
                      rows={2}
                      className="bg-muted/10 border-border/20 text-sm resize-none focus-visible:ring-primary/30"
                      onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAddComment(); }}
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground/40">Ctrl+Enter para enviar</span>
                      <Button
                        size="sm"
                        className="h-7 text-xs px-3 glow-primary"
                        onClick={handleAddComment}
                        disabled={!commentText.trim() || addCommentMutation.isPending}
                      >
                        <Send className="h-3 w-3 mr-1" />
                        Enviar
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comments list */}
              {commentsLoading ? (
                <div className="space-y-3">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
              ) : comments && comments.length > 0 ? (
                <div className="space-y-3">
                  {comments.map((c) => (
                    <div key={c.id} className="flex items-start gap-3">
                      <div className={`h-7 w-7 rounded-full bg-gradient-to-br ${getAvatarColor(c.userId)} flex items-center justify-center shadow-sm shrink-0 mt-0.5`}>
                        <span className="text-[8px] font-bold text-white">{getInitials(c.userName)}</span>
                      </div>
                      <div className="flex-1">
                        <div className="comment-bubble px-3 py-2.5">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-foreground">{c.userName ?? "Usuário"}</span>
                            <span className="text-[10px] text-muted-foreground/40">{formatDate(c.createdAt)}</span>
                          </div>
                          <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{c.content}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground/30">
                  <MessageSquare className="h-8 w-8 mb-2" />
                  <span className="text-xs">Nenhum comentário ainda</span>
                </div>
              )}
            </TabsContent>

            <TabsContent value="activity" className="mt-0">
              {activitiesLoading ? (
                <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
              ) : activities && activities.length > 0 ? (
                <div className="space-y-1">
                  {activities.map((a) => {
                    const actionIcons: Record<string, typeof Circle> = {
                      created: Plus, status_changed: ArrowRight, updated: Pencil,
                      deleted: Trash2, commented: MessageSquare, earned_badge: Sparkles,
                    };
                    const ActionIcon = actionIcons[a.action] ?? Circle;
                    const actionColors: Record<string, string> = {
                      created: "text-emerald-400 bg-emerald-500/15", status_changed: "text-blue-400 bg-blue-500/15",
                      updated: "text-amber-400 bg-amber-500/15", deleted: "text-red-400 bg-red-500/15",
                      commented: "text-purple-400 bg-purple-500/15", earned_badge: "text-primary bg-primary/15",
                    };
                    const colorClass = actionColors[a.action] ?? "text-muted-foreground bg-muted/20";

                    return (
                      <div key={a.id} className="activity-timeline-item py-2.5">
                        <div className={`absolute left-0 top-2.5 h-5 w-5 rounded-full flex items-center justify-center ${colorClass}`}>
                          <ActionIcon className="h-2.5 w-2.5" />
                        </div>
                        <div>
                          <p className="text-sm text-foreground/80">{a.details}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-muted-foreground/40">{a.userName ?? "Sistema"}</span>
                            <span className="text-[10px] text-muted-foreground/30">·</span>
                            <span className="text-[10px] text-muted-foreground/40">{formatDate(a.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground/30">
                  <History className="h-8 w-8 mb-2" />
                  <span className="text-xs">Nenhuma atividade registrada</span>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </motion.div>
  );
}

// ==================== CARD VIEW ====================
function CardView({
  tasks,
  onTaskClick,
}: {
  tasks: TaskItem[];
  onTaskClick: (task: TaskItem) => void;
}) {
  const grouped = useMemo(() => {
    const g: Record<TaskStatus, TaskItem[]> = { pending: [], in_progress: [], completed: [] };
    for (const t of tasks) g[t.status]?.push(t);
    return g;
  }, [tasks]);

  return (
    <div className="space-y-8">
      {statusOrder.map((status) => {
        const cfg = columnConfig[status];
        const Icon = cfg.icon;
        const items = grouped[status];
        if (items.length === 0) return null;

        return (
          <div key={status}>
            <div className="flex items-center gap-2.5 mb-4">
              <div className={`h-7 w-7 rounded-lg bg-gradient-to-br ${cfg.gradient} flex items-center justify-center`}>
                <Icon className="h-3.5 w-3.5 text-white" />
              </div>
              <h3 className="text-sm font-bold text-foreground">{cfg.label}</h3>
              <span className="text-xs text-muted-foreground/50 font-medium">({items.length})</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <AnimatePresence mode="popLayout">
                {items.map((task) => {
                  const pc = priorityConfig[task.priority];
                  const PIcon = pc.icon;
                  const dueInfo = getDueDateInfo(task.dueDate, task.status);
                  return (
                    <motion.div
                      key={task.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="kanban-card-premium cursor-pointer group"
                      onClick={() => onTaskClick(task)}
                    >
                      <div className={`absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r ${cfg.gradient}`} />
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className={`text-sm font-semibold leading-snug ${task.status === "completed" ? "line-through text-muted-foreground/60" : "text-foreground"}`}>
                            {task.title}
                          </h4>
                          <span className="text-[10px] text-muted-foreground/30 font-mono">#{task.id}</span>
                        </div>
                        {task.description && (
                          <p className="text-xs text-muted-foreground/60 line-clamp-2 mb-3">{task.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${pc.bg} ${pc.border} ${pc.color}`}>
                            <PIcon className="h-2.5 w-2.5" />{pc.label}
                          </span>
                          {dueInfo.urgency !== "none" && (
                            <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${dueInfo.bg} ${dueInfo.color}`}>
                              <Calendar className="h-2.5 w-2.5" />{dueInfo.label}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ==================== MAIN COMPONENT ====================
export default function Tasks() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const isAdmin = user?.role === "admin";

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<number | null>(null);
  const [form, setForm] = useState<TaskForm>(emptyForm);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterAssignee, setFilterAssignee] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading } = trpc.tasks.list.useQuery({});
  const { data: allUsers } = trpc.users.list.useQuery();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const filteredTasks = useMemo(() => {
    if (!data?.tasks) return [];
    return data.tasks.filter((task) => {
      if (filterPriority !== "all" && task.priority !== filterPriority) return false;
      if (filterAssignee !== "all" && task.assigneeId?.toString() !== filterAssignee) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!task.title.toLowerCase().includes(q) && !(task.description?.toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [data, filterPriority, filterAssignee, searchQuery]);

  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, TaskItem[]> = { pending: [], in_progress: [], completed: [] };
    for (const task of filteredTasks) grouped[task.status]?.push(task);
    return grouped;
  }, [filteredTasks]);

  const hasActiveFilters = filterPriority !== "all" || filterAssignee !== "all" || searchQuery !== "";

  const createMutation = trpc.tasks.create.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      utils.dashboard.stats.invalidate();
      utils.activity.list.invalidate();
      setDialogOpen(false);
      setForm(emptyForm);
      toast.success("Tarefa criada com sucesso!");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.tasks.update.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      utils.dashboard.stats.invalidate();
      utils.activity.list.invalidate();
      setDialogOpen(false);
      setEditingTask(null);
      setForm(emptyForm);
      toast.success("Tarefa atualizada!");
    },
    onError: (err) => toast.error(err.message),
  });

  const statusMutation = trpc.tasks.updateStatus.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      utils.dashboard.stats.invalidate();
      utils.gamification.ranking.invalidate();
      utils.gamification.myBadges.invalidate();
      utils.activity.list.invalidate();
      toast.success("Status atualizado!");
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.tasks.delete.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      utils.dashboard.stats.invalidate();
      utils.activity.list.invalidate();
      setSelectedTask(null);
      toast.success("Tarefa excluída!");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = () => {
    if (!form.title.trim()) { toast.error("Título é obrigatório"); return; }
    const payload = {
      title: form.title,
      description: form.description || undefined,
      priority: form.priority,
      assigneeId: form.assigneeId ? parseInt(form.assigneeId) : undefined,
      dueDate: form.dueDate ? new Date(form.dueDate).getTime() : undefined,
    };
    if (editingTask) updateMutation.mutate({ id: editingTask, ...payload });
    else createMutation.mutate(payload);
  };

  const openEdit = (task: TaskItem) => {
    setEditingTask(task.id);
    setForm({
      title: task.title, description: task.description ?? "", priority: task.priority,
      assigneeId: task.assigneeId?.toString() ?? "",
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : "",
    });
    setSelectedTask(null);
    setDialogOpen(true);
  };

  const openCreate = () => { setEditingTask(null); setForm(emptyForm); setDialogOpen(true); };

  // ===== DND Handlers =====
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    setOverId(over ? (over.id as string) : null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    setOverId(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = parseInt((active.id as string).replace("task-", ""));
    const task = data?.tasks.find(t => t.id === taskId);
    if (!task) return;

    let targetStatus: TaskStatus | null = null;

    // Check if dropped on a column
    const overId = over.id as string;
    if (["pending", "in_progress", "completed"].includes(overId)) {
      targetStatus = overId as TaskStatus;
    } else if (overId.startsWith("task-")) {
      // Dropped on another task — find that task's status
      const overTaskId = parseInt(overId.replace("task-", ""));
      const overTask = data?.tasks.find(t => t.id === overTaskId);
      if (overTask) targetStatus = overTask.status;
    }

    if (targetStatus && targetStatus !== task.status) {
      statusMutation.mutate({ id: taskId, status: targetStatus });
    }
  };

  const activeTask = activeId ? data?.tasks.find(t => t.id === parseInt(activeId.replace("task-", ""))) : null;
  const totalTasks = data?.tasks?.length ?? 0;

  if (isLoading) {
    return (
      <div className="space-y-6 p-1">
        <div className="flex items-center justify-between"><Skeleton className="h-10 w-64" /><Skeleton className="h-10 w-36" /></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[...Array(3)].map((_, i) => (<div key={i} className="space-y-3"><Skeleton className="h-12 rounded-xl" /><Skeleton className="h-32 rounded-xl" /><Skeleton className="h-32 rounded-xl" /></div>))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 h-full p-1">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Tarefas</h1>
              <p className="text-muted-foreground text-sm">
                {totalTasks} tarefa{totalTasks !== 1 ? "s" : ""} no total
                {hasActiveFilters && ` · ${filteredTasks.length} filtrada${filteredTasks.length !== 1 ? "s" : ""}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center bg-muted/15 border border-border/20 rounded-lg p-0.5">
              <button
                className={`view-toggle-btn flex items-center gap-1.5 ${viewMode === "kanban" ? "active" : ""}`}
                onClick={() => setViewMode("kanban")}
              >
                <Columns3 className="h-3.5 w-3.5" /> Kanban
              </button>
              <button
                className={`view-toggle-btn flex items-center gap-1.5 ${viewMode === "cards" ? "active" : ""}`}
                onClick={() => setViewMode("cards")}
              >
                <LayoutGrid className="h-3.5 w-3.5" /> Cards
              </button>
            </div>
            <Button
              variant={showFilters ? "secondary" : "outline"}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={`relative ${hasActiveFilters ? "border-primary/40 text-primary" : ""}`}
            >
              <Filter className="h-4 w-4 mr-2" />Filtros
              {hasActiveFilters && (
                <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-primary text-[9px] font-bold text-primary-foreground flex items-center justify-center">
                  {(filterPriority !== "all" ? 1 : 0) + (filterAssignee !== "all" ? 1 : 0) + (searchQuery ? 1 : 0)}
                </span>
              )}
            </Button>
            {isAdmin && (
              <Button onClick={openCreate} className="shadow-lg glow-primary font-semibold gap-2">
                <Plus className="h-4 w-4" />Nova Tarefa
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-card/50 border border-border/30">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar tarefas..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9 bg-muted/30 border-border/30" />
                  {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80"><X className="h-3 w-3" /></button>}
                </div>
                <Select value={filterPriority} onValueChange={setFilterPriority}>
                  <SelectTrigger className="w-[150px] h-9 bg-muted/30 border-border/30"><SelectValue placeholder="Prioridade" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="low">Baixa</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterAssignee} onValueChange={setFilterAssignee}>
                  <SelectTrigger className="w-[170px] h-9 bg-muted/30 border-border/30"><SelectValue placeholder="Responsável" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {allUsers?.map((u) => <SelectItem key={u.id} value={u.id.toString()}>{u.name ?? u.email ?? `User #${u.id}`}</SelectItem>)}
                  </SelectContent>
                </Select>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={() => { setFilterPriority("all"); setFilterAssignee("all"); setSearchQuery(""); }} className="text-muted-foreground hover:text-foreground">
                    <X className="h-3.5 w-3.5 mr-1" />Limpar
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Content */}
      {viewMode === "kanban" ? (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {statusOrder.map((status) => {
              const col = columnConfig[status];
              const colTasks = tasksByStatus[status];
              const Icon = col.icon;
              const isColumnOver = overId === status;

              return (
                <div key={status} className={`kanban-column-premium flex flex-col ${isColumnOver ? "drag-over" : ""}`}>
                  <div className={`${col.headerBg} rounded-t-xl px-4 py-3 border-b border-border/20`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={`h-7 w-7 rounded-lg bg-gradient-to-br ${col.gradient} flex items-center justify-center shadow-sm`}>
                          <Icon className="h-3.5 w-3.5 text-white" />
                        </div>
                        <div>
                          <span className="text-sm font-bold text-foreground">{col.label}</span>
                          <div><span className="text-[10px] text-muted-foreground font-medium">{colTasks.length} tarefa{colTasks.length !== 1 ? "s" : ""}</span></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <SortableContext items={colTasks.map(t => `task-${t.id}`)} strategy={verticalListSortingStrategy}>
                    <DroppableColumn id={status} isOver={isColumnOver}>
                      <AnimatePresence mode="popLayout">
                        {colTasks.map((task) => (
                          <SortableTaskCard key={task.id} task={task} onClick={() => setSelectedTask(task)} />
                        ))}
                      </AnimatePresence>
                      {colTasks.length === 0 && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-32 text-muted-foreground/30 border border-dashed border-border/20 rounded-xl gap-2">
                          <col.emptyIcon className="h-8 w-8" />
                          <span className="text-xs font-medium">{col.emptyText}</span>
                          <span className="text-[10px]">Arraste tarefas aqui</span>
                        </motion.div>
                      )}
                    </DroppableColumn>
                  </SortableContext>
                </div>
              );
            })}
          </div>

          <DragOverlay>
            {activeTask && (
              <div className="kanban-card-premium kanban-card-overlay w-[320px]">
                <div className={`absolute top-0 left-0 w-1 h-full rounded-l-xl ${
                  activeTask.priority === "urgent" ? "bg-red-500" : activeTask.priority === "high" ? "bg-orange-500" : activeTask.priority === "medium" ? "bg-blue-500" : "bg-slate-500"
                }`} />
                <div className="pl-4 pr-3 py-3">
                  <h4 className="text-[13px] font-semibold">{activeTask.title}</h4>
                </div>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      ) : (
        <CardView tasks={filteredTasks} onTaskClick={setSelectedTask} />
      )}

      {/* Task Detail Panel */}
      <AnimatePresence>
        {selectedTask && (
          <TaskDetailPanel
            task={selectedTask}
            isAdmin={isAdmin}
            allUsers={allUsers}
            onClose={() => setSelectedTask(null)}
            onEdit={openEdit}
            onStatusChange={(id, status) => {
              statusMutation.mutate({ id, status });
              setSelectedTask({ ...selectedTask, status });
            }}
            onDelete={(id) => deleteMutation.mutate({ id })}
          />
        )}
      </AnimatePresence>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg border-border/30 bg-card/95 backdrop-blur-xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${editingTask ? "bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border border-blue-500/20" : "bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20"}`}>
                {editingTask ? <Pencil className="h-5 w-5 text-blue-400" /> : <Plus className="h-5 w-5 text-primary" />}
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">{editingTask ? "Editar Tarefa" : "Nova Tarefa"}</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">{editingTask ? "Atualize os dados da tarefa" : "Preencha os dados para criar uma nova tarefa"}</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-5 py-3">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Título *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Revisar relatório mensal" className="bg-muted/20 border-border/30 h-11 text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Descrição</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descreva os detalhes..." rows={3} className="bg-muted/20 border-border/30 text-sm resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Prioridade</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as Priority })}>
                  <SelectTrigger className="bg-muted/20 border-border/30 h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low"><span className="flex items-center gap-2"><ArrowDown className="h-3.5 w-3.5 text-slate-400" /> Baixa</span></SelectItem>
                    <SelectItem value="medium"><span className="flex items-center gap-2"><ArrowRight className="h-3.5 w-3.5 text-blue-400" /> Média</span></SelectItem>
                    <SelectItem value="high"><span className="flex items-center gap-2"><ArrowUp className="h-3.5 w-3.5 text-orange-400" /> Alta</span></SelectItem>
                    <SelectItem value="urgent"><span className="flex items-center gap-2"><Flame className="h-3.5 w-3.5 text-red-400" /> Urgente</span></SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Responsável</Label>
                <Select value={form.assigneeId} onValueChange={(v) => setForm({ ...form, assigneeId: v })}>
                  <SelectTrigger className="bg-muted/20 border-border/30 h-11"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    {allUsers?.map((u) => (
                      <SelectItem key={u.id} value={u.id.toString()}>
                        <span className="flex items-center gap-2">
                          <div className={`h-5 w-5 rounded-full bg-gradient-to-br ${getAvatarColor(u.id)} flex items-center justify-center`}>
                            <span className="text-[8px] font-bold text-white">{getInitials(u.name)}</span>
                          </div>
                          {u.name ?? u.email ?? `User #${u.id}`}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Prazo</Label>
              <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="bg-muted/20 border-border/30 h-11" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-border/30">Cancelar</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} className="glow-primary font-semibold min-w-[120px]">
              {createMutation.isPending || updateMutation.isPending ? (
                <span className="flex items-center gap-2"><span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />Salvando...</span>
              ) : editingTask ? "Salvar" : "Criar Tarefa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
