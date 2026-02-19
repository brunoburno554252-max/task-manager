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
  Users, UserPlus, Loader2, Pencil, Trash2, Phone, Mail, Shield,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Cadastros() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  // Registration dialog
  const [showRegister, setShowRegister] = useState(false);
  const [regForm, setRegForm] = useState({ name: "", email: "", password: "", phone: "", role: "user" as "user" | "admin" });

  // Edit dialog
  const [editUser, setEditUser] = useState<{ id: number; name: string; email: string; phone: string; role: string } | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "", role: "user" });

  const { data: collaborators, isLoading } = trpc.collaborators.listWithStats.useQuery();

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
              Gerencie os colaboradores do sistema.
            </p>
          </div>
        </div>
        <Button onClick={() => setShowRegister(true)} className="gap-2">
          <UserPlus className="h-4 w-4" /> Novo Colaborador
        </Button>
      </div>

      {/* User List - Simple */}
      <div className="rounded-xl bg-card/80 border border-border/30 overflow-hidden">
        <div className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_1fr_auto] gap-4 px-5 py-3 border-b border-border/30 bg-muted/30">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nome</span>
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:block">Email</span>
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ações</span>
        </div>

        {collaborators && collaborators.length > 0 ? (
          collaborators.map((collab) => {
            const initials = (collab.name || "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
            return (
              <div
                key={collab.id}
                className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_1fr_auto] gap-4 px-5 py-3 border-b border-border/10 hover:bg-muted/20 transition-colors items-center"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-9 w-9 shrink-0 border border-primary/20">
                    {(collab as any).avatarUrl ? (
                      <AvatarImage src={(collab as any).avatarUrl} alt={collab.name || ""} className="object-cover" />
                    ) : null}
                    <AvatarFallback className="text-xs font-bold bg-primary/15 text-primary">
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
                    </div>
                    <span className="text-xs text-muted-foreground truncate block sm:hidden">{collab.email || "-"}</span>
                  </div>
                </div>
                <span className="text-sm text-muted-foreground truncate hidden sm:block">{collab.email || "-"}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEdit(collab)}
                    className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted/50 transition-colors"
                    title="Editar colaborador"
                  >
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12">
            <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum colaborador cadastrado</p>
            <Button onClick={() => setShowRegister(true)} variant="outline" className="mt-4 gap-2">
              <UserPlus className="h-4 w-4" /> Cadastrar primeiro colaborador
            </Button>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        {collaborators?.length ?? 0} colaborador{(collaborators?.length ?? 0) !== 1 ? "es" : ""} cadastrado{(collaborators?.length ?? 0) !== 1 ? "s" : ""}
      </p>

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
