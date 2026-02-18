import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Settings, MessageSquare, Bell, Shield, Save, UserPlus,
  CheckCircle2, XCircle, Smartphone, Globe, Key, Trash2, Loader2, Users,
  Star, Trophy, Plus, Minus,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type Collaborator = {
  id: number;
  name: string | null;
  email: string | null;
  role: string | null;
  totalPoints: number;
  totalTasks: number | null;
  [key: string]: unknown;
};

function PointsManager({ collaborators }: { collaborators: Collaborator[] }) {
  const utils = trpc.useUtils();
  const [selectedUser, setSelectedUser] = useState<number | "">("");
  const [pointsAmount, setPointsAmount] = useState("");
  const [reason, setReason] = useState("");
  const [isPositive, setIsPositive] = useState(true);

  const adjustPointsMutation = trpc.gamification.adjustPoints.useMutation({
    onSuccess: (data) => {
      const badges = data.newBadges;
      toast.success(
        `Pontos ${isPositive ? "concedidos" : "removidos"} com sucesso!` +
        (badges && badges.length > 0 ? ` Novos badges: ${badges.join(", ")}` : "")
      );
      utils.collaborators.listWithStats.invalidate();
      utils.gamification.ranking.invalidate();
      setPointsAmount("");
      setReason("");
      setSelectedUser("");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pts = parseInt(pointsAmount);
    if (!selectedUser || !pts || !reason.trim()) return;
    adjustPointsMutation.mutate({
      userId: selectedUser as number,
      points: isPositive ? pts : -pts,
      reason: reason.trim(),
    });
  };

  return (
    <div className="stat-card p-6" style={{ "--stat-accent": "oklch(0.75 0.18 50)" } as React.CSSProperties}>
      <h2 className="text-base font-semibold flex items-center gap-2 mb-4">
        <Trophy className="h-5 w-5 text-amber-400" />
        Gerenciar Pontos
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Conceda ou remova pontos dos colaboradores manualmente.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Colaborador</Label>
          <select
            value={selectedUser}
            onChange={e => setSelectedUser(e.target.value ? parseInt(e.target.value) : "")}
            required
            className="w-full h-9 px-3 rounded-md border border-border/20 bg-muted/10 text-sm text-foreground"
          >
            <option value="">Selecione um colaborador</option>
            {collaborators.map(c => (
              <option key={c.id} value={c.id}>{c.name} ({c.totalPoints} pts)</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Tipo</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsPositive(true)}
                className={`flex-1 h-9 rounded-md text-sm font-medium flex items-center justify-center gap-1.5 transition-colors ${isPositive ? "bg-emerald-500/20 text-emerald-500 border border-emerald-500/30" : "bg-muted/10 text-muted-foreground border border-border/20"}`}
              >
                <Plus className="h-3.5 w-3.5" /> Dar
              </button>
              <button
                type="button"
                onClick={() => setIsPositive(false)}
                className={`flex-1 h-9 rounded-md text-sm font-medium flex items-center justify-center gap-1.5 transition-colors ${!isPositive ? "bg-red-500/20 text-red-500 border border-red-500/30" : "bg-muted/10 text-muted-foreground border border-border/20"}`}
              >
                <Minus className="h-3.5 w-3.5" /> Tirar
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Quantidade</Label>
            <Input
              type="number"
              min="1"
              max="1000"
              placeholder="Ex: 50"
              value={pointsAmount}
              onChange={e => setPointsAmount(e.target.value)}
              required
              className="bg-muted/10 border-border/20"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Motivo</Label>
          <Input
            placeholder="Ex: Entrega excepcional do projeto X"
            value={reason}
            onChange={e => setReason(e.target.value)}
            required
            className="bg-muted/10 border-border/20"
          />
        </div>
        <Button type="submit" disabled={adjustPointsMutation.isPending} className="gap-2">
          {adjustPointsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />}
          {isPositive ? "Conceder Pontos" : "Remover Pontos"}
        </Button>
      </form>
    </div>
  );
}

export default function AdminSettings() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  // Collaborators
  const { data: collaborators, isLoading: collabLoading } = trpc.collaborators.listWithStats.useQuery();
  const createUserMutation = trpc.users.create.useMutation({
    onSuccess: () => {
      toast.success("Colaborador cadastrado com sucesso!");
      utils.collaborators.listWithStats.invalidate();
      utils.users.list.invalidate();
      setNewName("");
      setNewEmail("");
      setNewPassword("");
      setNewRole("user");
    },
    onError: (err) => toast.error(err.message),
  });
  const deleteUserMutation = trpc.users.delete.useMutation({
    onSuccess: () => {
      toast.success("Colaborador removido");
      utils.collaborators.listWithStats.invalidate();
      utils.users.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"user" | "admin">("user");

  // WhatsApp config
  const [whatsappUrl, setWhatsappUrl] = useState("");
  const [whatsappToken, setWhatsappToken] = useState("");
  const [whatsappInstance, setWhatsappInstance] = useState("default");
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  if (user?.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground">
        <Shield className="h-16 w-16 opacity-20 mb-4" />
        <p className="text-lg font-medium">Acesso restrito</p>
        <p className="text-sm mt-1">Somente administradores podem acessar as configurações.</p>
      </div>
    );
  }

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newEmail || !newPassword) return;
    createUserMutation.mutate({ name: newName, email: newEmail, password: newPassword, role: newRole });
  };

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success("Configurações salvas!");
    }, 500);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          Configurações
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gerencie as configurações do sistema TaskFlow.
        </p>
      </div>

      {/* Collaborator Registration */}
      <div className="stat-card p-6" style={{ "--stat-accent": "oklch(0.72 0.19 280)" } as React.CSSProperties}>
        <h2 className="text-base font-semibold flex items-center gap-2 mb-4">
          <UserPlus className="h-5 w-5 text-primary" />
          Cadastrar Colaborador
        </h2>
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Nome</Label>
              <Input placeholder="Nome completo" value={newName} onChange={e => setNewName(e.target.value)} required className="bg-muted/10 border-border/20" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Email</Label>
              <Input type="email" placeholder="email@exemplo.com" value={newEmail} onChange={e => setNewEmail(e.target.value)} required className="bg-muted/10 border-border/20" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Senha</Label>
              <Input type="password" placeholder="Mínimo 6 caracteres" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6} className="bg-muted/10 border-border/20" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Função</Label>
              <select
                value={newRole}
                onChange={e => setNewRole(e.target.value as "user" | "admin")}
                className="w-full h-9 px-3 rounded-md border border-border/20 bg-muted/10 text-sm text-foreground"
              >
                <option value="user">Colaborador</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
          </div>
          <Button type="submit" disabled={createUserMutation.isPending} className="gap-2">
            {createUserMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Cadastrar
          </Button>
        </form>
      </div>

      {/* Collaborator List */}
      <div className="stat-card p-6" style={{ "--stat-accent": "oklch(0.65 0.18 240)" } as React.CSSProperties}>
        <h2 className="text-base font-semibold flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-blue-400" />
          Colaboradores ({collaborators?.length ?? 0})
        </h2>
        {collabLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-2">
            {collaborators?.map(c => (
              <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/10">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-primary">{(c.name ?? "?")[0]?.toUpperCase()}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      {c.role === "admin" && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-primary/20 text-primary border-0">Admin</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-muted-foreground">{c.totalTasks ?? 0} tarefas</p>
                    <p className="text-xs font-medium text-primary">{c.totalPoints} pts</p>
                  </div>
                  {c.id !== user?.id && (
                    <button
                      onClick={() => {
                        if (confirm(`Remover ${c.name}?`)) {
                          deleteUserMutation.mutate({ id: c.id });
                        }
                      }}
                      className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Points Management */}
      <PointsManager collaborators={collaborators ?? []} />

      {/* WhatsApp Section */}
      <div className="stat-card p-6" style={{ "--stat-accent": "oklch(0.65 0.2 150)" } as React.CSSProperties}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-emerald-500" />
            Integração WhatsApp
          </h2>
          <Badge variant={whatsappEnabled ? "default" : "secondary"} className={whatsappEnabled ? "bg-emerald-500/20 text-emerald-500 border-0" : ""}>
            {whatsappEnabled ? <><CheckCircle2 className="h-3 w-3 mr-1" /> Ativo</> : <><XCircle className="h-3 w-3 mr-1" /> Desativado</>}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Configure a integração com WhatsApp para notificações automáticas.</p>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/10">
            <div>
              <p className="text-sm font-medium">Notificações WhatsApp</p>
              <p className="text-xs text-muted-foreground mt-0.5">Enviar mensagens automáticas via WhatsApp</p>
            </div>
            <button onClick={() => setWhatsappEnabled(!whatsappEnabled)}
              className={`relative h-6 w-11 rounded-full transition-colors ${whatsappEnabled ? "bg-emerald-500" : "bg-muted/50"}`}>
              <span className="absolute top-0.5 h-5 w-5 rounded-full bg-background shadow-sm transition-transform border border-border/20"
                style={{ transform: whatsappEnabled ? "translateX(22px)" : "translateX(2px)" }} />
            </button>
          </div>
          <Separator className="bg-border/20" />
          <div className="space-y-2">
            <Label className="text-xs font-medium flex items-center gap-1.5"><Globe className="h-3.5 w-3.5 text-muted-foreground" />URL da API</Label>
            <Input placeholder="https://sua-api.com" value={whatsappUrl} onChange={e => setWhatsappUrl(e.target.value)} className="bg-muted/10 border-border/20" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium flex items-center gap-1.5"><Key className="h-3.5 w-3.5 text-muted-foreground" />Token</Label>
            <Input type="password" placeholder="Seu token" value={whatsappToken} onChange={e => setWhatsappToken(e.target.value)} className="bg-muted/10 border-border/20" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium flex items-center gap-1.5"><MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />Instância</Label>
            <Input placeholder="default" value={whatsappInstance} onChange={e => setWhatsappInstance(e.target.value)} className="bg-muted/10 border-border/20" />
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="stat-card p-6" style={{ "--stat-accent": "oklch(0.72 0.19 280)" } as React.CSSProperties}>
        <h2 className="text-base font-semibold flex items-center gap-2 mb-4">
          <Bell className="h-5 w-5 text-primary" />
          Notificações Automáticas
        </h2>
        <div className="space-y-2">
          {[
            { label: "Tarefa criada e atribuída", desc: "Notifica o colaborador quando recebe uma nova tarefa", active: true },
            { label: "Status alterado", desc: "Notifica quando outra pessoa altera o status da sua tarefa", active: true },
            { label: "Prazo próximo (24h)", desc: "Lembrete automático quando o prazo está em 24 horas", active: true },
            { label: "Tarefa atrasada", desc: "Alerta quando uma tarefa passa do prazo", active: true },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/10">
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
              </div>
              <div className={`h-2 w-2 rounded-full ${item.active ? "bg-emerald-500" : "bg-muted/50"}`} />
            </div>
          ))}
        </div>
      </div>

      {/* System Info */}
      <div className="stat-card p-6" style={{ "--stat-accent": "oklch(0.6 0.15 270)" } as React.CSSProperties}>
        <h2 className="text-base font-semibold flex items-center gap-2 mb-4">
          <Shield className="h-5 w-5 text-muted-foreground" />
          Informações do Sistema
        </h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-muted/10 p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Versão</p>
            <p className="font-medium">TaskFlow v13</p>
          </div>
          <div className="rounded-lg bg-muted/10 p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Stack</p>
            <p className="font-medium">Cloudflare Workers + D1</p>
          </div>
          <div className="rounded-lg bg-muted/10 p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Seu Role</p>
            <p className="font-medium capitalize">{user?.role}</p>
          </div>
          <div className="rounded-lg bg-muted/10 p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">ID</p>
            <p className="font-medium">#{user?.id}</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </div>
    </div>
  );
}
