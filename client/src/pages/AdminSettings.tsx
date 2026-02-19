import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Settings, MessageSquare, Bell, Shield, Save,
  CheckCircle2, XCircle, Smartphone, Globe, Key,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminSettings() {
  const { user } = useAuth();

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
          Gerencie as configurações do sistema Agenda do CEO.
        </p>
      </div>

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
            <p className="font-medium">Agenda do CEO v14</p>
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
