import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ListTodo, CheckCircle2, Clock, AlertTriangle, Eye, Circle,
  Search, X, ArrowUp, ArrowRight, ArrowDown, Flame, Calendar,
  Zap, ChevronRight, Filter,
} from "lucide-react";
import { useState, useMemo } from "react";
import { useLocation, useSearch } from "wouter";

type TaskStatus = "pending" | "in_progress" | "review" | "completed";
type Priority = "low" | "medium" | "high" | "urgent";

const statusConfig: Record<string, { label: string; icon: React.ElementType; color: string; bg: string; accent: string }> = {
  all: { label: "Todas", icon: ListTodo, color: "text-primary", bg: "bg-primary/10", accent: "oklch(0.72 0.19 280)" },
  pending: { label: "Pendentes", icon: Circle, color: "text-orange-500", bg: "bg-orange-500/10", accent: "oklch(0.75 0.18 70)" },
  in_progress: { label: "Em Andamento", icon: Clock, color: "text-blue-500", bg: "bg-blue-500/10", accent: "oklch(0.65 0.18 240)" },
  review: { label: "Em Análise", icon: Eye, color: "text-purple-500", bg: "bg-purple-500/10", accent: "oklch(0.65 0.18 310)" },
  completed: { label: "Concluídas", icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10", accent: "oklch(0.7 0.18 170)" },
  overdue: { label: "Atrasadas", icon: AlertTriangle, color: "text-red-500", bg: "bg-red-500/10", accent: "oklch(0.65 0.22 25)" },
};

const priorityConfig: Record<Priority, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  low: { label: "Baixa", icon: ArrowDown, color: "text-slate-400", bg: "bg-slate-400/10" },
  medium: { label: "Média", icon: ArrowRight, color: "text-blue-400", bg: "bg-blue-400/10" },
  high: { label: "Alta", icon: ArrowUp, color: "text-orange-400", bg: "bg-orange-400/10" },
  urgent: { label: "Urgente", icon: Flame, color: "text-red-400", bg: "bg-red-400/10" },
};

export default function TaskCenter() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const isAdmin = user?.role === "admin";

  // Parse URL params
  const params = new URLSearchParams(searchString);
  const initialStatus = params.get("status") || "all";

  const [activeFilter, setActiveFilter] = useState(initialStatus);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCollaborator, setSelectedCollaborator] = useState<string>("all");

  const { data: stats } = trpc.dashboard.stats.useQuery({});
  const { data: collaborators } = trpc.collaborators.listWithStats.useQuery(undefined, { enabled: isAdmin });

  // Build filters for task list
  const taskFilters = useMemo(() => {
    const filters: Record<string, any> = {};
    if (activeFilter !== "all") {
      filters.status = activeFilter;
    }
    if (selectedCollaborator && selectedCollaborator !== "all") {
      filters.assigneeId = parseInt(selectedCollaborator);
    }
    if (searchQuery.trim()) {
      filters.search = searchQuery.trim();
    }
    filters.limit = 200;
    return filters;
  }, [activeFilter, selectedCollaborator, searchQuery]);

  const { data: taskData, isLoading: tasksLoading } = trpc.tasks.list.useQuery(taskFilters);

  const filterCards = useMemo(() => {
    if (!stats) return [];
    return [
      { key: "all", count: stats.total },
      { key: "pending", count: stats.pending },
      { key: "in_progress", count: stats.inProgress },
      { key: "review", count: (stats as any).review ?? 0 },
      { key: "completed", count: stats.completed },
      { key: "overdue", count: stats.overdue },
    ];
  }, [stats]);

  const isOverdue = (task: any) => {
    return task.dueDate && task.status !== "completed" && task.status !== "review" && Date.now() > task.dueDate;
  };

  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return "—";
    return new Date(timestamp).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
  };

  const handleCardClick = (status: string) => {
    setActiveFilter(status);
    // Update URL without full navigation
    const newUrl = status === "all" ? "/tasks" : `/tasks?status=${status}`;
    window.history.replaceState(null, "", newUrl);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Central de Tarefas</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Visualize, filtre e gerencie todas as tarefas em um só lugar.
        </p>
      </div>

      {/* Filter Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {filterCards.map((card) => {
          const config = statusConfig[card.key];
          const isActive = activeFilter === card.key;
          return (
            <button
              key={card.key}
              onClick={() => handleCardClick(card.key)}
              className={`stat-card p-4 text-left transition-all cursor-pointer hover:scale-[1.02] ${
                isActive ? "ring-2 ring-primary/50 shadow-lg" : "hover:shadow-md"
              }`}
              style={{ "--stat-accent": config.accent } as React.CSSProperties}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">{config.label}</span>
                <config.icon className={`h-4 w-4 ${config.color}`} />
              </div>
              <p className={`text-2xl font-bold tracking-tight ${isActive ? "text-primary" : ""}`}>{card.count}</p>
            </button>
          );
        })}
      </div>

      {/* Search & Filters */}
      <div className="stat-card p-4" style={{ "--stat-accent": "oklch(0.65 0.15 270)" } as React.CSSProperties}>
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Filtros</span>
          {(searchQuery || selectedCollaborator !== "all") && (
            <button
              onClick={() => { setSearchQuery(""); setSelectedCollaborator("all"); }}
              className="ml-auto text-xs text-primary hover:underline flex items-center gap-1"
            >
              <X className="h-3 w-3" /> Limpar filtros
            </button>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search by ID or title */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por ID ou título da tarefa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10"
            />
          </div>

          {/* Filter by collaborator */}
          {isAdmin && collaborators && collaborators.length > 0 && (
            <Select value={selectedCollaborator} onValueChange={setSelectedCollaborator}>
              <SelectTrigger className="w-full sm:w-[220px] h-10">
                <SelectValue placeholder="Todos os colaboradores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os colaboradores</SelectItem>
                {collaborators.filter(c => c.role !== "admin").map((c) => (
                  <SelectItem key={c.id} value={c.id.toString()}>
                    {c.name || `Colaborador #${c.id}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {taskData?.total ?? 0} tarefa{(taskData?.total ?? 0) !== 1 ? "s" : ""} encontrada{(taskData?.total ?? 0) !== 1 ? "s" : ""}
        </p>
        {activeFilter !== "all" && (
          <Badge variant="secondary" className="text-xs">
            Filtro: {statusConfig[activeFilter]?.label}
          </Badge>
        )}
      </div>

      {/* Task List */}
      {tasksLoading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : taskData?.tasks && taskData.tasks.length > 0 ? (
        <div className="stat-card overflow-hidden" style={{ "--stat-accent": "oklch(0.65 0.2 310)" } as React.CSSProperties}>
          <div className="divide-y divide-border/30">
            {taskData.tasks.map((task: any) => {
              const taskOverdue = isOverdue(task);
              const sConfig = statusConfig[task.status] || statusConfig.pending;
              const pConfig = priorityConfig[task.priority as Priority] || priorityConfig.medium;
              return (
                <div
                  key={task.id}
                  onClick={() => {
                    // Navigate to the collaborator's Kanban
                    if (task.assigneeId) {
                      setLocation(`/kanban/${task.assigneeId}`);
                    }
                  }}
                  className="flex items-center gap-3 p-3.5 hover:bg-muted/10 transition-colors cursor-pointer group"
                >
                  {/* Status icon */}
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${taskOverdue ? "bg-red-500/15" : sConfig.bg}`}>
                    {taskOverdue ? (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    ) : (
                      <sConfig.icon className={`h-4 w-4 ${sConfig.color}`} />
                    )}
                  </div>

                  {/* Task info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground font-mono">#{task.id}</span>
                      <p className="text-sm font-medium truncate">{task.title}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {task.assigneeName && (
                        <span className="text-[11px] text-muted-foreground">{task.assigneeName}</span>
                      )}
                      {task.companyName && (
                        <>
                          <span className="text-muted-foreground/30">|</span>
                          <span className="text-[11px] text-muted-foreground">{task.companyName}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Priority badge */}
                  <div className={`hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium ${pConfig.bg} ${pConfig.color}`}>
                    <pConfig.icon className="h-3 w-3" />
                    {pConfig.label}
                  </div>

                  {/* Points */}
                  {task.pointsAwarded > 0 && (
                    <div className="hidden sm:flex items-center gap-1 text-xs text-amber-400 font-semibold">
                      <Zap className="h-3 w-3" />
                      {task.pointsAwarded}
                    </div>
                  )}

                  {/* Due date */}
                  {task.dueDate && (
                    <div className={`hidden md:flex items-center gap-1 text-[11px] ${taskOverdue ? "text-red-500 font-semibold" : "text-muted-foreground"}`}>
                      <Calendar className="h-3 w-3" />
                      {formatDate(task.dueDate)}
                    </div>
                  )}

                  {/* Status badge */}
                  <div className={`hidden lg:flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium ${taskOverdue ? "bg-red-500/15 text-red-500" : `${sConfig.bg} ${sConfig.color}`}`}>
                    {taskOverdue ? "Atrasada" : sConfig.label}
                  </div>

                  {/* Arrow */}
                  <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors shrink-0" />
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="stat-card p-12 text-center" style={{ "--stat-accent": "oklch(0.72 0.19 280)" } as React.CSSProperties}>
          <ListTodo className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhuma tarefa encontrada</p>
          <p className="text-sm text-muted-foreground/60 mt-1">
            Tente ajustar os filtros ou buscar por outro termo.
          </p>
        </div>
      )}
    </div>
  );
}
