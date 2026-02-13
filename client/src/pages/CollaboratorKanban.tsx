import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowLeft, Plus, Pencil, Trash2, Calendar, AlertTriangle,
  Clock, CheckCircle2, Circle, Flame, Zap, ArrowUp, ArrowRight,
  ArrowDown, Timer, Search, X, MessageSquare, History, Send,
  Columns3, LayoutGrid, UserCircle, FileText, Tag, ChevronRight,
  Eye, CalendarDays, Hash, MoreHorizontal, TrendingUp, Target,
} from "lucide-react";
import { useState, useMemo, useCallback, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext, DragOverlay, closestCorners, MouseSensor, TouchSensor,
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
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

// ==================== CONSTANTS ====================
const statusConfig: Record<TaskStatus, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  pending: { label: "Pendentes", icon: Circle, color: "text-orange-500", bg: "bg-orange-500/10" },
  in_progress: { label: "Em Andamento", icon: Clock, color: "text-blue-500", bg: "bg-blue-500/10" },
  completed: { label: "Concluídas", icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
};

const priorityConfig: Record<Priority, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  low: { label: "Baixa", icon: ArrowDown, color: "text-slate-400", bg: "bg-slate-400/10" },
  medium: { label: "Média", icon: ArrowRight, color: "text-blue-400", bg: "bg-blue-400/10" },
  high: { label: "Alta", icon: ArrowUp, color: "text-orange-400", bg: "bg-orange-400/10" },
  urgent: { label: "Urgente", icon: Flame, color: "text-red-400", bg: "bg-red-400/10" },
};

const statusOrder: TaskStatus[] = ["pending", "in_progress", "completed"];

// ==================== KANBAN CARD ====================
function SortableTaskCard({ task, onClick }: { task: TaskItem; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id.toString(),
    data: { type: "task", task },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || undefined,
    opacity: isDragging ? 0.4 : 1,
  };

  const pCfg = priorityConfig[task.priority];
  const PIcon = pCfg.icon;
  const isOverdue = task.dueDate && task.status !== "completed" && task.dueDate < Date.now();
  const isDueSoon = task.dueDate && task.status !== "completed" && !isOverdue && (task.dueDate - Date.now()) < 86400000;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest("[data-no-click]")) onClick();
      }}
      className="group kanban-card-premium rounded-xl bg-card/90 border border-border/30 p-4 cursor-pointer hover:border-primary/30 hover:shadow-md transition-all duration-150"
    >
      {/* Priority + ID */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${pCfg.bg} ${pCfg.color}`}>
            <PIcon className="h-3 w-3" />
            {pCfg.label}
          </div>
          {isOverdue && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4 animate-pulse">
              Atrasada
            </Badge>
          )}
          {isDueSoon && !isOverdue && (
            <Badge className="text-[10px] px-1.5 py-0 h-4 bg-amber-500/20 text-amber-400 border-0">
              Vence hoje
            </Badge>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground font-mono">#{task.id}</span>
      </div>

      {/* Title */}
      <h4 className="font-medium text-sm leading-snug mb-1.5 line-clamp-2 group-hover:text-primary transition-colors">
        {task.title}
      </h4>

      {/* Description */}
      {task.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{task.description}</p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/20">
        {task.dueDate ? (
          <span className={`flex items-center gap-1 text-[11px] ${isOverdue ? "text-red-400" : "text-muted-foreground"}`}>
            <Calendar className="h-3 w-3" />
            {new Date(task.dueDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
          </span>
        ) : (
          <span className="text-[11px] text-muted-foreground/50">Sem prazo</span>
        )}
        {task.pointsAwarded > 0 && (
          <span className="flex items-center gap-0.5 text-[11px] font-semibold text-primary">
            <Zap className="h-3 w-3" /> {task.pointsAwarded}
          </span>
        )}
      </div>
    </div>
  );
}

// ==================== DROPPABLE COLUMN ====================
function DroppableColumn({
  status,
  tasks,
  onCardClick,
}: {
  status: TaskStatus;
  tasks: TaskItem[];
  onCardClick: (task: TaskItem) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `column-${status}` });
  const cfg = statusConfig[status];
  const Icon = cfg.icon;

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-xl border transition-all duration-150 min-h-[300px] ${
        isOver ? "border-primary/50 bg-primary/5 shadow-lg shadow-primary/10" : "border-border/20 bg-card/30"
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center gap-2 p-3 border-b border-border/20">
        <div className={`h-7 w-7 rounded-lg ${cfg.bg} flex items-center justify-center`}>
          <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
        </div>
        <span className="font-semibold text-sm">{cfg.label}</span>
        <Badge variant="secondary" className="ml-auto text-xs h-5 px-2 bg-muted/50">
          {tasks.length}
        </Badge>
      </div>

      {/* Cards */}
      <SortableContext items={tasks.map(t => t.id.toString())} strategy={verticalListSortingStrategy}>
        <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-300px)]">
          {tasks.map(task => (
            <SortableTaskCard key={task.id} task={task} onClick={() => onCardClick(task)} />
          ))}
          {tasks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground/40">
              <Icon className="h-8 w-8 mb-2" />
              <p className="text-xs">Nenhuma tarefa</p>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

// ==================== OVERLAY CARD ====================
function DragOverlayCard({ task }: { task: TaskItem }) {
  const pCfg = priorityConfig[task.priority];
  const PIcon = pCfg.icon;
  return (
    <div className="rounded-xl bg-card border border-primary/40 p-4 shadow-2xl shadow-primary/20 w-[280px] rotate-2">
      <div className="flex items-center gap-2 mb-2">
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${pCfg.bg} ${pCfg.color}`}>
          <PIcon className="h-3 w-3" /> {pCfg.label}
        </div>
      </div>
      <h4 className="font-medium text-sm">{task.title}</h4>
    </div>
  );
}

// ==================== MAIN COMPONENT ====================
export default function CollaboratorKanban() {
  const { user } = useAuth();
  const params = useParams<{ userId: string }>();
  const userId = parseInt(params.userId || "0", 10);
  const [, setLocation] = useLocation();

  const [viewMode, setViewMode] = useState<"kanban" | "tabs">("tabs");
  const [activeTab, setActiveTab] = useState<TaskStatus>("pending");
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Form state
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPriority, setNewPriority] = useState<Priority>("medium");
  const [newDueDate, setNewDueDate] = useState("");

  // Comment state
  const [commentText, setCommentText] = useState("");
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  // Data
  const { data: collabUser } = trpc.users.getById.useQuery({ id: userId });
  const { data: allTasks, isLoading } = trpc.tasks.list.useQuery({ assigneeId: userId });
  const { data: allUsers } = trpc.users.list.useQuery();
  const utils = trpc.useUtils();

  // Comments & activities for selected task
  const { data: comments } = trpc.tasks.comments.useQuery(
    { taskId: selectedTask?.id ?? 0 },
    { enabled: !!selectedTask }
  );
  const { data: activities } = trpc.tasks.activities.useQuery(
    { taskId: selectedTask?.id ?? 0 },
    { enabled: !!selectedTask }
  );

  // Mutations
  const createMutation = trpc.tasks.create.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      utils.collaborators.listWithStats.invalidate();
      setShowCreateDialog(false);
      setNewTitle(""); setNewDesc(""); setNewPriority("medium"); setNewDueDate("");
      toast.success("Tarefa criada com sucesso!");
    },
    onError: (err) => toast.error(err.message),
  });

  const statusMutation = trpc.tasks.updateStatus.useMutation({
    onMutate: async ({ id, status }) => {
      await utils.tasks.list.cancel();
      const prev = utils.tasks.list.getData({ assigneeId: userId });
      if (prev) {
        const prevTasks = Array.isArray(prev) ? prev : (prev as any).tasks ?? [];
        const updated = prevTasks.map((t: any) => t.id === id ? { ...t, status } : t);
        const newData = Array.isArray(prev) ? updated : { ...(prev as any), tasks: updated };
        utils.tasks.list.setData({ assigneeId: userId }, newData as any);
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) utils.tasks.list.setData({ assigneeId: userId }, ctx.prev as any);
      toast.error("Erro ao atualizar status");
    },
    onSettled: () => {
      utils.tasks.list.invalidate();
      utils.collaborators.listWithStats.invalidate();
    },
  });

  const deleteMutation = trpc.tasks.delete.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      utils.collaborators.listWithStats.invalidate();
      setSelectedTask(null);
      toast.success("Tarefa excluída!");
    },
    onError: (err) => toast.error(err.message),
  });

  const addCommentMutation = trpc.tasks.addComment.useMutation({
    onSuccess: () => {
      utils.tasks.comments.invalidate();
      setCommentText("");
      toast.success("Comentário adicionado!");
    },
    onError: (err) => toast.error(err.message),
  });

  const reorderMutation = trpc.tasks.reorder.useMutation({
    onError: () => toast.error("Erro ao reordenar"),
  });

  // DnD
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  );

  const tasks = useMemo(() => {
    if (!allTasks) return [] as TaskItem[];
    const arr = Array.isArray(allTasks) ? allTasks : (allTasks as any).tasks ?? [];
    return arr as TaskItem[];
  }, [allTasks]);

  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(t => t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q));
    }
    if (priorityFilter !== "all") {
      result = result.filter(t => t.priority === priorityFilter);
    }
    return result;
  }, [tasks, search, priorityFilter]);

  const tasksByStatus = useMemo(() => {
    const map: Record<TaskStatus, TaskItem[]> = { pending: [], in_progress: [], completed: [] };
    filteredTasks.forEach(t => map[t.status]?.push(t));
    Object.values(map).forEach(arr => arr.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)));
    return map;
  }, [filteredTasks]);

  // Local state for DnD
  const [localOverrides, setLocalOverrides] = useState<Record<number, TaskStatus>>({});

  const displayTasksByStatus = useMemo(() => {
    const map: Record<TaskStatus, TaskItem[]> = { pending: [], in_progress: [], completed: [] };
    filteredTasks.forEach(t => {
      const status = localOverrides[t.id] || t.status;
      map[status]?.push(t);
    });
    Object.values(map).forEach(arr => arr.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)));
    return map;
  }, [filteredTasks, localOverrides]);

  const findContainer = useCallback((id: string): TaskStatus | null => {
    if (id.startsWith("column-")) return id.replace("column-", "") as TaskStatus;
    for (const status of statusOrder) {
      if (displayTasksByStatus[status].some(t => t.id.toString() === id)) return status;
    }
    return null;
  }, [displayTasksByStatus]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id.toString());
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeContainer = findContainer(active.id.toString());
    const overContainer = findContainer(over.id.toString());
    if (!activeContainer || !overContainer || activeContainer === overContainer) return;
    const taskId = parseInt(active.id.toString(), 10);
    setLocalOverrides(prev => ({ ...prev, [taskId]: overContainer }));
  }, [findContainer]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) {
      setLocalOverrides({});
      return;
    }

    const taskId = parseInt(active.id.toString(), 10);
    const targetContainer = findContainer(over.id.toString());

    if (!targetContainer) {
      setLocalOverrides({});
      return;
    }

    const task = tasks.find(t => t.id === taskId);
    if (task && task.status !== targetContainer) {
      statusMutation.mutate({ id: taskId, status: targetContainer });
    }

    setLocalOverrides({});
  }, [findContainer, tasks, statusMutation]);

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    setLocalOverrides({});
  }, []);

  const activeTask = activeId ? tasks.find(t => t.id.toString() === activeId) : null;

  const initials = (collabUser?.name || "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  const isAdmin = user?.role === "admin";

  // ==================== DETAIL PANEL ====================
  const renderDetailPanel = () => {
    if (!selectedTask) return null;
    const task = tasks.find(t => t.id === selectedTask.id) || selectedTask;
    const pCfg = priorityConfig[task.priority];
    const PIcon = pCfg.icon;
    const sCfg = statusConfig[task.status];
    const SIcon = sCfg.icon;
    const creator = allUsers?.find(u => u.id === task.createdById);

    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedTask(null)} />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="relative ml-auto w-full max-w-2xl bg-card border-l border-border/30 h-full overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-5 border-b border-border/30">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground font-mono">#{task.id}</span>
                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm("Excluir esta tarefa?")) deleteMutation.mutate({ id: task.id });
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Excluir
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedTask(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <h2 className="text-xl font-bold mb-3">{task.title}</h2>

              {/* Status Pipeline */}
              <div className="flex items-center gap-1 mb-4">
                {statusOrder.map((s, i) => {
                  const cfg = statusConfig[s];
                  const Icon = cfg.icon;
                  const isCurrent = task.status === s;
                  const isPast = statusOrder.indexOf(task.status) > i;
                  return (
                    <button
                      key={s}
                      onClick={() => statusMutation.mutate({ id: task.id, status: s })}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        isCurrent ? `${cfg.bg} ${cfg.color} ring-1 ring-current/30` :
                        isPast ? "bg-muted/30 text-muted-foreground" :
                        "bg-muted/10 text-muted-foreground/50 hover:bg-muted/20"
                      }`}
                    >
                      <Icon className="h-3 w-3" />
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Content */}
            <ScrollArea className="flex-1">
              <div className="p-5 space-y-5">
                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-muted/10 p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Prioridade</p>
                    <div className={`flex items-center gap-1.5 ${pCfg.color}`}>
                      <PIcon className="h-4 w-4" />
                      <span className="text-sm font-medium">{pCfg.label}</span>
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted/10 p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Prazo</p>
                    <div className="flex items-center gap-1.5 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString("pt-BR") : "Sem prazo"}
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted/10 p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Criado por</p>
                    <p className="text-sm">{creator?.name || "—"}</p>
                  </div>
                  <div className="rounded-lg bg-muted/10 p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Pontos</p>
                    <div className="flex items-center gap-1 text-primary">
                      <Zap className="h-4 w-4" />
                      <span className="text-sm font-bold">{task.pointsAwarded}</span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {task.description && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Descrição</h4>
                    <p className="text-sm leading-relaxed bg-muted/10 rounded-lg p-3">{task.description}</p>
                  </div>
                )}

                <Separator className="bg-border/20" />

                {/* Comments */}
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5" /> Comentários
                  </h4>

                  {/* Comment Input */}
                  <div className="flex gap-2 mb-4">
                    <Textarea
                      ref={commentInputRef}
                      placeholder="Escreva um comentário..."
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      className="min-h-[60px] bg-muted/10 border-border/20 text-sm resize-none"
                      onKeyDown={e => {
                        if (e.key === "Enter" && !e.shiftKey && commentText.trim()) {
                          e.preventDefault();
                          addCommentMutation.mutate({ taskId: task.id, content: commentText.trim() });
                        }
                      }}
                    />
                    <Button
                      size="icon"
                      className="h-10 w-10 shrink-0"
                      disabled={!commentText.trim() || addCommentMutation.isPending}
                      onClick={() => {
                        if (commentText.trim()) {
                          addCommentMutation.mutate({ taskId: task.id, content: commentText.trim() });
                        }
                      }}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Comments List */}
                  <div className="space-y-3">
                    {comments?.map((c: any) => (
                      <div key={c.id} className="rounded-lg bg-muted/10 p-3">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-[10px] bg-primary/15 text-primary">
                              {(c.userName || "?")[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-medium">{c.userName || "Anônimo"}</span>
                          <span className="text-[10px] text-muted-foreground ml-auto">
                            {new Date(c.createdAt).toLocaleString("pt-BR")}
                          </span>
                        </div>
                        <p className="text-sm pl-8">{c.content}</p>
                      </div>
                    ))}
                    {(!comments || comments.length === 0) && (
                      <p className="text-xs text-muted-foreground/50 text-center py-4">Nenhum comentário ainda</p>
                    )}
                  </div>
                </div>

                <Separator className="bg-border/20" />

                {/* Activity Timeline */}
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <History className="h-3.5 w-3.5" /> Histórico
                  </h4>
                  <div className="space-y-2">
                    {activities?.map((a: any) => (
                      <div key={a.id} className="flex items-start gap-2 text-xs">
                        <div className="h-5 w-5 rounded-full bg-muted/20 flex items-center justify-center mt-0.5 shrink-0">
                          <History className="h-2.5 w-2.5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-muted-foreground">{a.details}</p>
                          <p className="text-[10px] text-muted-foreground/50">
                            {new Date(a.createdAt).toLocaleString("pt-BR")}
                          </p>
                        </div>
                      </div>
                    ))}
                    {(!activities || activities.length === 0) && (
                      <p className="text-xs text-muted-foreground/50 text-center py-4">Nenhuma atividade registrada</p>
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  };

  // ==================== RENDER ====================
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-24 rounded-xl bg-card/50 animate-pulse border border-border/30" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 rounded-xl bg-card/50 animate-pulse border border-border/30" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Back + User Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => setLocation("/kanban")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Avatar className="h-12 w-12 border-2 border-primary/20">
          <AvatarFallback className="text-sm font-bold bg-primary/15 text-primary">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold truncate">{collabUser?.name || "Colaborador"}</h1>
            {collabUser?.role === "admin" && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-primary/20 text-primary border-0">Admin</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{collabUser?.email || ""}</p>
        </div>

        {/* Stats Summary */}
        <div className="hidden md:flex items-center gap-3">
          {statusOrder.map(s => {
            const cfg = statusConfig[s];
            const Icon = cfg.icon;
            const count = tasksByStatus[s].length;
            return (
              <div key={s} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${cfg.bg}`}>
                <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                <span className={`text-sm font-bold ${cfg.color}`}>{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar tarefa..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-card/80 border-border/30"
          />
        </div>

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[140px] bg-card/80 border-border/30">
            <SelectValue placeholder="Prioridade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="low">Baixa</SelectItem>
            <SelectItem value="medium">Média</SelectItem>
            <SelectItem value="high">Alta</SelectItem>
            <SelectItem value="urgent">Urgente</SelectItem>
          </SelectContent>
        </Select>

        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-card/80 border border-border/30 rounded-lg p-1">
          <button
            onClick={() => setViewMode("tabs")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              viewMode === "tabs" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5 inline mr-1" /> Abas
          </button>
          <button
            onClick={() => setViewMode("kanban")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              viewMode === "kanban" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Columns3 className="h-3.5 w-3.5 inline mr-1" /> Kanban
          </button>
        </div>

        {isAdmin && (
          <Button onClick={() => setShowCreateDialog(true)} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> Nova Tarefa
          </Button>
        )}
      </div>

      {/* TABS VIEW */}
      {viewMode === "tabs" && (
        <div>
          {/* Tab Buttons */}
          <div className="flex items-center gap-1 bg-card/50 border border-border/20 rounded-xl p-1.5 mb-4">
            {statusOrder.map(s => {
              const cfg = statusConfig[s];
              const Icon = cfg.icon;
              const count = tasksByStatus[s].length;
              const isActive = activeTab === s;
              return (
                <button
                  key={s}
                  onClick={() => setActiveTab(s)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? `bg-card border border-border/30 shadow-sm ${cfg.color}`
                      : "text-muted-foreground hover:text-foreground hover:bg-card/50"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{cfg.label}</span>
                  <Badge variant="secondary" className={`text-xs h-5 px-2 ${isActive ? cfg.bg : "bg-muted/30"}`}>
                    {count}
                  </Badge>
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-3"
            >
              {tasksByStatus[activeTab].length === 0 ? (
                <div className="text-center py-16">
                  <div className={`h-14 w-14 rounded-2xl ${statusConfig[activeTab].bg} flex items-center justify-center mx-auto mb-3`}>
                    {(() => { const I = statusConfig[activeTab].icon; return <I className={`h-7 w-7 ${statusConfig[activeTab].color}`} />; })()}
                  </div>
                  <p className="text-muted-foreground">Nenhuma tarefa {statusConfig[activeTab].label.toLowerCase()}</p>
                </div>
              ) : (
                tasksByStatus[activeTab].map(task => {
                  const pCfg = priorityConfig[task.priority];
                  const PIcon = pCfg.icon;
                  const isOverdue = task.dueDate && task.status !== "completed" && task.dueDate < Date.now();

                  return (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className="group rounded-xl bg-card/80 border border-border/30 p-4 cursor-pointer hover:border-primary/30 hover:shadow-md transition-all duration-150 flex items-center gap-4"
                    >
                      {/* Priority indicator */}
                      <div className={`h-10 w-10 rounded-lg ${pCfg.bg} flex items-center justify-center shrink-0`}>
                        <PIcon className={`h-5 w-5 ${pCfg.color}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] text-muted-foreground font-mono">#{task.id}</span>
                          {isOverdue && (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">Atrasada</Badge>
                          )}
                        </div>
                        <h4 className="font-medium text-sm truncate group-hover:text-primary transition-colors">{task.title}</h4>
                        {task.description && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{task.description}</p>
                        )}
                      </div>

                      {/* Meta */}
                      <div className="hidden sm:flex items-center gap-3 shrink-0">
                        {task.dueDate && (
                          <span className={`flex items-center gap-1 text-xs ${isOverdue ? "text-red-400" : "text-muted-foreground"}`}>
                            <Calendar className="h-3 w-3" />
                            {new Date(task.dueDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                          </span>
                        )}
                        {task.pointsAwarded > 0 && (
                          <span className="flex items-center gap-0.5 text-xs font-semibold text-primary">
                            <Zap className="h-3 w-3" /> {task.pointsAwarded}
                          </span>
                        )}
                      </div>

                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                    </div>
                  );
                })
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      {/* KANBAN VIEW */}
      {viewMode === "kanban" && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {statusOrder.map(status => (
              <DroppableColumn
                key={status}
                status={status}
                tasks={displayTasksByStatus[status]}
                onCardClick={setSelectedTask}
              />
            ))}
          </div>
          <DragOverlay>
            {activeTask ? <DragOverlayCard task={activeTask} /> : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-lg bg-card border-border/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Nova Tarefa para {collabUser?.name || "Colaborador"}
            </DialogTitle>
            <DialogDescription>Preencha os detalhes da nova tarefa</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-medium">Título *</Label>
              <Input
                placeholder="Título da tarefa"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                className="mt-1 bg-muted/10 border-border/20"
              />
            </div>
            <div>
              <Label className="text-xs font-medium">Descrição</Label>
              <Textarea
                placeholder="Descreva a tarefa..."
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                className="mt-1 bg-muted/10 border-border/20 min-h-[80px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium">Prioridade</Label>
                <Select value={newPriority} onValueChange={v => setNewPriority(v as Priority)}>
                  <SelectTrigger className="mt-1 bg-muted/10 border-border/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(priorityConfig).map(([key, cfg]) => {
                      const Icon = cfg.icon;
                      return (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                            {cfg.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium">Prazo</Label>
                <Input
                  type="date"
                  value={newDueDate}
                  onChange={e => setNewDueDate(e.target.value)}
                  className="mt-1 bg-muted/10 border-border/20"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreateDialog(false)}>Cancelar</Button>
            <Button
              onClick={() => {
                if (!newTitle.trim()) { toast.error("Título obrigatório"); return; }
                createMutation.mutate({
                  title: newTitle.trim(),
                  description: newDesc.trim() || undefined,
                  priority: newPriority,
                  assigneeId: userId,
                  dueDate: newDueDate ? new Date(newDueDate).getTime() : undefined,
                });
              }}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Criando..." : "Criar Tarefa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Panel */}
      {selectedTask && renderDetailPanel()}
    </div>
  );
}
