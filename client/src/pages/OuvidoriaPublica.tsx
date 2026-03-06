import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle, MessageSquare, ThumbsUp, Shield, Send, Search,
  Clock, CheckCircle2, Lock, MapPin, Calendar, User, Phone, Mail,
  Loader2, Megaphone, ArrowLeft, Copy, Check, Globe,
} from "lucide-react";

const API_BASE = window.location.origin;

const typeLabels: Record<string, { label: string; icon: any; color: string }> = {
  reclamacao: { label: "Reclamação", icon: AlertTriangle, color: "text-red-500 bg-red-500/10 border-red-500/20" },
  sugestao: { label: "Sugestão", icon: MessageSquare, color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
  elogio: { label: "Elogio", icon: ThumbsUp, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
  denuncia: { label: "Denúncia", icon: Shield, color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
};

const categoryLabels: Record<string, string> = {
  atendimento: "Atendimento", infraestrutura: "Infraestrutura", gestao: "Gestão",
  comunicacao: "Comunicação", seguranca: "Segurança", outros: "Outros",
};

const statusColors: Record<string, string> = {
  Novo: "text-blue-500 bg-blue-500/10",
  "Em Análise": "text-purple-500 bg-purple-500/10",
  "Em Andamento": "text-amber-500 bg-amber-500/10",
  Respondido: "text-cyan-500 bg-cyan-500/10",
  Concluído: "text-emerald-500 bg-emerald-500/10",
  Arquivado: "text-muted-foreground bg-muted/30",
};

type View = "home" | "form" | "track" | "success";

export default function OuvidoriaPublica() {
  const [view, setView] = useState<View>("home");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [formType, setFormType] = useState("reclamacao");
  const [formCategory, setFormCategory] = useState("outros");
  const [formSubject, setFormSubject] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formOccurrenceDate, setFormOccurrenceDate] = useState("");
  const [formOccurrenceLocation, setFormOccurrenceLocation] = useState("");
  const [formIsAnonymous, setFormIsAnonymous] = useState(true);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");

  // Success state
  const [protocol, setProtocol] = useState("");
  const [copied, setCopied] = useState(false);

  // Track state
  const [trackProtocol, setTrackProtocol] = useState("");
  const [trackResult, setTrackResult] = useState<any>(null);

  const resetForm = () => {
    setFormType("reclamacao"); setFormCategory("outros"); setFormSubject("");
    setFormDescription(""); setFormOccurrenceDate(""); setFormOccurrenceLocation("");
    setFormIsAnonymous(true); setFormName(""); setFormEmail(""); setFormPhone("");
    setError("");
  };

  const handleSubmit = async () => {
    if (!formSubject || formDescription.length < 10) {
      setError("Preencha todos os campos obrigatórios.");
      return;
    }
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API_BASE}/api/public/complaint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: formType, category: formCategory, subject: formSubject,
          description: formDescription, occurrenceDate: formOccurrenceDate || undefined,
          occurrenceLocation: formOccurrenceLocation || undefined,
          isAnonymous: formIsAnonymous,
          authorName: formIsAnonymous ? undefined : formName,
          authorEmail: formIsAnonymous ? undefined : formEmail,
          authorPhone: formIsAnonymous ? undefined : formPhone,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setProtocol(data.protocol);
        setView("success");
        resetForm();
      } else {
        setError(data.error || "Erro ao enviar.");
      }
    } catch {
      setError("Erro de conexão. Tente novamente.");
    }
    setLoading(false);
  };

  const handleTrack = async () => {
    if (!trackProtocol) return;
    setLoading(true); setError(""); setTrackResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/public/complaint/${trackProtocol.trim()}`);
      const data = await res.json();
      if (res.ok) {
        setTrackResult(data);
      } else {
        setError(data.error || "Protocolo não encontrado.");
      }
    } catch {
      setError("Erro de conexão. Tente novamente.");
    }
    setLoading(false);
  };

  const copyProtocol = () => {
    navigator.clipboard.writeText(protocol);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-border/40">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Megaphone className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Ouvidoria CEO</h1>
              <p className="text-sm text-muted-foreground">Canal direto e sigiloso de comunicação</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* HOME */}
        {view === "home" && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-xl font-semibold mb-2">Como podemos ajudar?</h2>
              <p className="text-sm text-muted-foreground">
                Este canal é destinado a reclamações, sugestões, elogios e denúncias.
                Todos os registros são tratados com total sigilo e confidencialidade.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(typeLabels).map(([key, val]) => {
                const Icon = val.icon;
                return (
                  <button key={key} onClick={() => { setFormType(key); setView("form"); }}
                    className={`p-5 rounded-2xl border-2 text-left transition-all hover:scale-[1.02] ${val.color}`}>
                    <Icon className="h-8 w-8 mb-3" />
                    <p className="font-semibold text-lg">{val.label}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {key === "reclamacao" ? "Relate um problema ou insatisfação" :
                       key === "sugestao" ? "Proponha melhorias ou ideias" :
                       key === "elogio" ? "Reconheça algo positivo" :
                       "Reporte uma irregularidade"}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="mt-8 p-5 rounded-2xl bg-card border border-border/40 text-center">
              <Search className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="font-medium mb-1">Já fez um registro?</p>
              <p className="text-sm text-muted-foreground mb-3">Acompanhe o andamento pelo número do protocolo</p>
              <Button variant="outline" onClick={() => setView("track")} className="gap-2">
                <Search className="h-4 w-4" /> Consultar Protocolo
              </Button>
            </div>
          </div>
        )}

        {/* FORM */}
        {view === "form" && (
          <div className="space-y-6">
            <button onClick={() => setView("home")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </button>

            <div className="bg-card rounded-2xl border border-border/40 p-6 space-y-5">
              <div>
                <h2 className="text-lg font-semibold">Novo Registro</h2>
                <p className="text-sm text-muted-foreground">Preencha os dados abaixo com o máximo de detalhes.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Tipo *</label>
                  <Select value={formType} onValueChange={setFormType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Categoria *</label>
                  <Select value={formCategory} onValueChange={setFormCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(categoryLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Assunto *</label>
                <Input placeholder="Resumo breve do seu registro" value={formSubject}
                  onChange={(e) => setFormSubject(e.target.value)} maxLength={500} />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Descrição detalhada *</label>
                <Textarea placeholder="Descreva com o máximo de detalhes possível o que aconteceu, quando, onde e quem estava envolvido..."
                  value={formDescription} onChange={(e) => setFormDescription(e.target.value)} rows={6} maxLength={10000} />
                <p className="text-xs text-muted-foreground mt-1">{formDescription.length}/10000 (mínimo 10 caracteres)</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Data da ocorrência
                  </label>
                  <Input type="date" value={formOccurrenceDate} onChange={(e) => setFormOccurrenceDate(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Local da ocorrência
                  </label>
                  <Input placeholder="Onde ocorreu?" value={formOccurrenceLocation}
                    onChange={(e) => setFormOccurrenceLocation(e.target.value)} />
                </div>
              </div>

              {/* Anonymous toggle */}
              <div className="p-4 rounded-xl bg-muted/30 border border-border/40 space-y-3">
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="anon" checked={formIsAnonymous} onChange={(e) => setFormIsAnonymous(e.target.checked)}
                    className="h-4 w-4 rounded" />
                  <label htmlFor="anon" className="cursor-pointer">
                    <span className="font-medium text-sm flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" /> Enviar anonimamente</span>
                    <span className="text-xs text-muted-foreground block mt-0.5">Nenhuma informação pessoal será vinculada</span>
                  </label>
                </div>

                {!formIsAnonymous && (
                  <div className="space-y-3 pt-2 border-t border-border/30">
                    <p className="text-xs text-muted-foreground">Identificação (opcional, para retorno)</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Seu nome" value={formName} onChange={(e) => setFormName(e.target.value)} className="pl-10" />
                      </div>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Seu e-mail" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} className="pl-10" />
                      </div>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Seu telefone" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} className="pl-10" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

              <Button onClick={handleSubmit} disabled={loading || !formSubject || formDescription.length < 10}
                className="w-full h-12 text-base gap-2">
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                Enviar Registro
              </Button>
            </div>
          </div>
        )}

        {/* SUCCESS */}
        {view === "success" && (
          <div className="text-center space-y-6 py-8">
            <div className="h-20 w-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Registro enviado com sucesso!</h2>
              <p className="text-muted-foreground">Seu registro foi recebido e será analisado pela equipe.</p>
            </div>

            <div className="bg-card rounded-2xl border border-border/40 p-6 max-w-md mx-auto">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Seu protocolo</p>
              <div className="flex items-center justify-center gap-3">
                <span className="text-2xl font-bold font-mono tracking-wider">{protocol}</span>
                <Button variant="outline" size="sm" onClick={copyProtocol} className="gap-1.5">
                  {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copiado!" : "Copiar"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Guarde este número para acompanhar o andamento do seu registro.
              </p>
            </div>

            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => { setView("home"); }} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Voltar ao início
              </Button>
              <Button onClick={() => { setTrackProtocol(protocol); setView("track"); }} className="gap-2">
                <Search className="h-4 w-4" /> Acompanhar
              </Button>
            </div>
          </div>
        )}

        {/* TRACK */}
        {view === "track" && (
          <div className="space-y-6">
            <button onClick={() => { setView("home"); setTrackResult(null); setError(""); }}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </button>

            <div className="bg-card rounded-2xl border border-border/40 p-6">
              <h2 className="text-lg font-semibold mb-1">Consultar Protocolo</h2>
              <p className="text-sm text-muted-foreground mb-4">Digite o número do protocolo para acompanhar o andamento.</p>

              <div className="flex gap-3">
                <Input placeholder="Ex: OUV-2026-00001" value={trackProtocol}
                  onChange={(e) => setTrackProtocol(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleTrack()}
                  className="font-mono" />
                <Button onClick={handleTrack} disabled={loading || !trackProtocol} className="gap-2 shrink-0">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Consultar
                </Button>
              </div>

              {error && <p className="text-sm text-red-500 font-medium mt-3">{error}</p>}
            </div>

            {trackResult && (
              <div className="bg-card rounded-2xl border border-border/40 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-mono text-muted-foreground">{trackResult.protocol}</span>
                    <h3 className="text-lg font-semibold mt-0.5">{trackResult.subject}</h3>
                  </div>
                  <Badge className={`text-sm px-3 py-1 ${statusColors[trackResult.statusLabel] || "bg-muted"}`}>
                    {trackResult.statusLabel}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-muted/30">
                    <p className="text-[10px] text-muted-foreground uppercase">Tipo</p>
                    <p className="text-sm font-medium">{typeLabels[trackResult.type]?.label || trackResult.type}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/30">
                    <p className="text-[10px] text-muted-foreground uppercase">Registrado em</p>
                    <p className="text-sm font-medium">{new Date(trackResult.createdAt).toLocaleDateString("pt-BR")}</p>
                  </div>
                </div>

                {trackResult.resolution && (
                  <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                    <p className="text-xs font-medium text-emerald-600 mb-2 flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Resolução
                    </p>
                    <p className="text-sm whitespace-pre-wrap">{trackResult.resolution}</p>
                    {trackResult.resolvedAt && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Concluído em: {new Date(trackResult.resolvedAt).toLocaleDateString("pt-BR")}
                      </p>
                    )}
                  </div>
                )}

                {trackResult.responses && trackResult.responses.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                      Respostas ({trackResult.responses.length})
                    </p>
                    <div className="space-y-2">
                      {trackResult.responses.map((r: any, i: number) => (
                        <div key={i} className="p-3 rounded-xl bg-muted/20 border border-border/30">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium">{r.userName}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(r.createdAt).toLocaleString("pt-BR")}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{r.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border/30 mt-16">
        <div className="max-w-3xl mx-auto px-4 py-6 text-center">
          <p className="text-xs text-muted-foreground">
            Todos os registros são tratados com sigilo e confidencialidade.
            Registros anônimos não possuem identificação do remetente.
          </p>
        </div>
      </div>
    </div>
  );
}
