import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle, MessageSquare, ThumbsUp, Shield, Search, Plus, Eye,
  Clock, CheckCircle2, XCircle, Archive, Send, Filter, ChevronRight,
  MapPin, Calendar, User, Hash, Loader2, Lock, Globe, Megaphone,
  Phone, Mail, Building2, Tag, StickyNote, PhoneCall, MessageCircle,
  MailCheck, RefreshCw, Headphones, Smartphone, Monitor, Users,
} from "lucide-react";

// ===== OUVIDORIA LABELS =====
const typeLabels: Record<string, { label: string; color: string; icon: any }> = {
  reclamacao: { label: "Reclamação", color: "text-red-500 bg-red-500/10", icon: AlertTriangle },
  sugestao: { label: "Sugestão", color: "text-blue-500 bg-blue-500/10", icon: MessageSquare },
  elogio: { label: "Elogio", color: "text-emerald-500 bg-emerald-500/10", icon: ThumbsUp },
  denuncia: { label: "Denúncia", color: "text-amber-500 bg-amber-500/10", icon: Shield },
};

const categoryLabels: Record<string, string> = {
  atraso_diploma: "Atraso Diploma", atendimento_aluno: "Atendimento Aluno",
  atendimento_polo: "Atendimento Polo", estorno_devolucao: "Estorno ou Devolução",
  elogio: "Elogio", procon: "Procon", judicial: "Judicial",
  colaborador: "Colaborador", interno: "Interno", outros: "Outros",
};

const statusLabels: Record<string, { label: string; color: string; icon: any }> = {
  em_analise: { label: "Em Análise", color: "text-purple-500 bg-purple-500/10 border-purple-500/20", icon: Eye },
  resolvido: { label: "Resolvido", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20", icon: CheckCircle2 },
  encerrado_sem_resolucao: { label: "Encerrado s/ Resolução", color: "text-red-500 bg-red-500/10 border-red-500/20", icon: XCircle },
  aguardando_informacoes: { label: "Aguardando Info", color: "text-amber-500 bg-amber-500/10 border-amber-500/20", icon: Clock },
};

const priorityLabels: Record<string, { label: string; color: string }> = {
  baixa: { label: "Baixa", color: "text-slate-500 bg-slate-500/10" },
  media: { label: "Média", color: "text-blue-500 bg-blue-500/10" },
  alta: { label: "Alta", color: "text-orange-500 bg-orange-500/10" },
  urgente: { label: "Urgente", color: "text-red-500 bg-red-500/10" },
};

// ===== CHAMADOS EXTERNOS LABELS =====
const channelLabels: Record<string, { label: string; icon: any; color: string }> = {
  whatsapp: { label: "WhatsApp", icon: MessageCircle, color: "text-green-500 bg-green-500/10" },
  bitrix: { label: "Bitrix", icon: Monitor, color: "text-blue-500 bg-blue-500/10" },
  telefone: { label: "Telefone", icon: Phone, color: "text-purple-500 bg-purple-500/10" },
  email: { label: "E-mail", icon: Mail, color: "text-orange-500 bg-orange-500/10" },
  instagram: { label: "Instagram", icon: Smartphone, color: "text-pink-500 bg-pink-500/10" },
  presencial: { label: "Presencial", icon: Users, color: "text-cyan-500 bg-cyan-500/10" },
  outro: { label: "Outro", icon: Globe, color: "text-muted-foreground bg-muted/30" },
};

const ticketStatusLabels: Record<string, { label: string; color: string; icon: any }> = {
  aberto: { label: "Aberto", color: "text-blue-500 bg-blue-500/10 border-blue-500/20", icon: Clock },
  em_andamento: { label: "Em Andamento", color: "text-amber-500 bg-amber-500/10 border-amber-500/20", icon: Loader2 },
  aguardando: { label: "Aguardando", color: "text-purple-500 bg-purple-500/10 border-purple-500/20", icon: Clock },
  resolvido: { label: "Resolvido", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20", icon: CheckCircle2 },
  cancelado: { label: "Cancelado", color: "text-red-500 bg-red-500/10 border-red-500/20", icon: XCircle },
};

const ticketTypeLabels: Record<string, string> = {
  reclamacao: "Reclamação", duvida: "Dúvida", solicitacao: "Solicitação",
  sugestao: "Sugestão", informacao: "Informação", outro: "Outro",
};

const noteTypeLabels: Record<string, { label: string; icon: any; color: string }> = {
  nota: { label: "Anotação", icon: StickyNote, color: "text-slate-500 bg-slate-500/10" },
  resposta: { label: "Resposta ao cliente", icon: MessageSquare, color: "text-blue-500 bg-blue-500/10" },
  ligacao: { label: "Ligação realizada", icon: PhoneCall, color: "text-purple-500 bg-purple-500/10" },
  email_enviado: { label: "E-mail enviado", icon: MailCheck, color: "text-orange-500 bg-orange-500/10" },
  whatsapp_enviado: { label: "WhatsApp enviado", icon: MessageCircle, color: "text-green-500 bg-green-500/10" },
  atualizacao: { label: "Atualização", icon: RefreshCw, color: "text-cyan-500 bg-cyan-500/10" },
};

function getTimeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Agora";
  if (mins < 60) return `${mins}min atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d atrás`;
  return new Date(dateStr).toLocaleDateString("pt-BR");
}

type MainTab = "ouvidoria" | "chamados";

export default function OuvidoriaCEO() {
  const [mainTab, setMainTab] = useState<MainTab>("ouvidoria");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ouvidoria CEO</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie reclamações, chamados e registros externos.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted/30 rounded-xl border border-border/40 w-fit">
        <button onClick={() => setMainTab("ouvidoria")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${mainTab === "ouvidoria" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
          <Megaphone className="h-4 w-4" /> Ouvidoria
        </button>
        <button onClick={() => setMainTab("chamados")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${mainTab === "chamados" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
          <Headphones className="h-4 w-4" /> Chamados Externos
        </button>
      </div>

      {mainTab === "ouvidoria" ? <OuvidoriaTab /> : <ChamadosExternosTab />}
    </div>
  );
}

// ===== ABA OUVIDORIA (código existente) =====
function OuvidoriaTab() {
  const { data: user } = trpc.auth.me.useQuery();
  const isAdmin = user?.role === "admin";
  const { data: complaints, refetch } = trpc.complaints.list.useQuery(undefined);
  const { data: stats } = trpc.complaints.stats.useQuery(undefined, { enabled: isAdmin });
  const createMutation = trpc.complaints.create.useMutation({ onSuccess: () => { refetch(); setShowCreate(false); resetForm(); toast.success("Registro criado com sucesso!"); } });
  const updateStatusMutation = trpc.complaints.updateStatus.useMutation({ onSuccess: () => { refetch(); refetchDetail(); toast.success("Status atualizado!"); } });
  const respondMutation = trpc.complaints.respond.useMutation({ onSuccess: () => { refetchResponses(); setResponseText(""); toast.success("Resposta enviada!"); } });
  const resolveMutation = trpc.complaints.resolve.useMutation({ onSuccess: () => { refetch(); refetchDetail(); toast.success("Registro concluído!"); } });
  const deleteMutation = trpc.complaints.delete.useMutation({ onSuccess: () => { refetch(); setSelectedId(null); toast.success("Registro excluído!"); } });

  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [searchText, setSearchText] = useState("");
  const [responseText, setResponseText] = useState("");
  const [isInternalResponse, setIsInternalResponse] = useState(false);
  const [resolutionText, setResolutionText] = useState("");
  const [showResolve, setShowResolve] = useState(false);

  const [formType, setFormType] = useState<string>("reclamacao");
  const [formCategory, setFormCategory] = useState<string>("outros");
  const [formPriority, setFormPriority] = useState<string>("media");
  const [formSubject, setFormSubject] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formOccurrenceDate, setFormOccurrenceDate] = useState("");
  const [formOccurrenceLocation, setFormOccurrenceLocation] = useState("");
  const [formIsAnonymous, setFormIsAnonymous] = useState(false);
  const [formInvolvedName, setFormInvolvedName] = useState("");
  const [formInvolvedPhone, setFormInvolvedPhone] = useState("");

  const resetForm = () => {
    setFormType("reclamacao"); setFormCategory("outros"); setFormPriority("media");
    setFormSubject(""); setFormDescription(""); setFormOccurrenceDate("");
    setFormOccurrenceLocation(""); setFormIsAnonymous(false);
    setFormInvolvedName(""); setFormInvolvedPhone("");
  };

  const { data: detail, refetch: refetchDetail } = trpc.complaints.getById.useQuery(
    { id: selectedId! }, { enabled: !!selectedId }
  );
  const { data: responses, refetch: refetchResponses } = trpc.complaints.responses.useQuery(
    { complaintId: selectedId! }, { enabled: !!selectedId }
  );

  const filtered = (complaints || []).filter((c: any) => {
    if (filterStatus !== "all" && c.status !== filterStatus) return false;
    if (filterType !== "all" && c.type !== filterType) return false;
    if (searchText) {
      const s = searchText.toLowerCase();
      if (!c.subject.toLowerCase().includes(s) && !c.protocol.toLowerCase().includes(s) && !c.description.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{isAdmin ? "Gerencie reclamações, sugestões, elogios e denúncias." : "Registre e acompanhe suas manifestações."}</p>
        <Button onClick={() => setShowCreate(true)} className="gap-2"><Plus className="h-4 w-4" /> Novo Registro</Button>
      </div>

      {/* Stats Cards (admin only) */}
      {isAdmin && stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Object.entries(statusLabels).map(([key, val]) => {
            const count = (stats as any)[key] ?? 0;
            const Icon = val.icon;
            return (
              <button key={key} onClick={() => setFilterStatus(filterStatus === key ? "all" : key)}
                className={`p-3 rounded-xl border transition-all text-left ${filterStatus === key ? val.color + " border-current" : "bg-card border-border/40 hover:border-border"}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`h-4 w-4 ${filterStatus === key ? "" : "text-muted-foreground"}`} />
                  <span className="text-xs font-medium truncate">{val.label}</span>
                </div>
                <p className="text-xl font-bold">{count}</p>
              </button>
            );
          })}
        </div>
      )}

      {/* Type stats row (admin) */}
      {isAdmin && stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(typeLabels).map(([key, val]) => {
            const count = (stats as any)[key] ?? 0;
            const Icon = val.icon;
            return (
              <button key={key} onClick={() => setFilterType(filterType === key ? "all" : key)}
                className={`p-3 rounded-xl border transition-all text-left flex items-center gap-3 ${filterType === key ? val.color + " border-current" : "bg-card border-border/40 hover:border-border"}`}>
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${val.color}`}><Icon className="h-5 w-5" /></div>
                <div><p className="text-xs text-muted-foreground">{val.label}</p><p className="text-lg font-bold">{count}</p></div>
              </button>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por protocolo, assunto ou descrição..." value={searchText}
            onChange={(e) => setSearchText(e.target.value)} className="pl-10" />
        </div>
        {!isAdmin && (
          <>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[160px]"><Filter className="h-4 w-4 mr-2" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Tipos</SelectItem>
                {Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </>
        )}
      </div>

      {/* Complaints List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-xl border border-border/40">
            <Megaphone className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">Nenhum registro encontrado</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Clique em "Novo Registro" para criar</p>
          </div>
        ) : (
          filtered.map((c: any) => {
            const typeInfo = typeLabels[c.type] || typeLabels.reclamacao;
            const statusInfo = statusLabels[c.status] || statusLabels.em_analise;
            const priorityInfo = priorityLabels[c.priority] || priorityLabels.media;
            const TypeIcon = typeInfo.icon;
            const StatusIcon = statusInfo.icon;
            return (
              <div key={c.id} onClick={() => setSelectedId(c.id)}
                className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border/40 hover:border-border cursor-pointer transition-all group">
                <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${typeInfo.color}`}><TypeIcon className="h-5 w-5" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-mono text-muted-foreground">{c.protocol}</span>
                    {c.isAnonymous === 1 && <Badge variant="outline" className="text-[10px] h-4 px-1.5 gap-1"><Lock className="h-2.5 w-2.5" />Anônimo</Badge>}
                    {c.isExternal === 1 && <Badge variant="outline" className="text-[10px] h-4 px-1.5 gap-1"><Globe className="h-2.5 w-2.5" />Externo</Badge>}
                  </div>
                  <p className="font-medium text-sm truncate">{c.subject}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>{categoryLabels[c.category] || c.category}</span>
                    <span>{getTimeAgo(c.createdAt)}</span>
                    {c.authorName && !c.isAnonymous && <span className="flex items-center gap-1"><User className="h-3 w-3" />{c.authorName}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge className={`text-[11px] ${priorityInfo.color} border-0`}>{priorityInfo.label}</Badge>
                  <Badge className={`text-[11px] gap-1 ${statusInfo.color} border`}><StatusIcon className="h-3 w-3" />{statusInfo.label}</Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Registro - Ouvidoria</DialogTitle>
            <DialogDescription>Preencha os dados abaixo. Todos os registros são tratados com sigilo.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Tipo *</label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Categoria *</label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(categoryLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            {isAdmin && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Prioridade</label>
                <Select value={formPriority} onValueChange={setFormPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(priorityLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Assunto *</label>
              <Input placeholder="Resumo breve do registro" value={formSubject} onChange={(e) => setFormSubject(e.target.value)} maxLength={500} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Descrição detalhada *</label>
              <Textarea placeholder="Descreva com o máximo de detalhes possível..." value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)} rows={5} maxLength={10000} />
              <p className="text-xs text-muted-foreground mt-1">{formDescription.length}/10000</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block flex items-center gap-1"><Calendar className="h-3 w-3" />Data da ocorrência</label>
                <Input type="date" value={formOccurrenceDate} onChange={(e) => setFormOccurrenceDate(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block flex items-center gap-1"><MapPin className="h-3 w-3" />Local</label>
                <Input placeholder="Onde ocorreu?" value={formOccurrenceLocation} onChange={(e) => setFormOccurrenceLocation(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block flex items-center gap-1"><User className="h-3 w-3" />Nome Envolvido</label>
                <Input placeholder="Nome da pessoa envolvida" value={formInvolvedName} onChange={(e) => setFormInvolvedName(e.target.value)} maxLength={200} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block flex items-center gap-1"><Phone className="h-3 w-3" />Telefone Envolvido</label>
                <Input placeholder="(00) 00000-0000" value={formInvolvedPhone} onChange={(e) => setFormInvolvedPhone(e.target.value)} maxLength={50} />
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/40">
              <input type="checkbox" id="anonymous" checked={formIsAnonymous} onChange={(e) => setFormIsAnonymous(e.target.checked)} className="h-4 w-4 rounded border-border" />
              <label htmlFor="anonymous" className="text-sm cursor-pointer">
                <span className="font-medium flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" />Enviar anonimamente</span>
                <span className="text-xs text-muted-foreground block mt-0.5">Seu nome não será vinculado a este registro</span>
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={() => createMutation.mutate({
              type: formType as any, category: formCategory as any,
              priority: formPriority as any, subject: formSubject, description: formDescription,
              occurrenceDate: formOccurrenceDate || undefined,
              occurrenceLocation: formOccurrenceLocation || undefined,
              isAnonymous: formIsAnonymous,
              involvedName: formInvolvedName || undefined,
              involvedPhone: formInvolvedPhone || undefined,
            })} disabled={createMutation.isPending || !formSubject.trim() || formDescription.trim().length < 3}>
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Enviar Registro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!selectedId} onOpenChange={(open) => { if (!open) setSelectedId(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {detail && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-muted-foreground">{detail.protocol}</span>
                  {detail.isAnonymous === 1 && <Badge variant="outline" className="text-[10px] h-4 px-1.5 gap-1"><Lock className="h-2.5 w-2.5" />Anônimo</Badge>}
                  {detail.isExternal === 1 && <Badge variant="outline" className="text-[10px] h-4 px-1.5 gap-1"><Globe className="h-2.5 w-2.5" />Externo</Badge>}
                </div>
                <DialogTitle className="text-lg">{detail.subject}</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
                <div className="p-2.5 rounded-lg bg-muted/30">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Tipo</p>
                  <p className="text-sm font-medium mt-0.5">{typeLabels[detail.type]?.label || detail.type}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/30">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Categoria</p>
                  <p className="text-sm font-medium mt-0.5">{categoryLabels[detail.category] || detail.category}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/30">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Prioridade</p>
                  <Badge className={`text-[11px] mt-0.5 ${priorityLabels[detail.priority]?.color || ""} border-0`}>
                    {priorityLabels[detail.priority]?.label || detail.priority}
                  </Badge>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/30">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Status</p>
                  {isAdmin ? (
                    <Select value={detail.status} onValueChange={(val) => updateStatusMutation.mutate({ id: detail.id, status: val as any })}>
                      <SelectTrigger className="h-7 text-xs mt-0.5"><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                    </Select>
                  ) : (
                    <Badge className={`text-[11px] mt-0.5 ${statusLabels[detail.status]?.color || ""} border`}>
                      {statusLabels[detail.status]?.label || detail.status}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="space-y-2 mt-3">
                {detail.occurrenceDate && <div className="flex items-center gap-2 text-sm"><Calendar className="h-4 w-4 text-muted-foreground" /><span className="text-muted-foreground">Data da ocorrência:</span><span className="font-medium">{new Date(detail.occurrenceDate).toLocaleDateString("pt-BR")}</span></div>}
                {detail.occurrenceLocation && <div className="flex items-center gap-2 text-sm"><MapPin className="h-4 w-4 text-muted-foreground" /><span className="text-muted-foreground">Local:</span><span className="font-medium">{detail.occurrenceLocation}</span></div>}
                {isAdmin && detail.authorName && detail.isAnonymous !== 1 && <div className="flex items-center gap-2 text-sm"><User className="h-4 w-4 text-muted-foreground" /><span className="text-muted-foreground">Autor:</span><span className="font-medium">{detail.authorName}</span>{detail.authorEmail && <span className="text-muted-foreground">({detail.authorEmail})</span>}</div>}
                {isAdmin && detail.ipAddress && <div className="flex items-center gap-2 text-sm"><Globe className="h-4 w-4 text-muted-foreground" /><span className="text-muted-foreground">IP:</span><span className="font-mono text-xs">{detail.ipAddress}</span></div>}
                {detail.involvedName && <div className="flex items-center gap-2 text-sm"><User className="h-4 w-4 text-muted-foreground" /><span className="text-muted-foreground">Envolvido:</span><span className="font-medium">{detail.involvedName}</span></div>}
                {detail.involvedPhone && <div className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-muted-foreground" /><span className="text-muted-foreground">Tel. Envolvido:</span><span className="font-medium">{detail.involvedPhone}</span></div>}
                {detail.resolutionDate && <div className="flex items-center gap-2 text-sm"><Calendar className="h-4 w-4 text-emerald-500" /><span className="text-muted-foreground">Data da Resolução:</span><span className="font-medium text-emerald-500">{new Date(detail.resolutionDate).toLocaleDateString("pt-BR")}</span></div>}
                <div className="flex items-center gap-2 text-sm"><Clock className="h-4 w-4 text-muted-foreground" /><span className="text-muted-foreground">Registrado em:</span><span className="font-medium">{new Date(detail.createdAt).toLocaleString("pt-BR")}</span></div>
              </div>
              <div className="mt-4 p-4 rounded-xl bg-muted/20 border border-border/30">
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Descrição</p>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{detail.description}</p>
              </div>
              {detail.resolution && (
                <div className="mt-3 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                  <p className="text-xs font-medium text-emerald-600 mb-2 uppercase tracking-wider flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" /> Resolução</p>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{detail.resolution}</p>
                  {detail.resolvedAt && <p className="text-xs text-muted-foreground mt-2">Concluído em: {new Date(detail.resolvedAt).toLocaleString("pt-BR")}</p>}
                </div>
              )}
              <div className="mt-4">
                <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">Acompanhamento ({responses?.length || 0})</p>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {(responses || []).map((r: any) => (
                    <div key={r.id} className={`p-3 rounded-xl text-sm ${r.isInternal ? "bg-amber-500/5 border border-amber-500/20" : "bg-muted/20 border border-border/30"}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-xs flex items-center gap-1.5">{r.isInternal ? <Lock className="h-3 w-3 text-amber-500" /> : null}{r.userName || "Equipe Ouvidoria"}{r.isInternal ? <Badge variant="outline" className="text-[9px] h-3.5 px-1 text-amber-500">Interno</Badge> : null}</span>
                        <span className="text-[10px] text-muted-foreground">{getTimeAgo(r.createdAt)}</span>
                      </div>
                      <p className="whitespace-pre-wrap leading-relaxed">{r.message}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <Textarea placeholder="Escreva uma resposta..." value={responseText} onChange={(e) => setResponseText(e.target.value)} rows={2} className="flex-1" />
                  <div className="flex flex-col gap-1">
                    {isAdmin && (
                      <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground cursor-pointer">
                        <input type="checkbox" checked={isInternalResponse} onChange={(e) => setIsInternalResponse(e.target.checked)} className="h-3 w-3 rounded" />Interno
                      </label>
                    )}
                    <Button size="sm" onClick={() => respondMutation.mutate({ complaintId: selectedId!, message: responseText, isInternal: isInternalResponse })} disabled={!responseText.trim() || respondMutation.isPending}><Send className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              </div>
              {isAdmin && detail.status !== "resolvido" && (
                <div className="mt-4 pt-4 border-t border-border/30 flex gap-2">
                  <Button variant="outline" className="text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10" onClick={() => setShowResolve(true)}><CheckCircle2 className="h-4 w-4 mr-2" /> Concluir com Resolução</Button>
                  <Button variant="outline" className="text-red-500 border-red-500/30 hover:bg-red-500/10" onClick={() => { if (confirm("Excluir permanentemente este registro?")) deleteMutation.mutate({ id: detail.id }); }}><XCircle className="h-4 w-4 mr-2" /> Excluir</Button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Resolve Dialog */}
      <Dialog open={showResolve} onOpenChange={setShowResolve}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Concluir Registro</DialogTitle>
            <DialogDescription>Escreva a resolução final para este registro.</DialogDescription>
          </DialogHeader>
          <Textarea placeholder="Descreva como o caso foi resolvido..." value={resolutionText} onChange={(e) => setResolutionText(e.target.value)} rows={5} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResolve(false)}>Cancelar</Button>
            <Button onClick={() => { resolveMutation.mutate({ id: selectedId!, resolution: resolutionText }); setShowResolve(false); }} disabled={resolutionText.length < 3}><CheckCircle2 className="h-4 w-4 mr-2" /> Concluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ===== ABA CHAMADOS EXTERNOS =====
function ChamadosExternosTab() {
  const { data: user } = trpc.auth.me.useQuery();
  const { data: users } = trpc.users.list.useQuery();
  const isAdmin = user?.role === "admin";
  const { data: tickets, refetch } = trpc.externalTickets.list.useQuery(undefined);
  const { data: stats } = trpc.externalTickets.stats.useQuery(undefined);
  const createMutation = trpc.externalTickets.create.useMutation({ onSuccess: () => { refetch(); setShowCreate(false); resetForm(); toast.success("Chamado registrado com sucesso!"); } });
  const updateStatusMutation = trpc.externalTickets.updateStatus.useMutation({ onSuccess: () => { refetch(); refetchDetail(); toast.success("Status atualizado!"); } });
  const addNoteMutation = trpc.externalTickets.addNote.useMutation({ onSuccess: () => { refetchNotes(); setNoteText(""); toast.success("Nota adicionada!"); } });
  const deleteMutation = trpc.externalTickets.delete.useMutation({ onSuccess: () => { refetch(); setSelectedId(null); toast.success("Chamado excluído!"); } });

  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterChannel, setFilterChannel] = useState<string>("all");
  const [searchText, setSearchText] = useState("");
  const [noteText, setNoteText] = useState("");
  const [noteType, setNoteType] = useState("nota");
  const [showResolve, setShowResolve] = useState(false);
  const [resolutionText, setResolutionText] = useState("");

  // Form state
  const [fChannel, setFChannel] = useState("whatsapp");
  const [fType, setFType] = useState("reclamacao");
  const [fPriority, setFPriority] = useState("media");
  const [fContactName, setFContactName] = useState("");
  const [fContactPhone, setFContactPhone] = useState("");
  const [fContactEmail, setFContactEmail] = useState("");
  const [fContactCompany, setFContactCompany] = useState("");
  const [fSubject, setFSubject] = useState("");
  const [fDescription, setFDescription] = useState("");
  const [fReceivedAt, setFReceivedAt] = useState("");
  const [fDueDate, setFDueDate] = useState("");
  const [fAssignedTo, setFAssignedTo] = useState<string>("");
  const [fTags, setFTags] = useState("");

  const resetForm = () => {
    setFChannel("whatsapp"); setFType("reclamacao"); setFPriority("media");
    setFContactName(""); setFContactPhone(""); setFContactEmail("");
    setFContactCompany(""); setFSubject(""); setFDescription("");
    setFReceivedAt(""); setFDueDate(""); setFAssignedTo(""); setFTags("");
  };

  const { data: detail, refetch: refetchDetail } = trpc.externalTickets.getById.useQuery(
    { id: selectedId! }, { enabled: !!selectedId }
  );
  const { data: notes, refetch: refetchNotes } = trpc.externalTickets.notes.useQuery(
    { ticketId: selectedId! }, { enabled: !!selectedId }
  );

  const filtered = (tickets || []).filter((t: any) => {
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (filterChannel !== "all" && t.channel !== filterChannel) return false;
    if (searchText) {
      const s = searchText.toLowerCase();
      if (!t.subject.toLowerCase().includes(s) && !t.protocol.toLowerCase().includes(s) && !t.contactName.toLowerCase().includes(s) && !(t.description || "").toLowerCase().includes(s)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Registre e acompanhe chamados recebidos via WhatsApp, Bitrix, telefone, e-mail, etc.</p>
        <Button onClick={() => setShowCreate(true)} className="gap-2"><Plus className="h-4 w-4" /> Novo Chamado</Button>
      </div>

      {/* Stats por status */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {Object.entries(ticketStatusLabels).map(([key, val]) => {
            const count = (stats as any)[key] ?? 0;
            const Icon = val.icon;
            return (
              <button key={key} onClick={() => setFilterStatus(filterStatus === key ? "all" : key)}
                className={`p-3 rounded-xl border transition-all text-left ${filterStatus === key ? val.color + " border-current" : "bg-card border-border/40 hover:border-border"}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`h-4 w-4 ${filterStatus === key ? "" : "text-muted-foreground"}`} />
                  <span className="text-xs font-medium">{val.label}</span>
                </div>
                <p className="text-xl font-bold">{count}</p>
              </button>
            );
          })}
        </div>
      )}

      {/* Stats por canal */}
      {stats && (
        <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
          {Object.entries(channelLabels).map(([key, val]) => {
            const count = (stats as any)[key] ?? 0;
            const Icon = val.icon;
            return (
              <button key={key} onClick={() => setFilterChannel(filterChannel === key ? "all" : key)}
                className={`p-2.5 rounded-xl border transition-all text-center ${filterChannel === key ? val.color + " border-current" : "bg-card border-border/40 hover:border-border"}`}>
                <Icon className={`h-5 w-5 mx-auto mb-1 ${filterChannel === key ? "" : "text-muted-foreground"}`} />
                <p className="text-[10px] font-medium truncate">{val.label}</p>
                <p className="text-lg font-bold">{count}</p>
              </button>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por protocolo, assunto, contato..." value={searchText}
            onChange={(e) => setSearchText(e.target.value)} className="pl-10" />
        </div>
      </div>

      {/* Tickets List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-xl border border-border/40">
            <Headphones className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">Nenhum chamado encontrado</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Clique em "Novo Chamado" para registrar</p>
          </div>
        ) : (
          filtered.map((t: any) => {
            const channelInfo = channelLabels[t.channel] || channelLabels.outro;
            const statusInfo = ticketStatusLabels[t.status] || ticketStatusLabels.aberto;
            const priorityInfo = priorityLabels[t.priority] || priorityLabels.media;
            const ChannelIcon = channelInfo.icon;
            const StatusIcon = statusInfo.icon;
            return (
              <div key={t.id} onClick={() => setSelectedId(t.id)}
                className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border/40 hover:border-border cursor-pointer transition-all group">
                <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${channelInfo.color}`}><ChannelIcon className="h-5 w-5" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-mono text-muted-foreground">{t.protocol}</span>
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5">{channelInfo.label}</Badge>
                  </div>
                  <p className="font-medium text-sm truncate">{t.subject}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><User className="h-3 w-3" />{t.contactName}</span>
                    {t.contactPhone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{t.contactPhone}</span>}
                    <span>{getTimeAgo(t.createdAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge className={`text-[11px] ${priorityInfo.color} border-0`}>{priorityInfo.label}</Badge>
                  <Badge className={`text-[11px] gap-1 ${statusInfo.color} border`}><StatusIcon className="h-3 w-3" />{statusInfo.label}</Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Chamado Externo</DialogTitle>
            <DialogDescription>Registre um chamado recebido por WhatsApp, telefone, e-mail, etc.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Canal e Tipo */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Canal de origem *</label>
                <Select value={fChannel} onValueChange={setFChannel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(channelLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Tipo *</label>
                <Select value={fType} onValueChange={setFType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(ticketTypeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            {/* Prioridade */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Prioridade</label>
              <Select value={fPriority} onValueChange={setFPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(priorityLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {/* Dados do contato */}
            <div className="p-3 rounded-xl bg-muted/20 border border-border/30 space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> Dados do Solicitante</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Nome *</label>
                  <Input placeholder="Nome do contato" value={fContactName} onChange={(e) => setFContactName(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Telefone</label>
                  <Input placeholder="(XX) XXXXX-XXXX" value={fContactPhone} onChange={(e) => setFContactPhone(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">E-mail</label>
                  <Input placeholder="email@exemplo.com" value={fContactEmail} onChange={(e) => setFContactEmail(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Empresa</label>
                  <Input placeholder="Empresa do contato" value={fContactCompany} onChange={(e) => setFContactCompany(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Assunto e Descrição */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Assunto *</label>
              <Input placeholder="Resumo do chamado" value={fSubject} onChange={(e) => setFSubject(e.target.value)} maxLength={500} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Descrição / Relato *</label>
              <Textarea placeholder="Descreva o que o solicitante relatou, copie a mensagem do WhatsApp, etc..." value={fDescription}
                onChange={(e) => setFDescription(e.target.value)} rows={5} maxLength={10000} />
            </div>

            {/* Datas */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block flex items-center gap-1"><Calendar className="h-3 w-3" />Recebido em</label>
                <Input type="datetime-local" value={fReceivedAt} onChange={(e) => setFReceivedAt(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block flex items-center gap-1"><Clock className="h-3 w-3" />Prazo para resposta</label>
                <Input type="datetime-local" value={fDueDate} onChange={(e) => setFDueDate(e.target.value)} />
              </div>
            </div>

            {/* Responsável */}
            {isAdmin && users && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Responsável</label>
                <Select value={fAssignedTo} onValueChange={setFAssignedTo}>
                  <SelectTrigger><SelectValue placeholder="Selecionar responsável" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {users.map((u: any) => <SelectItem key={u.id} value={String(u.id)}>{u.name || u.email}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Tags */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block flex items-center gap-1"><Tag className="h-3 w-3" />Tags (separadas por vírgula)</label>
              <Input placeholder="Ex: urgente, financeiro, suporte" value={fTags} onChange={(e) => setFTags(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={() => createMutation.mutate({
              channel: fChannel as any, type: fType as any, priority: fPriority as any,
              contactName: fContactName, contactPhone: fContactPhone || undefined,
              contactEmail: fContactEmail || undefined, contactCompany: fContactCompany || undefined,
              subject: fSubject, description: fDescription,
              receivedAt: fReceivedAt ? new Date(fReceivedAt).toISOString() : undefined,
              dueDate: fDueDate || undefined,
              assignedToId: fAssignedTo && fAssignedTo !== "none" ? Number(fAssignedTo) : undefined,
              tags: fTags || undefined,
            })} disabled={createMutation.isPending || !fContactName.trim() || !fSubject.trim() || fDescription.trim().length < 3}>
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Registrar Chamado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!selectedId} onOpenChange={(open) => { if (!open) setSelectedId(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {detail && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-muted-foreground">{detail.protocol}</span>
                  {(() => { const ch = channelLabels[detail.channel]; const ChIcon = ch?.icon; return ch ? <Badge variant="outline" className={`text-[10px] h-4 px-1.5 gap-1 ${ch.color}`}><ChIcon className="h-2.5 w-2.5" />{ch.label}</Badge> : null; })()}
                </div>
                <DialogTitle className="text-lg">{detail.subject}</DialogTitle>
              </DialogHeader>

              {/* Meta info */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
                <div className="p-2.5 rounded-lg bg-muted/30">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Tipo</p>
                  <p className="text-sm font-medium mt-0.5">{ticketTypeLabels[detail.type] || detail.type}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/30">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Prioridade</p>
                  <Badge className={`text-[11px] mt-0.5 ${priorityLabels[detail.priority]?.color || ""} border-0`}>
                    {priorityLabels[detail.priority]?.label || detail.priority}
                  </Badge>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/30">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Status</p>
                  <Select value={detail.status} onValueChange={(val) => updateStatusMutation.mutate({ id: detail.id, status: val as any })}>
                    <SelectTrigger className="h-7 text-xs mt-0.5"><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(ticketStatusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/30">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Registrado por</p>
                  <p className="text-sm font-medium mt-0.5">{detail.registeredByName || "—"}</p>
                </div>
              </div>

              {/* Dados do contato */}
              <div className="mt-3 p-3 rounded-xl bg-primary/5 border border-primary/10 space-y-1.5">
                <p className="text-xs font-medium text-primary uppercase tracking-wider flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> Solicitante</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2"><User className="h-3.5 w-3.5 text-muted-foreground" /><span className="font-medium">{detail.contactName}</span></div>
                  {detail.contactPhone && <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground" /><span>{detail.contactPhone}</span></div>}
                  {detail.contactEmail && <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-muted-foreground" /><span>{detail.contactEmail}</span></div>}
                  {detail.contactCompany && <div className="flex items-center gap-2"><Building2 className="h-3.5 w-3.5 text-muted-foreground" /><span>{detail.contactCompany}</span></div>}
                </div>
              </div>

              {/* Extra info */}
              <div className="space-y-2 mt-3">
                {detail.assignedToName && <div className="flex items-center gap-2 text-sm"><User className="h-4 w-4 text-muted-foreground" /><span className="text-muted-foreground">Responsável:</span><span className="font-medium">{detail.assignedToName}</span></div>}
                {detail.dueDate && <div className="flex items-center gap-2 text-sm"><Clock className="h-4 w-4 text-muted-foreground" /><span className="text-muted-foreground">Prazo:</span><span className="font-medium">{new Date(detail.dueDate).toLocaleString("pt-BR")}</span></div>}
                <div className="flex items-center gap-2 text-sm"><Calendar className="h-4 w-4 text-muted-foreground" /><span className="text-muted-foreground">Recebido em:</span><span className="font-medium">{new Date(detail.receivedAt).toLocaleString("pt-BR")}</span></div>
                <div className="flex items-center gap-2 text-sm"><Clock className="h-4 w-4 text-muted-foreground" /><span className="text-muted-foreground">Registrado em:</span><span className="font-medium">{new Date(detail.createdAt).toLocaleString("pt-BR")}</span></div>
                {detail.tags && <div className="flex items-center gap-2 text-sm flex-wrap"><Tag className="h-4 w-4 text-muted-foreground" />{detail.tags.split(",").map((tag: string, i: number) => <Badge key={i} variant="outline" className="text-[10px]">{tag.trim()}</Badge>)}</div>}
              </div>

              {/* Description */}
              <div className="mt-4 p-4 rounded-xl bg-muted/20 border border-border/30">
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Relato / Descrição</p>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{detail.description}</p>
              </div>

              {/* Resolution */}
              {detail.resolution && (
                <div className="mt-3 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                  <p className="text-xs font-medium text-emerald-600 mb-2 uppercase tracking-wider flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" /> Resolução</p>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{detail.resolution}</p>
                  {detail.resolvedAt && <p className="text-xs text-muted-foreground mt-2">Resolvido em: {new Date(detail.resolvedAt).toLocaleString("pt-BR")}</p>}
                </div>
              )}

              {/* Notes / Timeline */}
              <div className="mt-4">
                <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">Notas e Acompanhamento ({notes?.length || 0})</p>
                <div className="space-y-2 max-h-[250px] overflow-y-auto">
                  {(notes || []).map((n: any) => {
                    const nType = noteTypeLabels[n.noteType] || noteTypeLabels.nota;
                    const NIcon = nType.icon;
                    return (
                      <div key={n.id} className="p-3 rounded-xl text-sm bg-muted/20 border border-border/30">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-xs flex items-center gap-1.5">
                            <NIcon className={`h-3 w-3 ${nType.color.split(" ")[0]}`} />
                            <Badge variant="outline" className={`text-[9px] h-3.5 px-1 ${nType.color}`}>{nType.label}</Badge>
                            {n.userName || "Sistema"}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{getTimeAgo(n.createdAt)}</span>
                        </div>
                        <p className="whitespace-pre-wrap leading-relaxed">{n.content}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Add note */}
                <div className="mt-3 space-y-2">
                  <div className="flex gap-2">
                    <Select value={noteType} onValueChange={setNoteType}>
                      <SelectTrigger className="w-[180px] h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(noteTypeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Textarea placeholder="Adicionar nota, registro de ligação, resposta enviada..." value={noteText} onChange={(e) => setNoteText(e.target.value)} rows={2} className="flex-1" />
                    <Button size="sm" className="self-end" onClick={() => addNoteMutation.mutate({ ticketId: selectedId!, content: noteText, noteType: noteType as any })} disabled={!noteText.trim() || addNoteMutation.isPending}>
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Actions */}
              {detail.status !== "resolvido" && detail.status !== "cancelado" && (
                <div className="mt-4 pt-4 border-t border-border/30 flex gap-2">
                  <Button variant="outline" className="text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10" onClick={() => setShowResolve(true)}>
                    <CheckCircle2 className="h-4 w-4 mr-2" /> Resolver
                  </Button>
                  {isAdmin && (
                    <Button variant="outline" className="text-red-500 border-red-500/30 hover:bg-red-500/10" onClick={() => { if (confirm("Excluir permanentemente este chamado?")) deleteMutation.mutate({ id: detail.id }); }}>
                      <XCircle className="h-4 w-4 mr-2" /> Excluir
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Resolve Dialog */}
      <Dialog open={showResolve} onOpenChange={setShowResolve}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolver Chamado</DialogTitle>
            <DialogDescription>Descreva como o chamado foi resolvido.</DialogDescription>
          </DialogHeader>
          <Textarea placeholder="Descreva a resolução..." value={resolutionText} onChange={(e) => setResolutionText(e.target.value)} rows={5} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResolve(false)}>Cancelar</Button>
            <Button onClick={() => { updateStatusMutation.mutate({ id: selectedId!, status: "resolvido", resolution: resolutionText }); setShowResolve(false); setResolutionText(""); }} disabled={resolutionText.length < 3}>
              <CheckCircle2 className="h-4 w-4 mr-2" /> Resolver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
