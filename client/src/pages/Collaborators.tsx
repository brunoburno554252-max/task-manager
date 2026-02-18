import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  Users, Search, CheckCircle2, Clock, AlertCircle, ListTodo,
  TrendingUp, Zap, ChevronRight, Crown, Phone, Pencil, UserPlus, Loader2,
} from "lucide-react";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function Collaborators() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [editUser, setEditUser] = useState<{ id: number; name: string; email: string; phone: string; role: string } | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "", role: "user" });

  const { data: collaborators, isLoading } = trpc.collaborators.listWithStats.useQuery();
  const utils = trpc.useUtils();

  // Registration dialog
  const [showRegister, setShowRegister] = useState(false);
  const [regForm, setRegForm] = useState({ name: "", email: "", password: "", phone: "", role: "user" as "user" | "admin" });
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

  const handleEdit = (collab: any, e: React.MouseEvent) => {
    e.stopPropagation();
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

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 13);
    if (digits.length <= 2) return `+${digits}`;
    if (digits.length <= 4) return `+${digits.slice(0, 2)} (${digits.slice(2)}`;
    if (digits.length <= 9) return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4)}`;
    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  };

  const filtered = useMemo(() => {
    if (!collaborators) return [];
    if (!search.trim()) return collaborators;
    const q = search.toLowerCase();
    return collaborators.filter(c =>
      (c.name?.toLowerCase().includes(q)) ||
      (c.email?.toLowerCase().includes(q))
    );
  }, [collaborators, search]);

  const totalStats = useMemo(() => {
    if (!collaborators) return { pending: 0, inProgress: 0, completed: 0, total: 0 };
    return collaborators.reduce((acc, c) => ({
      pending: acc.pending + (c.pendingTasks ?? 0),
      inProgress: acc.inProgress + (c.inProgressTasks ?? 0),
      completed: acc.completed + (c.completedTasks ?? 0),
      total: acc.total + (c.totalTasks ?? 0),
    }), { pending: 0, inProgress: 0, completed: 0, total: 0 });
  }, [collaborators]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Colaboradores</h1>
            <p className="text-sm text-muted-foreground">Carregando...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-48 rounded-xl bg-card/50 animate-pulse border border-border/30" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Colaboradores</h1>
            <p className="text-sm text-muted-foreground">
              {collaborators?.length ?? 0} colaboradores cadastrados
            </p>
          </div>
        </div>
        {user?.role === "admin" && (
          <Button onClick={() => setShowRegister(true)} className="gap-2">
            <UserPlus className="h-4 w-4" /> Cadastrar
          </Button>
        )}
      </div>

      {/* Register Dialog */}
      <Dialog open={showRegister} onOpenChange={setShowRegister}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cadastrar Colaborador</DialogTitle>
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
              <Button type="submit" disabled={createUserMutation.isPending} className="gap-2">
                {createUserMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                Cadastrar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl bg-card/80 border border-border/30 p-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-amber-500/15 flex items-center justify-center">
            <ListTodo className="h-4 w-4 text-amber-500" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Tarefas</p>
            <p className="text-xl font-bold">{totalStats.total}</p>
          </div>
        </div>
        <div className="rounded-xl bg-card/80 border border-border/30 p-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-orange-500/15 flex items-center justify-center">
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Pendentes</p>
            <p className="text-xl font-bold">{totalStats.pending}</p>
          </div>
        </div>
        <div className="rounded-xl bg-card/80 border border-border/30 p-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-blue-500/15 flex items-center justify-center">
            <Clock className="h-4 w-4 text-blue-500" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Em Andamento</p>
            <p className="text-xl font-bold">{totalStats.inProgress}</p>
          </div>
        </div>
        <div className="rounded-xl bg-card/80 border border-border/30 p-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-emerald-500/15 flex items-center justify-center">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Concluídas</p>
            <p className="text-xl font-bold">{totalStats.completed}</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar colaborador..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 bg-card/80 border-border/30"
        />
      </div>

      {/* Collaborator Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((collab, index) => {
          const completionRate = collab.totalTasks > 0
            ? Math.round((collab.completedTasks / collab.totalTasks) * 100)
            : 0;
          const initials = (collab.name || "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

          return (
            <div
              key={collab.id}
              onClick={() => setLocation(`/kanban/${collab.id}`)}
              className="group relative rounded-xl bg-card/80 border border-border/30 p-5 cursor-pointer transition-all duration-200 hover:border-primary/40 hover:bg-card hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5"
            >
              {/* Rank indicator for top 3 */}
              {index < 3 && (
                <div className="absolute -top-2 -right-2">
                  <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shadow-lg ${
                    index === 0 ? "bg-amber-500 text-white" :
                    index === 1 ? "bg-slate-400 text-white" :
                    "bg-amber-700 text-white"
                  }`}>
                    {index === 0 ? <Crown className="h-3.5 w-3.5" /> : index + 1}
                  </div>
                </div>
              )}

              {/* User Info */}
              <div className="flex items-center gap-3 mb-4">
                <Avatar className="h-12 w-12 border-2 border-primary/20">
                  <AvatarFallback className="text-sm font-bold bg-primary/15 text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold truncate">{collab.name || "Sem nome"}</h3>
                    {collab.role === "admin" && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-primary/20 text-primary border-0 shrink-0">
                        Admin
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{collab.email || "-"}</p>
                  {collab.phone && (
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Phone className="h-2.5 w-2.5" /> {collab.phone}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {user?.role === "admin" && (
                    <button
                      onClick={(e) => handleEdit(collab, e)}
                      className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-muted/50 transition-colors opacity-0 group-hover:opacity-100"
                      title="Editar colaborador"
                    >
                      <Pencil className="h-3 w-3 text-muted-foreground" />
                    </button>
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </div>

              {/* Task Stats */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="text-center rounded-lg bg-orange-500/10 py-2 px-1">
                  <p className="text-lg font-bold text-orange-500">{collab.pendingTasks ?? 0}</p>
                  <p className="text-[10px] text-muted-foreground">Pendentes</p>
                </div>
                <div className="text-center rounded-lg bg-blue-500/10 py-2 px-1">
                  <p className="text-lg font-bold text-blue-500">{collab.inProgressTasks ?? 0}</p>
                  <p className="text-[10px] text-muted-foreground">Andamento</p>
                </div>
                <div className="text-center rounded-lg bg-emerald-500/10 py-2 px-1">
                  <p className="text-lg font-bold text-emerald-500">{collab.completedTasks ?? 0}</p>
                  <p className="text-[10px] text-muted-foreground">Concluídas</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" /> Progresso
                  </span>
                  <span className="font-medium">{completionRate}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500 transition-all duration-500"
                    style={{ width: `${completionRate}%` }}
                  />
                </div>
              </div>

              {/* Points */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/20">
                <span className="text-xs text-muted-foreground">Pontuação</span>
                <span className="flex items-center gap-1 text-sm font-semibold text-primary">
                  <Zap className="h-3.5 w-3.5" />
                  {collab.totalPoints ?? 0}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && !isLoading && (
        <div className="text-center py-16">
          <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">
            {search ? "Nenhum colaborador encontrado" : "Nenhum colaborador cadastrado"}
          </p>
        </div>
      )}

      {/* Edit User Dialog */}
      <Dialog open={!!editUser} onOpenChange={(open) => { if (!open) setEditUser(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Colaborador</DialogTitle>
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
                onChange={e => setEditForm(f => ({ ...f, phone: formatPhone(e.target.value) }))}
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
