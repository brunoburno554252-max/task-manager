import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus, MoreHorizontal, Pencil, Trash2,
  Calendar, User, AlertCircle, Clock, CheckCircle2, Circle, GripVertical,
} from "lucide-react";
import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
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

const columns: { id: TaskStatus; label: string; icon: typeof Circle; color: string; dotColor: string }[] = [
  { id: "pending", label: "Pendente", icon: Circle, color: "text-amber-400", dotColor: "bg-amber-400" },
  { id: "in_progress", label: "Em Andamento", icon: Clock, color: "text-blue-400", dotColor: "bg-blue-400" },
  { id: "completed", label: "Concluída", icon: CheckCircle2, color: "text-emerald-400", dotColor: "bg-emerald-400" },
];

const priorityConfig = {
  low: { label: "Baixa", color: "bg-slate-500/20 text-slate-300 border-slate-500/30" },
  medium: { label: "Média", color: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  high: { label: "Alta", color: "bg-orange-500/20 text-orange-300 border-orange-500/30" },
  urgent: { label: "Urgente", color: "bg-red-500/20 text-red-300 border-red-500/30" },
};

type TaskForm = {
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
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
  priority: "low" | "medium" | "high" | "urgent";
  assigneeId: number | null;
  createdById: number;
  dueDate: number | null;
  completedAt: number | null;
  pointsAwarded: number;
  createdAt: Date;
  updatedAt: Date;
};

function SortableTaskCard({
  task,
  isAdmin,
  getUserName,
  onEdit,
  onDelete,
}: {
  task: TaskItem;
  isAdmin: boolean;
  getUserName: (id: number | null) => string;
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

  const pc = priorityConfig[task.priority];
  const overdue = task.dueDate && task.status !== "completed" && task.dueDate < Date.now();

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`kanban-card p-3.5 group ${isDragging ? "dragging" : ""} ${overdue ? "border-red-500/40" : ""}`}
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 shrink-0 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity cursor-grab active:cursor-grabbing focus:outline-none"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1">
            <h4 className={`text-sm font-medium leading-snug ${task.status === "completed" ? "line-through text-muted-foreground" : "text-foreground"}`}>
              {task.title}
            </h4>
            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36">
                  <DropdownMenuItem onClick={() => onEdit(task)}>
                    <Pencil className="h-3.5 w-3.5 mr-2" /> Editar
                  </DropdownMenuItem>
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

          {task.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
              {task.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
            <span className={`inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-md border ${pc.color}`}>
              {pc.label}
            </span>
            {task.assigneeId && (
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-md">
                <User className="h-2.5 w-2.5" />
                {getUserName(task.assigneeId)}
              </span>
            )}
            {task.dueDate && (
              <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md ${overdue ? "text-red-400 bg-red-500/10" : "text-muted-foreground bg-muted/50"}`}>
                {overdue ? <AlertCircle className="h-2.5 w-2.5" /> : <Calendar className="h-2.5 w-2.5" />}
                {new Date(task.dueDate).toLocaleDateString("pt-BR")}
              </span>
            )}
            {task.pointsAwarded > 0 && (
              <span className="inline-flex items-center text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-md">
                +{task.pointsAwarded} pts
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
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

  const { data, isLoading } = trpc.tasks.list.useQuery({});
  const { data: allUsers } = trpc.users.list.useQuery();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, TaskItem[]> = {
      pending: [],
      in_progress: [],
      completed: [],
    };
    if (data?.tasks) {
      for (const task of data.tasks) {
        grouped[task.status]?.push(task);
      }
    }
    return grouped;
  }, [data]);

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

    // Determine target column
    let targetStatus: TaskStatus | null = null;

    // Check if dropped over a column directly
    if (["pending", "in_progress", "completed"].includes(over.id as string)) {
      targetStatus = over.id as TaskStatus;
    } else {
      // Dropped over another task - find which column it belongs to
      const overTaskId = parseInt(over.id as string);
      const overTask = data?.tasks.find(t => t.id === overTaskId);
      if (overTask) {
        targetStatus = overTask.status;
      }
    }

    if (targetStatus && targetStatus !== task.status) {
      statusMutation.mutate({ id: taskId, status: targetStatus });
    }
  };

  const activeTask = activeId ? data?.tasks.find(t => t.id === parseInt(activeId)) : null;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-[500px] rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kanban</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Arraste as tarefas entre as colunas para atualizar o status.
          </p>
        </div>
        {isAdmin && (
          <Button onClick={openCreate} className="shadow-lg glow-primary font-medium">
            <Plus className="h-4 w-4 mr-2" />
            Nova Tarefa
          </Button>
        )}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {columns.map((col) => {
            const colTasks = tasksByStatus[col.id];
            const Icon = col.icon;

            return (
              <div key={col.id} className="kanban-column p-3 flex flex-col" id={col.id}>
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${col.dotColor}`} />
                    <span className="text-sm font-semibold text-foreground">{col.label}</span>
                    <span className="text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-md font-medium">
                      {colTasks.length}
                    </span>
                  </div>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-foreground"
                      onClick={() => setQuickAddColumn(quickAddColumn === col.id ? null : col.id)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>

                {/* Quick Add */}
                {quickAddColumn === col.id && isAdmin && (
                  <div className="mb-2 p-2 rounded-lg border border-primary/30 bg-primary/5">
                    <Input
                      placeholder="Título da tarefa..."
                      value={quickAddTitle}
                      onChange={(e) => setQuickAddTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleQuickAdd(col.id);
                        if (e.key === "Escape") { setQuickAddColumn(null); setQuickAddTitle(""); }
                      }}
                      className="h-8 text-sm bg-transparent border-0 focus-visible:ring-0 px-1"
                      autoFocus
                    />
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <Button
                        size="sm"
                        className="h-6 text-xs px-2"
                        onClick={() => handleQuickAdd(col.id)}
                        disabled={createMutation.isPending}
                      >
                        Adicionar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs px-2"
                        onClick={() => { setQuickAddColumn(null); setQuickAddTitle(""); }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}

                <SortableContext
                  items={colTasks.map(t => t.id.toString())}
                  strategy={verticalListSortingStrategy}
                  id={col.id}
                >
                  <div className="space-y-2 flex-1 min-h-[200px]" data-column={col.id}>
                    {colTasks.map((task) => (
                      <SortableTaskCard
                        key={task.id}
                        task={task}
                        isAdmin={isAdmin}
                        getUserName={getUserName}
                        onEdit={openEdit}
                        onDelete={(id) => deleteMutation.mutate({ id })}
                      />
                    ))}
                    {colTasks.length === 0 && (
                      <div className="flex items-center justify-center h-24 text-xs text-muted-foreground/50 border border-dashed border-border/30 rounded-lg">
                        Arraste tarefas aqui
                      </div>
                    )}
                  </div>
                </SortableContext>
              </div>
            );
          })}
        </div>

        <DragOverlay>
          {activeTask && (
            <div className="kanban-card p-3.5 opacity-90 shadow-2xl rotate-2 w-[300px]">
              <h4 className="text-sm font-medium">{activeTask.title}</h4>
              {activeTask.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{activeTask.description}</p>
              )}
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg border-border/50">
          <DialogHeader>
            <DialogTitle className="text-lg">{editingTask ? "Editar Tarefa" : "Nova Tarefa"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Título *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Digite o título da tarefa"
                className="bg-muted/30"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Descrição</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Descreva os detalhes da tarefa"
                rows={3}
                className="bg-muted/30"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Prioridade</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as TaskForm["priority"] })}>
                  <SelectTrigger className="bg-muted/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Responsável</Label>
                <Select value={form.assigneeId} onValueChange={(v) => setForm({ ...form, assigneeId: v })}>
                  <SelectTrigger className="bg-muted/30">
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {allUsers?.map((u) => (
                      <SelectItem key={u.id} value={u.id.toString()}>
                        {u.name ?? u.email ?? `User #${u.id}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Prazo</Label>
              <Input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className="bg-muted/30"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="glow-primary"
            >
              {createMutation.isPending || updateMutation.isPending ? "Salvando..." : editingTask ? "Salvar" : "Criar Tarefa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
