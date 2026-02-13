import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Plus, MoreHorizontal, Pencil, Trash2,
  Calendar, User, AlertTriangle, Clock, CheckCircle2, Circle,
  GripVertical, Filter, Flame, Zap, ArrowUp, ArrowRight,
  ArrowDown, Timer, Sparkles, Target, Search, X,
} from "lucide-react";
import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type TaskStatus = "pending" | "in_progress" | "completed";
type Priority = "low" | "medium" | "high" | "urgent";

const columns: {
  id: TaskStatus;
  label: string;
  icon: typeof Circle;
  gradient: string;
  bgGlow: string;
  headerBg: string;
  emptyIcon: typeof Target;
  emptyText: string;
}[] = [
  {
    id: "pending",
    label: "Pendente",
    icon: Circle,
    gradient: "from-amber-500 to-orange-500",
    bgGlow: "shadow-amber-500/5",
    headerBg: "bg-gradient-to-r from-amber-500/10 to-orange-500/5",
    emptyIcon: Target,
    emptyText: "Nenhuma tarefa pendente",
  },
  {
    id: "in_progress",
    label: "Em Andamento",
    icon: Clock,
    gradient: "from-blue-500 to-cyan-500",
    bgGlow: "shadow-blue-500/5",
    headerBg: "bg-gradient-to-r from-blue-500/10 to-cyan-500/5",
    emptyIcon: Zap,
    emptyText: "Nenhuma tarefa em andamento",
  },
  {
    id: "completed",
    label: "Concluída",
    icon: CheckCircle2,
    gradient: "from-emerald-500 to-teal-500",
    bgGlow: "shadow-emerald-500/5",
    headerBg: "bg-gradient-to-r from-emerald-500/10 to-teal-500/5",
    emptyIcon: Sparkles,
    emptyText: "Nenhuma tarefa concluída",
  },
];

const priorityConfig: Record<Priority, {
  label: string;
  icon: typeof ArrowDown;
  color: string;
  bg: string;
  border: string;
  glow: string;
}> = {
  low: {
    label: "Baixa",
    icon: ArrowDown,
    color: "text-slate-400",
    bg: "bg-slate-500/15",
    border: "border-slate-500/20",
    glow: "",
  },
  medium: {
    label: "Média",
    icon: ArrowRight,
    color: "text-blue-400",
    bg: "bg-blue-500/15",
    border: "border-blue-500/20",
    glow: "",
  },
  high: {
    label: "Alta",
    icon: ArrowUp,
    color: "text-orange-400",
    bg: "bg-orange-500/15",
    border: "border-orange-500/20",
    glow: "shadow-[0_0_8px_oklch(0.7_0.18_50/0.15)]",
  },
  urgent: {
    label: "Urgente",
    icon: Flame,
    color: "text-red-400",
    bg: "bg-red-500/15",
    border: "border-red-500/25",
    glow: "shadow-[0_0_12px_oklch(0.65_0.22_25/0.2)]",
  },
};

type TaskForm = {
  title: string;
  description: string;
  priority: Priority;
  assigneeId: string;
  dueDate: string;
};

const emptyForm: TaskForm = {
  title: "",
  description: "",
  priority: "medium",
  assigneeId: "",
  dueDate: "",
};

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

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name.split(" ").map(n => n[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

function getAvatarColor(id: number): string {
  const colors = [
    "from-violet-500 to-purple-600",
    "from-blue-500 to-cyan-600",
    "from-emerald-500 to-teal-600",
    "from-orange-500 to-amber-600",
    "from-pink-500 to-rose-600",
    "from-indigo-500 to-blue-600",
    "from-teal-500 to-green-600",
    "from-fuchsia-500 to-pink-600",
  ];
  return colors[id % colors.length];
}

function getDueDateInfo(dueDate: number | null, status: TaskStatus): {
  label: string;
  urgency: "overdue" | "today" | "soon" | "normal" | "none";
  color: string;
  bg: string;
} {
  if (!dueDate || status === "completed") return { label: "", urgency: "none", color: "", bg: "" };

  const now = Date.now();
  const diff = dueDate - now;
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  const dateStr = new Date(dueDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

  if (diff < 0) {
    const overdueDays = Math.abs(days);
    return {
      label: `${overdueDays}d atrasado`,
      urgency: "overdue",
      color: "text-red-400",
      bg: "bg-red-500/15 border-red-500/30",
    };
  }
  if (days === 0) {
    return { label: "Hoje", urgency: "today", color: "text-amber-400", bg: "bg-amber-500/15 border-amber-500/30" };
  }
  if (days <= 2) {
    return { label: `${days}d restante${days > 1 ? "s" : ""}`, urgency: "soon", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" };
  }
  return { label: dateStr, urgency: "normal", color: "text-muted-foreground", bg: "bg-muted/40 border-border/30" };
}

function TaskCardContent({
  task,
  isAdmin,
  getUserName,
  getUserById,
  onEdit,
  onDelete,
  compact,
}: {
  task: TaskItem;
  isAdmin: boolean;
  getUserName: (id: number | null) => string;
  getUserById: (id: number | null) => { id: number; name: string | null } | null;
  onEdit: (task: TaskItem) => void;
  onDelete: (id: number) => void;
  compact?: boolean;
}) {
  const pc = priorityConfig[task.priority];
  const PriorityIcon = pc.icon;
  const dueInfo = getDueDateInfo(task.dueDate, task.status);
  const assignee = getUserById(task.assigneeId);
  const isCompleted = task.status === "completed";

  return (
    <div className="relative">
      {/* Priority accent line */}
      <div className={`absolute top-0 left-0 w-1 h-full rounded-l-xl ${
        task.priority === "urgent" ? "bg-gradient-to-b from-red-500 to-red-600" :
        task.priority === "high" ? "bg-gradient-to-b from-orange-500 to-amber-500" :
        task.priority === "medium" ? "bg-gradient-to-b from-blue-500 to-blue-600" :
        "bg-gradient-to-b from-slate-500 to-slate-600"
      }`} />

      <div className="pl-4 pr-3 py-3">
        {/* Header: title + menu */}
        <div className="flex items-start justify-between gap-2">
          <h4 className={`text-[13px] font-semibold leading-snug tracking-tight flex-1 ${
            isCompleted ? "line-through text-muted-foreground/60" : "text-foreground"
          }`}>
            {task.title}
          </h4>
          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-white/5"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => onEdit(task)}>
                  <Pencil className="h-3.5 w-3.5 mr-2" /> Editar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    if (confirm("Tem certeza que deseja excluir esta tarefa?")) {
                      onDelete(task.id);
                    }
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Description */}
        {task.description && !compact && (
          <p className="text-xs text-muted-foreground/70 mt-1.5 line-clamp-2 leading-relaxed">
            {task.description}
          </p>
        )}

        {/* Tags row */}
        <div className="flex flex-wrap items-center gap-1.5 mt-3">
          {/* Priority badge */}
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${pc.bg} ${pc.border} ${pc.color} ${pc.glow}`}>
                <PriorityIcon className="h-2.5 w-2.5" />
                {pc.label}
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom">Prioridade: {pc.label}</TooltipContent>
          </Tooltip>

          {/* Due date badge */}
          {dueInfo.urgency !== "none" && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${dueInfo.bg} ${dueInfo.color} ${
                  dueInfo.urgency === "overdue" ? "animate-pulse" : ""
                }`}>
                  {dueInfo.urgency === "overdue" ? (
                    <AlertTriangle className="h-2.5 w-2.5" />
                  ) : dueInfo.urgency === "today" ? (
                    <Timer className="h-2.5 w-2.5" />
                  ) : (
                    <Calendar className="h-2.5 w-2.5" />
                  )}
                  {dueInfo.label}
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {task.dueDate ? `Prazo: ${new Date(task.dueDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}` : ""}
              </TooltipContent>
            </Tooltip>
          )}

          {/* Points badge */}
          {task.pointsAwarded > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/15 border border-primary/25 text-primary">
              <Zap className="h-2.5 w-2.5" />
              +{task.pointsAwarded}
            </span>
          )}
        </div>

        {/* Footer: assignee + date */}
        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-border/20">
          {assignee ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2">
                  <div className={`h-6 w-6 rounded-full bg-gradient-to-br ${getAvatarColor(assignee.id)} flex items-center justify-center shadow-sm`}>
                    <span className="text-[9px] font-bold text-white">{getInitials(assignee.name)}</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground font-medium">
                    {getUserName(task.assigneeId)}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">{assignee.name ?? "Colaborador"}</TooltipContent>
            </Tooltip>
          ) : (
            <div className="flex items-center gap-1.5">
              <div className="h-6 w-6 rounded-full bg-muted/40 border border-dashed border-border/40 flex items-center justify-center">
                <User className="h-3 w-3 text-muted-foreground/40" />
              </div>
              <span className="text-[11px] text-muted-foreground/40 italic">Não atribuído</span>
            </div>
          )}
          <span className="text-[10px] text-muted-foreground/40">
            #{task.id}
          </span>
        </div>
      </div>
    </div>
  );
}

function SortableTaskCard({
  task,
  isAdmin,
  getUserName,
  getUserById,
  onEdit,
  onDelete,
}: {
  task: TaskItem;
  isAdmin: boolean;
  getUserName: (id: number | null) => string;
  getUserById: (id: number | null) => { id: number; name: string | null } | null;
  onEdit: (task: TaskItem) => void;
  onDelete: (id: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id.toString() });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const dueInfo = getDueDateInfo(task.dueDate, task.status);

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`kanban-card-premium group relative ${isDragging ? "kanban-card-dragging" : ""} ${
        dueInfo.urgency === "overdue" ? "kanban-card-overdue" : ""
      } ${task.priority === "urgent" ? "kanban-card-urgent" : ""}`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="absolute left-0 top-0 bottom-0 w-5 flex items-center justify-center opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-all duration-200 cursor-grab active:cursor-grabbing focus:outline-none z-10 rounded-l-xl hover:bg-white/5"
      >
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
      </button>

      <TaskCardContent
        task={task}
        isAdmin={isAdmin}
        getUserName={getUserName}
        getUserById={getUserById}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </motion.div>
  );
}

export default function Tasks() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const isAdmin = user?.role === "admin";

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<number | null>(null);
  const [form, setForm] = useState<TaskForm>(emptyForm);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [quickAddColumn, setQuickAddColumn] = useState<TaskStatus | null>(null);
  const [quickAddTitle, setQuickAddTitle] = useState("");
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
    const grouped: Record<TaskStatus, TaskItem[]> = {
      pending: [],
      in_progress: [],
      completed: [],
    };
    for (const task of filteredTasks) {
      grouped[task.status]?.push(task);
    }
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
      toast.success("Tarefa excluída!");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = () => {
    if (!form.title.trim()) {
      toast.error("Título é obrigatório");
      return;
    }
    const payload = {
      title: form.title,
      description: form.description || undefined,
      priority: form.priority,
      assigneeId: form.assigneeId ? parseInt(form.assigneeId) : undefined,
      dueDate: form.dueDate ? new Date(form.dueDate).getTime() : undefined,
    };
    if (editingTask) {
      updateMutation.mutate({ id: editingTask, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleQuickAdd = (status: TaskStatus) => {
    if (!quickAddTitle.trim()) return;
    createMutation.mutate(
      { title: quickAddTitle, priority: "medium" },
      {
        onSuccess: () => {
          setQuickAddTitle("");
          setQuickAddColumn(null);
        },
      }
    );
  };

  const openEdit = (task: TaskItem) => {
    setEditingTask(task.id);
    setForm({
      title: task.title,
      description: task.description ?? "",
      priority: task.priority,
      assigneeId: task.assigneeId?.toString() ?? "",
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : "",
    });
    setDialogOpen(true);
  };

  const openCreate = () => {
    setEditingTask(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const getUserName = useCallback((id: number | null) => {
    if (!id || !allUsers) return "Não atribuído";
    const u = allUsers.find(u => u.id === id);
    return u?.name?.split(" ")[0] ?? "Desconhecido";
  }, [allUsers]);

  const getUserById = useCallback((id: number | null) => {
    if (!id || !allUsers) return null;
    return allUsers.find(u => u.id === id) ?? null;
  }, [allUsers]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = parseInt(active.id as string);
    const task = data?.tasks.find(t => t.id === taskId);
    if (!task) return;

    let targetStatus: TaskStatus | null = null;
    if (["pending", "in_progress", "completed"].includes(over.id as string)) {
      targetStatus = over.id as TaskStatus;
    } else {
      const overTaskId = parseInt(over.id as string);
      const overTask = data?.tasks.find(t => t.id === overTaskId);
      if (overTask) targetStatus = overTask.status;
    }

    if (targetStatus && targetStatus !== task.status) {
      statusMutation.mutate({ id: taskId, status: targetStatus });
    }
  };

  const activeTask = activeId ? data?.tasks.find(t => t.id === parseInt(activeId)) : null;

  const totalTasks = data?.tasks?.length ?? 0;

  if (isLoading) {
    return (
      <div className="space-y-6 p-1">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-12 rounded-xl" />
              <Skeleton className="h-32 rounded-xl" />
              <Skeleton className="h-32 rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 h-full p-1">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Kanban Board</h1>
                <p className="text-muted-foreground text-sm">
                  {totalTasks} tarefa{totalTasks !== 1 ? "s" : ""} no total
                  {hasActiveFilters && ` · ${filteredTasks.length} filtrada${filteredTasks.length !== 1 ? "s" : ""}`}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={showFilters ? "secondary" : "outline"}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={`relative ${hasActiveFilters ? "border-primary/40 text-primary" : ""}`}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtros
              {hasActiveFilters && (
                <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-primary text-[9px] font-bold text-primary-foreground flex items-center justify-center">
                  {(filterPriority !== "all" ? 1 : 0) + (filterAssignee !== "all" ? 1 : 0) + (searchQuery ? 1 : 0)}
                </span>
              )}
            </Button>
            {isAdmin && (
              <Button onClick={openCreate} className="shadow-lg glow-primary font-semibold gap-2">
                <Plus className="h-4 w-4" />
                Nova Tarefa
              </Button>
            )}
          </div>
        </div>

        {/* Filters bar */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-card/50 border border-border/30">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar tarefas..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 bg-muted/30 border-border/30"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <Select value={filterPriority} onValueChange={setFilterPriority}>
                  <SelectTrigger className="w-[150px] h-9 bg-muted/30 border-border/30">
                    <SelectValue placeholder="Prioridade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas prioridades</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="low">Baixa</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterAssignee} onValueChange={setFilterAssignee}>
                  <SelectTrigger className="w-[170px] h-9 bg-muted/30 border-border/30">
                    <SelectValue placeholder="Responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {allUsers?.map((u) => (
                      <SelectItem key={u.id} value={u.id.toString()}>
                        {u.name ?? u.email ?? `User #${u.id}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFilterPriority("all");
                      setFilterAssignee("all");
                      setSearchQuery("");
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5 mr-1" />
                    Limpar
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {columns.map((col) => {
            const colTasks = tasksByStatus[col.id];
            const Icon = col.icon;

            return (
              <div
                key={col.id}
                className={`kanban-column-premium ${col.bgGlow} flex flex-col`}
                id={col.id}
              >
                {/* Column header */}
                <div className={`${col.headerBg} rounded-t-xl px-4 py-3 border-b border-border/20`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`h-7 w-7 rounded-lg bg-gradient-to-br ${col.gradient} flex items-center justify-center shadow-sm`}>
                        <Icon className="h-3.5 w-3.5 text-white" />
                      </div>
                      <div>
                        <span className="text-sm font-bold text-foreground">{col.label}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-muted-foreground font-medium">
                            {colTasks.length} tarefa{colTasks.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                    </div>
                    {isAdmin && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-white/5"
                            onClick={() => setQuickAddColumn(quickAddColumn === col.id ? null : col.id)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Adicionar tarefa rápida</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>

                {/* Quick Add */}
                <AnimatePresence>
                  {quickAddColumn === col.id && isAdmin && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mx-3 mt-3 p-3 rounded-xl border border-primary/30 bg-primary/5 backdrop-blur-sm">
                        <Input
                          placeholder="Título da tarefa..."
                          value={quickAddTitle}
                          onChange={(e) => setQuickAddTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleQuickAdd(col.id);
                            if (e.key === "Escape") { setQuickAddColumn(null); setQuickAddTitle(""); }
                          }}
                          className="h-9 text-sm bg-transparent border-primary/20 focus-visible:ring-primary/30"
                          autoFocus
                        />
                        <div className="flex items-center gap-2 mt-2">
                          <Button
                            size="sm"
                            className="h-7 text-xs px-3 glow-primary"
                            onClick={() => handleQuickAdd(col.id)}
                            disabled={createMutation.isPending}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Adicionar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs px-3"
                            onClick={() => { setQuickAddColumn(null); setQuickAddTitle(""); }}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Tasks list */}
                <SortableContext
                  items={colTasks.map(t => t.id.toString())}
                  strategy={verticalListSortingStrategy}
                  id={col.id}
                >
                  <div className="space-y-2.5 flex-1 min-h-[250px] p-3" data-column={col.id}>
                    <AnimatePresence mode="popLayout">
                      {colTasks.map((task) => (
                        <SortableTaskCard
                          key={task.id}
                          task={task}
                          isAdmin={isAdmin}
                          getUserName={getUserName}
                          getUserById={getUserById}
                          onEdit={openEdit}
                          onDelete={(id) => deleteMutation.mutate({ id })}
                        />
                      ))}
                    </AnimatePresence>
                    {colTasks.length === 0 && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center h-32 text-muted-foreground/30 border border-dashed border-border/20 rounded-xl gap-2"
                      >
                        <col.emptyIcon className="h-8 w-8" />
                        <span className="text-xs font-medium">{col.emptyText}</span>
                        <span className="text-[10px]">Arraste tarefas aqui</span>
                      </motion.div>
                    )}
                  </div>
                </SortableContext>
              </div>
            );
          })}
        </div>

        {/* Drag overlay */}
        <DragOverlay>
          {activeTask && (
            <div className="kanban-card-premium kanban-card-overlay w-[320px]">
              <TaskCardContent
                task={activeTask}
                isAdmin={false}
                getUserName={getUserName}
                getUserById={getUserById}
                onEdit={() => {}}
                onDelete={() => {}}
                compact
              />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg border-border/30 bg-card/95 backdrop-blur-xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                editingTask
                  ? "bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border border-blue-500/20"
                  : "bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20"
              }`}>
                {editingTask ? <Pencil className="h-5 w-5 text-blue-400" /> : <Plus className="h-5 w-5 text-primary" />}
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">
                  {editingTask ? "Editar Tarefa" : "Nova Tarefa"}
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  {editingTask ? "Atualize os dados da tarefa" : "Preencha os dados para criar uma nova tarefa"}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-5 py-3">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Título *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ex: Revisar relatório mensal"
                className="bg-muted/20 border-border/30 h-11 text-sm focus-visible:ring-primary/30"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Descrição</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Descreva os detalhes e objetivos da tarefa..."
                rows={3}
                className="bg-muted/20 border-border/30 text-sm resize-none focus-visible:ring-primary/30"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Prioridade</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as Priority })}>
                  <SelectTrigger className="bg-muted/20 border-border/30 h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">
                      <span className="flex items-center gap-2">
                        <ArrowDown className="h-3.5 w-3.5 text-slate-400" /> Baixa
                      </span>
                    </SelectItem>
                    <SelectItem value="medium">
                      <span className="flex items-center gap-2">
                        <ArrowRight className="h-3.5 w-3.5 text-blue-400" /> Média
                      </span>
                    </SelectItem>
                    <SelectItem value="high">
                      <span className="flex items-center gap-2">
                        <ArrowUp className="h-3.5 w-3.5 text-orange-400" /> Alta
                      </span>
                    </SelectItem>
                    <SelectItem value="urgent">
                      <span className="flex items-center gap-2">
                        <Flame className="h-3.5 w-3.5 text-red-400" /> Urgente
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Responsável</Label>
                <Select value={form.assigneeId} onValueChange={(v) => setForm({ ...form, assigneeId: v })}>
                  <SelectTrigger className="bg-muted/20 border-border/30 h-11">
                    <SelectValue placeholder="Selecionar..." />
                  </SelectTrigger>
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
              <Input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className="bg-muted/20 border-border/30 h-11"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-border/30">
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="glow-primary font-semibold min-w-[120px]"
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Salvando...
                </span>
              ) : editingTask ? "Salvar Alterações" : "Criar Tarefa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
