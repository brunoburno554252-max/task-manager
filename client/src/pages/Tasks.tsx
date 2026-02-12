import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
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
  Plus, Search, MoreHorizontal, Pencil, Trash2,
  Calendar, User, AlertCircle, Clock, CheckCircle2, Circle,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

const statusConfig = {
  pending: { label: "Pendente", icon: Circle, color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  in_progress: { label: "Em Andamento", icon: Clock, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  completed: { label: "Concluída", icon: CheckCircle2, color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
};

const priorityConfig = {
  low: { label: "Baixa", color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" },
  medium: { label: "Média", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  high: { label: "Alta", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" },
  urgent: { label: "Urgente", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
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

export default function Tasks() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const isAdmin = user?.role === "admin";

  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<number | null>(null);
  const [form, setForm] = useState<TaskForm>(emptyForm);

  const queryInput = useMemo(() => ({
    status: statusFilter,
    priority: priorityFilter,
    search: search || undefined,
  }), [statusFilter, priorityFilter, search]);

  const { data, isLoading } = trpc.tasks.list.useQuery(queryInput);
  const { data: allUsers } = trpc.users.list.useQuery();

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

  const openEdit = (task: NonNullable<typeof data>["tasks"][0]) => {
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

  const getUserName = (id: number | null) => {
    if (!id || !allUsers) return "Não atribuído";
    return allUsers.find(u => u.id === id)?.name ?? "Desconhecido";
  };

  const isOverdue = (task: { dueDate: number | null; status: string }) => {
    return task.dueDate && task.status !== "completed" && task.dueDate < Date.now();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tarefas</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie e acompanhe todas as tarefas da equipe.
          </p>
        </div>
        {isAdmin && (
          <Button onClick={openCreate} className="shadow-sm">
            <Plus className="h-4 w-4 mr-2" />
            Nova Tarefa
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar tarefas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="in_progress">Em Andamento</SelectItem>
            <SelectItem value="completed">Concluída</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Prioridade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Prioridades</SelectItem>
            <SelectItem value="low">Baixa</SelectItem>
            <SelectItem value="medium">Média</SelectItem>
            <SelectItem value="high">Alta</SelectItem>
            <SelectItem value="urgent">Urgente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Task List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : data?.tasks && data.tasks.length > 0 ? (
        <div className="space-y-2">
          {data.tasks.map((task) => {
            const sc = statusConfig[task.status];
            const pc = priorityConfig[task.priority];
            const StatusIcon = sc.icon;
            const overdue = isOverdue(task);

            return (
              <Card
                key={task.id}
                className={`border-0 shadow-sm transition-all hover:shadow-md ${
                  overdue ? "ring-1 ring-red-200 dark:ring-red-800" : ""
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Status Change Button */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="mt-0.5 shrink-0 focus:outline-none">
                          <StatusIcon className={`h-5 w-5 ${
                            task.status === "completed" ? "text-green-500" :
                            task.status === "in_progress" ? "text-blue-500" :
                            "text-slate-400"
                          }`} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => statusMutation.mutate({ id: task.id, status: "pending" })}>
                          <Circle className="h-4 w-4 mr-2 text-slate-400" /> Pendente
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => statusMutation.mutate({ id: task.id, status: "in_progress" })}>
                          <Clock className="h-4 w-4 mr-2 text-blue-500" /> Em Andamento
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => statusMutation.mutate({ id: task.id, status: "completed" })}>
                          <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" /> Concluída
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className={`font-medium text-sm ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                            {task.title}
                          </h3>
                          {task.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {task.description}
                            </p>
                          )}
                        </div>
                        {isAdmin && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEdit(task)}>
                                <Pencil className="h-4 w-4 mr-2" /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  if (confirm("Tem certeza que deseja excluir esta tarefa?")) {
                                    deleteMutation.mutate({ id: task.id });
                                  }
                                }}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" /> Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <Badge variant="secondary" className={`text-[10px] px-2 py-0.5 ${pc.color} border-0`}>
                          {pc.label}
                        </Badge>
                        <Badge variant="secondary" className={`text-[10px] px-2 py-0.5 ${sc.color} border-0`}>
                          {sc.label}
                        </Badge>
                        {task.assigneeId && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <User className="h-3 w-3" />
                            {getUserName(task.assigneeId)}
                          </span>
                        )}
                        {task.dueDate && (
                          <span className={`flex items-center gap-1 text-xs ${overdue ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
                            {overdue ? <AlertCircle className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
                            {new Date(task.dueDate).toLocaleDateString("pt-BR")}
                          </span>
                        )}
                        {task.pointsAwarded > 0 && (
                          <span className="text-xs text-primary font-medium">
                            +{task.pointsAwarded} pts
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground font-medium">Nenhuma tarefa encontrada</p>
            <p className="text-sm text-muted-foreground mt-1">
              {isAdmin ? "Crie uma nova tarefa para começar." : "Aguarde a atribuição de novas tarefas."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTask ? "Editar Tarefa" : "Nova Tarefa"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Digite o título da tarefa"
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Descreva os detalhes da tarefa"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as TaskForm["priority"] })}>
                  <SelectTrigger>
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
                <Label>Responsável</Label>
                <Select value={form.assigneeId} onValueChange={(v) => setForm({ ...form, assigneeId: v })}>
                  <SelectTrigger>
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
              <Label>Prazo</Label>
              <Input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
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
            >
              {createMutation.isPending || updateMutation.isPending ? "Salvando..." : editingTask ? "Salvar" : "Criar Tarefa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
