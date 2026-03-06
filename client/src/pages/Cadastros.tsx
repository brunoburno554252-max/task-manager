import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users, UserPlus, Loader2, Pencil, Trash2, Phone, Mail, Shield,
  Clock, Activity, CalendarDays, Eye, LogIn, Monitor, TrendingUp, TrendingDown, Minus,
  UserX, UserCheck, AlertTriangle, Search, MoreVertical,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return "Nunca";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "Agora mesmo";
  if (diffMin < 60) return `${diffMin}min atrás`;
  if (diffHours < 24) return `${diffHours}h atrás`;
  if (diffDays === 1) return "Ontem";
  if (diffDays < 7) return `${diffDays} dias atrás`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} sem atrás`;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function engagementLevel(uniqueDays: number, daysBack: number): { label: string; color: string; icon: React.ElementType } {
  const rate = uniqueDays / daysBack;
  if (rate >= 0.7) return { label: "Alto", color: "text-emerald-500", icon: TrendingUp };
  if (rate >= 0.4) return { label: "Médio", color: "text-amber-500", icon: Minus };
  return { label: "Baixo", color: "text-red-500", icon: TrendingDown };
}

export default function Cadastros() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  // Registration dialog
  const [showRegister, setShowRegister] = useState(false);
  const [regForm, setRegForm] = useState({ name: "", email: "", password: "", phone: "", role: "user" as "user" | "admin" });

  // Edit dialog
  const [editUser, setEditUser] = useState<{ id: number; name: string; email: string; phone: string; role: string } | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "", role: "user" });

  // Access logs dialog
  const [accessLogUser, setAccessLogUser] = useState<{ id: number; name: string } | null>(null);

  // Confirmation dialogs
  const [deactivateUser, setDeactivateUser] = useState<{ id: number; name: string; isActive: boolean } | null>(null);
  const [deleteUserTarget, setDeleteUserTarget] = useState<{ id: number; name: string } | null>(null);

  // Search/filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const { data: collaborators, isLoading } = trpc.collaborators.listWithStats.useQuery();
  const { data: accessStats } = trpc.access.stats.useQuery({ daysBack: 30 });
  const { data: userAccessLogs } = trpc.access.list.useQuery(
    { userId: accessLogUser?.id, limit: 100 },
    { enabled: !!accessLogUser }
  );

  const createUserMutation = trpc.users.create.useMutation({
    onSuccess: () => {
      toast.success("Colaborador cadastrado com sucesso!");
      utils.collaborators.listWithStats.invalidate();
      utils.users.list.invalidate();
      setShowRegister(false);
      setRegForm({ name: "", email: "", password: "", phone: "", role: "user" });
    },
    onError: (err) => toast.error(err.message),
  });

  const updateUserMutation = trpc.users.update.useMutation({
    onSuccess: () => {
      toast.success("Colaborador atualizado!");
      setEditUser(null);
      utils.collaborators.listWithStats.invalidate();
      utils.users.list.invalidate();
    },
    onError: () => toast.error("Erro ao atualizar colaborador"),
  });

  const toggleActiveMutation = trpc.users.toggleActive.useMutation({
    onSuccess: (_data, variables) => {
      toast.success(variables.isActive ? "Colaborador reativado!" : "Colaborador inativado!");
      setDeactivateUser(null);
      utils.collaborators.listWithStats.invalidate();
      utils.users.list.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao alterar status");
      setDeactivateUser(null);
    },
  });

  const deleteUserMutation = trpc.users.delete.useMutation({
    onSuccess: () => {
      toast.success("Colaborador excluído permanentemente!");
      setDeleteUserTarget(null);
      utils.collaborators.listWithStats.invalidate();
      utils.users.list.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao excluir colaborador");
      setDeleteUserTarget(null);
    },
  });

  // Merge access stats with collaborators
  const accessStatsMap = useMemo(() => {
    const map = new Map<number, { lastAccess: string; totalAccesses: number; uniqueDays: number; loginCount: number }>();
    if (accessStats) {
      for (const stat of accessStats) {
        map.set(stat.userId, {
          lastAccess: stat.lastAccess,
          totalAccesses: stat.totalAccesses,
          uniqueDays: stat.uniqueDays,
          loginCount: stat.loginCount,
        });
      }
    }
    return map;
  }, [accessStats]);

  // Filtered collaborators
  const filteredCollaborators = useMemo(() => {
    if (!collaborators) return [];
    let result = collaborators;
    // Filter by status
    if (statusFilter === "active") {
      result = result.filter(c => (c as any).isActive !== 0);
    } else if (statusFilter === "inactive") {
      result = result.filter(c => (c as any).isActive === 0);
    }
    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        (c.name?.toLowerCase().includes(q)) ||
        (c.email?.toLowerCase().includes(q))
      );
    }
    return result;
  }, [collaborators, statusFilter, searchQuery]);

  const handleEdit = (collab: any) => {
    setEditForm({
      name: collab.name || "",
      email: collab.email || "",
      phone: collab.phone || "",
      role: collab.role || "user",
    });
    setEditUser(collab);
  };

  const handleSaveEdit = () => {
    if (!editUser) return;
    updateUserMutation.mutate({
      id: editUser.id,
      name: editForm.name || undefined,
      email: editForm.email || undefined,
      phone: editForm.phone || null,
      role: editForm.role as "user" | "admin",
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Cadastros</h1>
            <p className="text-sm text-muted-foreground">Carregando...</p>
          </div>
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 rounded-xl bg-card/50 animate-pulse border border-border/30" />
          ))}
        </div>
      </div>
    );
  }

  const activeCount = collaborators?.filter(c => (c as any).isActive !== 0).length ?? 0;
  const inactiveCount = collaborators?.filter(c => (c as any).isActive === 0).length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Cadastros</h1>
            <p className="text-sm text-muted-foreground">
              Gerencie os colaboradores e acompanhe o engajamento na plataforma.
            </p>
          </div>
        </div>
        <Button onClick={() => setShowRegister(true)} className="gap-2">
          <UserPlus className="h-4 w-4" /> Novo Colaborador
        </Button>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 bg-card/80 border-border/30"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${statusFilter === "all" ? "bg-primary text-primary-foreground" : "bg-card/80 border border-border/30 text-muted-foreground hover:bg-muted/30"}`}
          >
            Todos ({collaborators?.length ?? 0})
          </button>
          <button
            onClick={() => setStatusFilter("active")}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${statusFilter === "active" ? "bg-emerald-500 text-white" : "bg-card/80 border border-border/30 text-muted-foreground hover:bg-muted/30"}`}
          >
            Ativos ({activeCount})
          </button>
          <button
            onClick={() => setStatusFilter("inactive")}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${statusFilter === "inactive" ? "bg-red-500 text-white" : "bg-card/80 border border-border/30 text-muted-foreground hover:bg-muted/30"}`}
          >
            Inativos ({inactiveCount})
          </button>
        </div>
      </div>

      {/* User List with Access Info */}
      <div className="rounded-xl bg-card/80 border border-border/30 overflow-hidden">
        <div className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_1fr_auto_auto] gap-4 px-5 py-3 border-b border-border/30 bg-muted/30">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nome</span>
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:block">Último Acesso</span>
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:block">Engajamento (30d)</span>
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ações</span>
        </div>

        {filteredCollaborators.length > 0 ? (
          filteredCollaborators.map((collab) => {
            const initials = (collab.name || "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
            const stats = accessStatsMap.get(collab.id);
            const lastAccess = stats?.lastAccess || (collab as any).lastSignedIn;
            const uniqueDays = stats?.uniqueDays ?? 0;
            const engagement = engagementLevel(uniqueDays, 30);
            const EngIcon = engagement.icon;
            const isInactive = (collab as any).isActive === 0;
            const isSelf = collab.id === user?.id;

            return (
              <div
                key={collab.id}
                className={`grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_1fr_auto_auto] gap-4 px-5 py-3 border-b border-border/10 hover:bg-muted/20 transition-colors items-center ${isInactive ? "opacity-50" : ""}`}
              >
                {/* Name + email */}
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className={`h-9 w-9 shrink-0 border ${isInactive ? "border-red-500/30 grayscale" : "border-primary/20"}`}>
                    {(collab as any).avatarUrl ? (
                      <AvatarImage src={(collab as any).avatarUrl} alt={collab.name || ""} className="object-cover" />
                    ) : null}
                    <AvatarFallback className={`text-xs font-bold ${isInactive ? "bg-red-500/10 text-red-500" : "bg-primary/15 text-primary"}`}>
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{collab.name || "Sem nome"}</span>
                      {collab.role === "admin" && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-primary/20 text-primary border-0 shrink-0">
                          Admin
                        </Badge>
                      )}
                      {isInactive && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-red-500/20 text-red-500 border-0 shrink-0">
                          Inativo
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground truncate block">{collab.email || "-"}</span>
                  </div>
                </div>

                {/* Last access */}
                <div className="hidden sm:flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-sm text-foreground">{timeAgo(lastAccess)}</span>
                    {lastAccess && (
                      <span className="text-[10px] text-muted-foreground block">
                        {new Date(lastAccess).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" })} às {new Date(lastAccess).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Engagement */}
                <div className="hidden sm:flex items-center gap-2 min-w-[120px]">
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium ${
                    engagement.label === "Alto" ? "bg-emerald-500/10 text-emerald-500" :
                    engagement.label === "Médio" ? "bg-amber-500/10 text-amber-500" :
                    "bg-red-500/10 text-red-500"
                  }`}>
                    <EngIcon className="h-3 w-3" />
                    {engagement.label}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{uniqueDays} dia{uniqueDays !== 1 ? "s" : ""}</span>
                </div>

                {/* Actions - Dropdown Menu */}
                <div className="flex items-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted/50 transition-colors focus:outline-none">
                        <MoreVertical className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      <DropdownMenuItem
                        onClick={() => setAccessLogUser({ id: collab.id, name: collab.name || "Colaborador" })}
                        className="gap-2 cursor-pointer"
                      >
                        <Eye className="h-4 w-4 text-blue-500" />
                        <span>Ver logs de acesso</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleEdit(collab)}
                        className="gap-2 cursor-pointer"
                      >
                        <Pencil className="h-4 w-4 text-primary" />
                        <span>Editar colaborador</span>
                      </DropdownMenuItem>
                      {!isSelf && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeactivateUser({ id: collab.id, name: collab.name || "Colaborador", isActive: !isInactive })}
                            className="gap-2 cursor-pointer"
                          >
                            {isInactive ? (
                              <><UserCheck className="h-4 w-4 text-emerald-500" /><span className="text-emerald-500">Reativar colaborador</span></>
                            ) : (
                              <><UserX className="h-4 w-4 text-amber-500" /><span className="text-amber-500">Inativar colaborador</span></>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeleteUserTarget({ id: collab.id, name: collab.name || "Colaborador" })}
                            className="gap-2 cursor-pointer text-red-500 focus:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span>Excluir permanentemente</span>
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12">
            <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {searchQuery || statusFilter !== "all" ? "Nenhum colaborador encontrado com esses filtros" : "Nenhum colaborador cadastrado"}
            </p>
            {!searchQuery && statusFilter === "all" && (
              <Button onClick={() => setShowRegister(true)} variant="outline" className="mt-4 gap-2">
                <UserPlus className="h-4 w-4" /> Cadastrar primeiro colaborador
              </Button>
            )}
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        {filteredCollaborators.length} de {collaborators?.length ?? 0} colaborador{(collaborators?.length ?? 0) !== 1 ? "es" : ""}
      </p>

      {/* Deactivate/Reactivate Confirmation Dialog */}
      <Dialog open={!!deactivateUser} onOpenChange={(open) => { if (!open) setDeactivateUser(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {deactivateUser?.isActive ? (
                <>
                  <div className="h-10 w-10 rounded-full bg-amber-500/15 flex items-center justify-center">
                    <UserX className="h-5 w-5 text-amber-500" />
                  </div>
                  Inativar Colaborador
                </>
              ) : (
                <>
                  <div className="h-10 w-10 rounded-full bg-emerald-500/15 flex items-center justify-center">
                    <UserCheck className="h-5 w-5 text-emerald-500" />
                  </div>
                  Reativar Colaborador
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {deactivateUser?.isActive ? (
                <>
                  Tem certeza que deseja <strong>inativar</strong> o colaborador <strong>"{deactivateUser?.name}"</strong>?
                  O colaborador não poderá mais acessar a plataforma, mas seus dados e tarefas serão mantidos.
                </>
              ) : (
                <>
                  Tem certeza que deseja <strong>reativar</strong> o colaborador <strong>"{deactivateUser?.name}"</strong>?
                  O colaborador voltará a ter acesso à plataforma.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeactivateUser(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (deactivateUser) {
                  toggleActiveMutation.mutate({ id: deactivateUser.id, isActive: !deactivateUser.isActive });
                }
              }}
              disabled={toggleActiveMutation.isPending}
              className={deactivateUser?.isActive ? "bg-amber-600 hover:bg-amber-700" : "bg-emerald-600 hover:bg-emerald-700"}
            >
              {toggleActiveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : deactivateUser?.isActive ? (
                <UserX className="h-4 w-4 mr-2" />
              ) : (
                <UserCheck className="h-4 w-4 mr-2" />
              )}
              {deactivateUser?.isActive ? "Sim, Inativar" : "Sim, Reativar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteUserTarget} onOpenChange={(open) => { if (!open) setDeleteUserTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-full bg-red-500/15 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              Excluir Colaborador Permanentemente
            </DialogTitle>
            <DialogDescription>
              <span className="text-red-500 font-semibold">ATENÇÃO: Esta ação é irreversível!</span>
              <br /><br />
              Tem certeza que deseja <strong>excluir permanentemente</strong> o colaborador <strong>"{deleteUserTarget?.name}"</strong>?
              <br /><br />
              Todos os dados associados a este colaborador serão removidos, incluindo pontos, conquistas e histórico.
              <br /><br />
              <strong>Dica:</strong> Se você apenas quer impedir o acesso, considere <em>inativar</em> o colaborador em vez de excluir.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteUserTarget(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (deleteUserTarget) {
                  deleteUserMutation.mutate({ id: deleteUserTarget.id });
                }
              }}
              disabled={deleteUserMutation.isPending}
              variant="destructive"
            >
              {deleteUserMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Sim, Excluir Permanentemente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Access Log Dialog */}
      <Dialog open={!!accessLogUser} onOpenChange={(open) => { if (!open) setAccessLogUser(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Logs de Acesso — {accessLogUser?.name}
            </DialogTitle>
            <DialogDescription>Histórico de acessos à plataforma nos últimos 30 dias.</DialogDescription>
          </DialogHeader>

          {/* Summary cards */}
          {accessLogUser && (() => {
            const stats = accessStatsMap.get(accessLogUser.id);
            return (
              <div className="grid grid-cols-3 gap-2 py-2">
                <div className="rounded-lg bg-muted/30 p-3 text-center">
                  <LogIn className="h-4 w-4 mx-auto mb-1 text-blue-400" />
                  <p className="text-lg font-bold">{stats?.loginCount ?? 0}</p>
                  <p className="text-[10px] text-muted-foreground">Logins</p>
                </div>
                <div className="rounded-lg bg-muted/30 p-3 text-center">
                  <CalendarDays className="h-4 w-4 mx-auto mb-1 text-emerald-400" />
                  <p className="text-lg font-bold">{stats?.uniqueDays ?? 0}</p>
                  <p className="text-[10px] text-muted-foreground">Dias ativos</p>
                </div>
                <div className="rounded-lg bg-muted/30 p-3 text-center">
                  <Monitor className="h-4 w-4 mx-auto mb-1 text-purple-400" />
                  <p className="text-lg font-bold">{stats?.totalAccesses ?? 0}</p>
                  <p className="text-[10px] text-muted-foreground">Page views</p>
                </div>
              </div>
            );
          })()}

          {/* Log list */}
          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {userAccessLogs && userAccessLogs.length > 0 ? (
              userAccessLogs.map((log: any) => (
                <div key={log.id} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-muted/20 transition-colors">
                  <div className={`h-7 w-7 rounded-md flex items-center justify-center shrink-0 ${
                    log.action === "login" ? "bg-blue-500/15" : "bg-muted/40"
                  }`}>
                    {log.action === "login" ? (
                      <LogIn className="h-3.5 w-3.5 text-blue-500" />
                    ) : (
                      <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium">
                      {log.action === "login" ? "Login na plataforma" : `Acessou ${log.page || "/"}`}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(log.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" })} às {new Date(log.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  {log.ipAddress && (
                    <span className="text-[10px] text-muted-foreground/60 hidden sm:block">{log.ipAddress}</span>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Activity className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Nenhum acesso registrado</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Register Dialog */}
      <Dialog open={showRegister} onOpenChange={setShowRegister}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Cadastrar Colaborador
            </DialogTitle>
            <DialogDescription>Preencha os dados do novo colaborador.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createUserMutation.mutate(regForm); }} className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome</Label>
              <Input placeholder="Nome completo" value={regForm.name} onChange={e => setRegForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input type="email" placeholder="email@exemplo.com" value={regForm.email} onChange={e => setRegForm(f => ({ ...f, email: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Telefone</Label>
              <Input type="tel" placeholder="(11) 99999-9999" value={regForm.phone} onChange={e => setRegForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Senha</Label>
              <Input type="password" placeholder="Mínimo 6 caracteres" value={regForm.password} onChange={e => setRegForm(f => ({ ...f, password: e.target.value }))} required minLength={6} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Função</Label>
              <Select value={regForm.role} onValueChange={v => setRegForm(f => ({ ...f, role: v as "user" | "admin" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Colaborador</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowRegister(false)}>Cancelar</Button>
              <Button type="submit" disabled={createUserMutation.isPending} className="gap-2">
                {createUserMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                Cadastrar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editUser} onOpenChange={(open) => { if (!open) setEditUser(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              Editar Colaborador
            </DialogTitle>
            <DialogDescription>Atualize os dados do colaborador.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={editForm.name}
                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Nome completo"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                value={editForm.email}
                onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                placeholder="email@exemplo.com"
                type="email"
              />
            </div>
            <div className="space-y-2">
              <Label>Telefone (WhatsApp)</Label>
              <Input
                value={editForm.phone}
                onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+55 (11) 99999-9999"
              />
            </div>
            <div className="space-y-2">
              <Label>Função</Label>
              <Select value={editForm.role} onValueChange={v => setEditForm(f => ({ ...f, role: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Colaborador</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={updateUserMutation.isPending}>
              {updateUserMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
