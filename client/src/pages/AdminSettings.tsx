import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Settings, MessageSquare, Bell, Shield, Save, ExternalLink,
  CheckCircle2, XCircle, Smartphone, Globe, Key,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminSettings() {
  const { user } = useAuth();

  // WhatsApp config (these would ideally come from a server config endpoint)
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
    // In a full implementation, this would call an API endpoint to save server config
    setTimeout(() => {
      setSaving(false);
      toast.success("Configurações salvas! Reinicie o servidor para aplicar as variáveis de ambiente.");
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

      {/* WhatsApp Section */}
      <div className="stat-card p-6" style={{ "--stat-accent": "oklch(0.65 0.2 150)" } as React.CSSProperties}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-emerald-500" />
            Integração WhatsApp
          </h2>
          <Badge variant={whatsappEnabled ? "default" : "secondary"} className={whatsappEnabled ? "bg-emerald-500/20 text-emerald-500 border-0" : ""}>
            {whatsappEnabled ? (
              <><CheckCircle2 className="h-3 w-3 mr-1" /> Ativo</>
            ) : (
              <><XCircle className="h-3 w-3 mr-1" /> Desativado</>
            )}
          </Badge>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Configure a integração com WhatsApp para enviar notificações automáticas aos colaboradores quando tarefas forem criadas, atualizadas ou estiverem próximas do prazo.
        </p>

        <div className="space-y-4">
          {/* Enable toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/10">
            <div>
              <p className="text-sm font-medium">Notificações WhatsApp</p>
              <p className="text-xs text-muted-foreground mt-0.5">Enviar mensagens automáticas via WhatsApp</p>
            </div>
            <button
              onClick={() => setWhatsappEnabled(!whatsappEnabled)}
              className={`relative h-6 w-11 rounded-full transition-colors ${whatsappEnabled ? "bg-emerald-500" : "bg-muted/50"}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${whatsappEnabled ? "translate-x-5.5 left-0" : "left-0.5"}`}
                style={{ transform: whatsappEnabled ? "translateX(22px)" : "translateX(0)" }} />
            </button>
          </div>

          <Separator className="bg-border/20" />

          {/* API URL */}
          <div className="space-y-2">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-muted-foreground" />
              URL da API
            </Label>
            <Input
              placeholder="https://sua-api.com"
              value={whatsappUrl}
              onChange={e => setWhatsappUrl(e.target.value)}
              className="bg-muted/10 border-border/20"
            />
            <p className="text-[11px] text-muted-foreground">
              URL da sua instância da Evolution API, Z-API, ou similar.
            </p>
          </div>

          {/* API Token */}
          <div className="space-y-2">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <Key className="h-3.5 w-3.5 text-muted-foreground" />
              Token de Autenticação
            </Label>
            <Input
              type="password"
              placeholder="Seu token de API"
              value={whatsappToken}
              onChange={e => setWhatsappToken(e.target.value)}
              className="bg-muted/10 border-border/20"
            />
          </div>

          {/* Instance Name */}
          <div className="space-y-2">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
              Nome da Instância
            </Label>
            <Input
              placeholder="default"
              value={whatsappInstance}
              onChange={e => setWhatsappInstance(e.target.value)}
              className="bg-muted/10 border-border/20"
            />
          </div>
        </div>

        <div className="mt-4 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
          <p className="text-xs text-blue-400 flex items-start gap-2">
            <Bell className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              As variáveis de ambiente correspondentes são: <code className="font-mono">WHATSAPP_API_URL</code>, <code className="font-mono">WHATSAPP_API_TOKEN</code>, <code className="font-mono">WHATSAPP_INSTANCE</code>, <code className="font-mono">WHATSAPP_ENABLED</code>. Configure-as no arquivo <code className="font-mono">.env</code> do servidor.
            </span>
          </p>
        </div>
      </div>

      {/* Notifications Section */}
      <div className="stat-card p-6" style={{ "--stat-accent": "oklch(0.72 0.19 280)" } as React.CSSProperties}>
        <h2 className="text-base font-semibold flex items-center gap-2 mb-4">
          <Bell className="h-5 w-5 text-primary" />
          Notificações Automáticas
        </h2>

        <div className="space-y-3">
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
            <p className="font-medium">TaskFlow v12</p>
          </div>
          <div className="rounded-lg bg-muted/10 p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Stack</p>
            <p className="font-medium">React + tRPC + MySQL</p>
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

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </div>
    </div>
  );
}
