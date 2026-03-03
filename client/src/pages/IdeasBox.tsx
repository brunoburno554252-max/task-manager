import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Lightbulb, Plus, Search, CheckCircle2, XCircle, Clock, Eye,
  Sparkles, ThumbsUp, ThumbsDown, ArrowRight, Loader2, Trash2, Star,
  Calendar, User, MessageSquare, Hash, FileText,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// ==================== TYPES ====================
type IdeaStatus = "new" | "rejected" | "analysis" | "approved";

type IdeaItem = {
  id: number;
  title: string;
  description: string | null;
  status: IdeaStatus;
  authorId: number;
  pointsAwarded: number;
  approvedById: number | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  authorName: string | null;
  authorAvatarUrl: string | null;
};

// ==================== CONSTANTS ====================
const STATUS_CONFIG: Record<IdeaStatus, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: any;
  gradient: string;
  dotColor: string;
}> = {
  new: {
    label: "Novas Ideias",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    icon: Lightbulb,
    gradient: "from-blue-500/20 to-blue-600/5",
    dotColor: "bg-blue-500",
  },
  analysis: {
    label: "Em Análise",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    icon: Clock,
    gradient: "from-amber-500/20 to-amber-600/5",
    dotColor: "bg-amber-500",
  },
  approved: {
    label: "Aprovadas",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
    icon: CheckCircle2,
    gradient: "from-emerald-500/20 to-emerald-600/5",
    dotColor: "bg-emerald-500",
  },
  rejected: {
    label: "Rejeitadas",
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
    icon: XCircle,
    gradient: "from-red-500/20 to-red-600/5",
    dotColor: "bg-red-500",
  },
};

const COLUMN_ORDER: IdeaStatus[] = ["new", "analysis", "approved", "rejected"];

// ==================== IDEA CARD ====================
function IdeaCard({ idea, isAdmin, onUpdateStatus, onDelete, onViewDetails }: {
  idea: IdeaItem;
  isAdmin: boolean;
  onUpdateStatus: (id: number, status: IdeaStatus) => void;
  onDelete: (id: number) => void;
  onViewDetails: (idea: IdeaItem) => void;
}) {
  const config = STATUS_CONFIG[idea.status];
  const initials = (idea.authorName || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`group relative rounded-xl border ${config.borderColor} bg-card/80 backdrop-blur-sm p-4 hover:shadow-lg hover:shadow-black/10 transition-all duration-200 cursor-pointer`}
      onClick={() => onViewDetails(idea)}
    >
      {/* Delete button - positioned absolutely, top-right */}
      {isAdmin && (
        <button
          className="absolute top-2 right-2 h-7 w-7 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-400 hover:bg-red-500/10 z-10"
          onClick={(e) => { e.stopPropagation(); onDelete(idea.id); }}
          title="Excluir ideia"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Author info with photo */}
      <div className="flex items-center gap-3 mb-3">
        <Avatar className="h-9 w-9 ring-2 ring-background shadow-md shrink-0">
          <AvatarImage src={idea.authorAvatarUrl || undefined} />
          <AvatarFallback className="text-xs font-bold bg-gradient-to-br from-primary/30 to-primary/10">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{idea.authorName || "Anônimo"}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(idea.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
          </p>
        </div>
        {idea.pointsAwarded > 0 && (
          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 gap-1 shrink-0">
            <Star className="h-3 w-3" /> {idea.pointsAwarded} pts
          </Badge>
        )}
      </div>

      {/* Idea content */}
      <h3 className="font-semibold text-sm mb-1 line-clamp-2 pr-6">{idea.title}</h3>
      {idea.description && (
        <p className="text-xs text-muted-foreground line-clamp-3 mb-3">{idea.description}</p>
      )}

      {/* Rejection reason */}
      {idea.status === "rejected" && idea.rejectionReason && (
        <div className="mt-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-xs text-red-400"><strong>Motivo:</strong> {idea.rejectionReason}</p>
        </div>
      )}

      {/* Status badge + click hint */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
        <Badge variant="outline" className={`text-[10px] ${config.color} ${config.borderColor}`}>
          <config.icon className="h-3 w-3 mr-1" />
          {config.label}
        </Badge>
        <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
          <Eye className="h-3 w-3" /> Ver detalhes
        </span>
      </div>

      {/* Admin quick actions */}
      {isAdmin && (
        <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border/20" onClick={(e) => e.stopPropagation()}>
          {idea.status === "new" && (
            <>
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 flex-1"
                onClick={() => onUpdateStatus(idea.id, "analysis")}>
                <Clock className="h-3 w-3" /> Analisar
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 flex-1"
                onClick={() => onUpdateStatus(idea.id, "approved")}>
                <ThumbsUp className="h-3 w-3" /> Aprovar
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 flex-1"
                onClick={() => onUpdateStatus(idea.id, "rejected")}>
                <ThumbsDown className="h-3 w-3" /> Rejeitar
              </Button>
            </>
          )}
          {idea.status === "analysis" && (
            <>
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 flex-1"
                onClick={() => onUpdateStatus(idea.id, "approved")}>
                <ThumbsUp className="h-3 w-3" /> Aprovar
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 flex-1"
                onClick={() => onUpdateStatus(idea.id, "rejected")}>
                <ThumbsDown className="h-3 w-3" /> Rejeitar
              </Button>
            </>
          )}
          {idea.status === "rejected" && (
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
              onClick={() => onUpdateStatus(idea.id, "new")}>
              <ArrowRight className="h-3 w-3" /> Reabrir
            </Button>
          )}
          {idea.status === "approved" && (
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
              onClick={() => onUpdateStatus(idea.id, "new")}>
              <ArrowRight className="h-3 w-3" /> Reabrir
            </Button>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ==================== DETAIL MODAL ====================
function IdeaDetailModal({ idea, isAdmin, onClose, onUpdateStatus, onDelete }: {
  idea: IdeaItem;
  isAdmin: boolean;
  onClose: () => void;
  onUpdateStatus: (id: number, status: IdeaStatus) => void;
  onDelete: (id: number) => void;
}) {
  const config = STATUS_CONFIG[idea.status];
  const initials = (idea.authorName || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-xl ${config.bgColor} flex items-center justify-center shrink-0`}>
              <config.icon className={`h-5 w-5 ${config.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg font-bold leading-tight">{idea.title}</DialogTitle>
              <DialogDescription className="mt-0.5">
                <Badge variant="outline" className={`text-xs ${config.color} ${config.borderColor}`}>
                  {config.label}
                </Badge>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 pb-4">
            {/* Author Section */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border border-border/30">
              <Avatar className="h-12 w-12 ring-2 ring-background shadow-lg">
                <AvatarImage src={idea.authorAvatarUrl || undefined} />
                <AvatarFallback className="text-sm font-bold bg-gradient-to-br from-primary/30 to-primary/10">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{idea.authorName || "Anônimo"}</p>
                <p className="text-sm text-muted-foreground">Autor da ideia</p>
              </div>
              {idea.pointsAwarded > 0 && (
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 gap-1 text-sm px-3 py-1">
                  <Star className="h-4 w-4" /> {idea.pointsAwarded} pontos
                </Badge>
              )}
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-muted/20 border border-border/20">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Calendar className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">Criada em</span>
                </div>
                <p className="text-sm font-semibold">
                  {new Date(idea.createdAt).toLocaleDateString("pt-BR", {
                    day: "2-digit", month: "long", year: "numeric",
                  })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(idea.createdAt).toLocaleTimeString("pt-BR", {
                    hour: "2-digit", minute: "2-digit",
                  })}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/20 border border-border/20">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">Última atualização</span>
                </div>
                <p className="text-sm font-semibold">
                  {new Date(idea.updatedAt).toLocaleDateString("pt-BR", {
                    day: "2-digit", month: "long", year: "numeric",
                  })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(idea.updatedAt).toLocaleTimeString("pt-BR", {
                    hour: "2-digit", minute: "2-digit",
                  })}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/20 border border-border/20">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Hash className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">ID da Ideia</span>
                </div>
                <p className="text-sm font-semibold">#{idea.id}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/20 border border-border/20">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Star className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">Pontos</span>
                </div>
                <p className="text-sm font-semibold">
                  {idea.pointsAwarded > 0 ? `${idea.pointsAwarded} pontos` : "Sem pontos"}
                </p>
              </div>
            </div>

            {/* Description */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm">Descrição</h3>
              </div>
              <div className="p-4 rounded-xl bg-muted/20 border border-border/20 min-h-[80px]">
                {idea.description ? (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{idea.description}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Nenhuma descrição fornecida.</p>
                )}
              </div>
            </div>

            {/* Rejection reason */}
            {idea.status === "rejected" && idea.rejectionReason && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="h-4 w-4 text-red-400" />
                  <h3 className="font-semibold text-sm text-red-400">Motivo da Rejeição</h3>
                </div>
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                  <p className="text-sm leading-relaxed text-red-300">{idea.rejectionReason}</p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer with actions */}
        {isAdmin && (
          <div className="shrink-0 pt-4 border-t border-border/30 flex items-center gap-2 flex-wrap">
            {idea.status === "new" && (
              <>
                <Button size="sm" variant="outline" className="gap-1 text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                  onClick={() => { onClose(); onUpdateStatus(idea.id, "analysis"); }}>
                  <Clock className="h-3.5 w-3.5" /> Enviar para Análise
                </Button>
                <Button size="sm" variant="outline" className="gap-1 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                  onClick={() => { onClose(); onUpdateStatus(idea.id, "approved"); }}>
                  <ThumbsUp className="h-3.5 w-3.5" /> Aprovar
                </Button>
                <Button size="sm" variant="outline" className="gap-1 text-red-400 border-red-500/30 hover:bg-red-500/10"
                  onClick={() => { onClose(); onUpdateStatus(idea.id, "rejected"); }}>
                  <ThumbsDown className="h-3.5 w-3.5" /> Rejeitar
                </Button>
              </>
            )}
            {idea.status === "analysis" && (
              <>
                <Button size="sm" variant="outline" className="gap-1 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                  onClick={() => { onClose(); onUpdateStatus(idea.id, "approved"); }}>
                  <ThumbsUp className="h-3.5 w-3.5" /> Aprovar
                </Button>
                <Button size="sm" variant="outline" className="gap-1 text-red-400 border-red-500/30 hover:bg-red-500/10"
                  onClick={() => { onClose(); onUpdateStatus(idea.id, "rejected"); }}>
                  <ThumbsDown className="h-3.5 w-3.5" /> Rejeitar
                </Button>
              </>
            )}
            {(idea.status === "rejected" || idea.status === "approved") && (
              <Button size="sm" variant="outline" className="gap-1 text-blue-400 border-blue-500/30 hover:bg-blue-500/10"
                onClick={() => { onClose(); onUpdateStatus(idea.id, "new"); }}>
                <ArrowRight className="h-3.5 w-3.5" /> Reabrir
              </Button>
            )}
            <div className="flex-1" />
            <Button size="sm" variant="ghost" className="gap-1 text-red-400 hover:text-red-300 hover:bg-red-500/10"
              onClick={() => { onClose(); onDelete(idea.id); }}>
              <Trash2 className="h-3.5 w-3.5" /> Excluir
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ==================== MAIN COMPONENT ====================
export default function IdeasBox() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ title: "", description: "" });
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedIdeaId, setSelectedIdeaId] = useState<number | null>(null);
  const [approvePoints, setApprovePoints] = useState("10");
  const [rejectReason, setRejectReason] = useState("");
  const [detailIdea, setDetailIdea] = useState<IdeaItem | null>(null);

  const { data: ideas, isLoading } = trpc.ideas.list.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.ideas.create.useMutation({
    onSuccess: () => {
      toast.success("Ideia enviada com sucesso!");
      utils.ideas.list.invalidate();
      setShowCreate(false);
      setCreateForm({ title: "", description: "" });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateStatusMutation = trpc.ideas.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status atualizado!");
      utils.ideas.list.invalidate();
      setShowApproveDialog(false);
      setShowRejectDialog(false);
      setSelectedIdeaId(null);
      setApprovePoints("10");
      setRejectReason("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = trpc.ideas.delete.useMutation({
    onSuccess: () => {
      toast.success("Ideia removida!");
      utils.ideas.list.invalidate();
    },
    onError: () => toast.error("Erro ao remover ideia"),
  });

  const handleUpdateStatus = (id: number, status: IdeaStatus) => {
    if (status === "approved") {
      setSelectedIdeaId(id);
      setShowApproveDialog(true);
    } else if (status === "rejected") {
      setSelectedIdeaId(id);
      setShowRejectDialog(true);
    } else {
      updateStatusMutation.mutate({ id, status });
    }
  };

  const handleApprove = () => {
    if (!selectedIdeaId) return;
    const pts = parseInt(approvePoints) || 0;
    updateStatusMutation.mutate({
      id: selectedIdeaId,
      status: "approved",
      pointsAwarded: pts > 0 ? pts : undefined,
    });
  };

  const handleReject = () => {
    if (!selectedIdeaId) return;
    updateStatusMutation.mutate({
      id: selectedIdeaId,
      status: "rejected",
      rejectionReason: rejectReason || undefined,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja remover esta ideia?")) {
      deleteMutation.mutate({ id });
    }
  };

  const filtered = useMemo(() => {
    if (!ideas) return [];
    if (!search.trim()) return ideas as IdeaItem[];
    const q = search.toLowerCase();
    return (ideas as IdeaItem[]).filter((i: IdeaItem) =>
      i.title.toLowerCase().includes(q) ||
      (i.description?.toLowerCase().includes(q)) ||
      (i.authorName?.toLowerCase().includes(q))
    );
  }, [ideas, search]);

  const groupedByStatus = useMemo(() => {
    const groups: Record<IdeaStatus, IdeaItem[]> = { new: [], analysis: [], approved: [], rejected: [] };
    for (const idea of filtered) {
      const s = idea.status as IdeaStatus;
      if (groups[s]) groups[s].push(idea);
    }
    return groups;
  }, [filtered]);

  const totalStats = useMemo(() => {
    if (!ideas) return { total: 0, new: 0, analysis: 0, approved: 0, rejected: 0 };
    return {
      total: ideas.length,
      new: ideas.filter((i: any) => i.status === "new").length,
      analysis: ideas.filter((i: any) => i.status === "analysis").length,
      approved: ideas.filter((i: any) => i.status === "approved").length,
      rejected: ideas.filter((i: any) => i.status === "rejected").length,
    };
  }, [ideas]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Lightbulb className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Caixa de Ideias</h1>
            <p className="text-sm text-muted-foreground">Carregando...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-64 rounded-xl bg-card/50 animate-pulse border border-border/30" />
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
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-yellow-500/30 to-amber-500/10 flex items-center justify-center">
            <Lightbulb className="h-5 w-5 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Caixa de Ideias</h1>
            <p className="text-sm text-muted-foreground">{totalStats.total} ideias no total</p>
          </div>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Nova Ideia
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {COLUMN_ORDER.map(status => {
          const config = STATUS_CONFIG[status];
          const Icon = config.icon;
          const count = totalStats[status];
          return (
            <div key={status} className={`rounded-xl border ${config.borderColor} ${config.bgColor} p-3 flex items-center gap-3`}>
              <div className={`h-8 w-8 rounded-lg ${config.bgColor} flex items-center justify-center`}>
                <Icon className={`h-4 w-4 ${config.color}`} />
              </div>
              <div>
                <p className={`text-lg font-bold ${config.color}`}>{count}</p>
                <p className="text-xs text-muted-foreground">{config.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar ideia por título, descrição ou autor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Kanban Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {COLUMN_ORDER.map(status => {
          const config = STATUS_CONFIG[status];
          const Icon = config.icon;
          const columnIdeas = groupedByStatus[status];
          return (
            <div key={status} className={`rounded-xl border ${config.borderColor} bg-gradient-to-b ${config.gradient} backdrop-blur-sm overflow-hidden flex flex-col`}>
              {/* Column Header */}
              <div className={`px-4 py-3 border-b ${config.borderColor} flex items-center gap-2 shrink-0`}>
                <div className={`h-2 w-2 rounded-full ${config.dotColor}`} />
                <Icon className={`h-4 w-4 ${config.color}`} />
                <h2 className={`font-semibold text-sm ${config.color}`}>{config.label}</h2>
                <Badge variant="secondary" className="ml-auto text-xs h-5 px-1.5">
                  {columnIdeas.length}
                </Badge>
              </div>

              {/* Column Content */}
              <ScrollArea className="flex-1 max-h-[calc(100vh-380px)]">
                <div className="p-3 space-y-3">
                  <AnimatePresence mode="popLayout">
                    {columnIdeas.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Icon className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p className="text-xs">Nenhuma ideia</p>
                      </div>
                    ) : (
                      columnIdeas.map((idea: IdeaItem) => (
                        <IdeaCard
                          key={idea.id}
                          idea={idea}
                          isAdmin={isAdmin}
                          onUpdateStatus={handleUpdateStatus}
                          onDelete={handleDelete}
                          onViewDetails={setDetailIdea}
                        />
                      ))
                    )}
                  </AnimatePresence>
                </div>
              </ScrollArea>
            </div>
          );
        })}
      </div>

      {/* Detail Modal */}
      {detailIdea && (
        <IdeaDetailModal
          idea={detailIdea}
          isAdmin={isAdmin}
          onClose={() => setDetailIdea(null)}
          onUpdateStatus={handleUpdateStatus}
          onDelete={handleDelete}
        />
      )}

      {/* Create Idea Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-400" /> Nova Ideia
            </DialogTitle>
            <DialogDescription>Compartilhe sua ideia com a equipe!</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título *</Label>
              <Input
                placeholder="Título da sua ideia..."
                value={createForm.title}
                onChange={(e) => setCreateForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                placeholder="Descreva sua ideia em detalhes..."
                value={createForm.description}
                onChange={(e) => setCreateForm(f => ({ ...f, description: e.target.value }))}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button
              onClick={() => createMutation.mutate({ title: createForm.title, description: createForm.description || undefined })}
              disabled={!createForm.title.trim() || createMutation.isPending}
              className="gap-2"
            >
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Enviar Ideia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" /> Aprovar Ideia
            </DialogTitle>
            <DialogDescription>Defina os pontos para o autor da ideia.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Pontos para o colaborador</Label>
              <Input
                type="number"
                min="0"
                placeholder="Ex: 10"
                value={approvePoints}
                onChange={(e) => setApprovePoints(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">Deixe 0 para não dar pontos.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>Cancelar</Button>
            <Button onClick={handleApprove} disabled={updateStatusMutation.isPending} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
              {updateStatusMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsUp className="h-4 w-4" />}
              Aprovar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-400" /> Rejeitar Ideia
            </DialogTitle>
            <DialogDescription>Informe o motivo da rejeição (opcional).</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Motivo da rejeição</Label>
              <Textarea
                placeholder="Explique por que a ideia foi rejeitada..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Cancelar</Button>
            <Button onClick={handleReject} disabled={updateStatusMutation.isPending} variant="destructive" className="gap-2">
              {updateStatusMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsDown className="h-4 w-4" />}
              Rejeitar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
