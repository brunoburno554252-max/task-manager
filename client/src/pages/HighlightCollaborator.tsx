import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Star, Search, Zap, Loader2, Plus, Crown, Award, Sparkles, Trophy, ChevronDown,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function HighlightCollaborator() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [showAddPoints, setShowAddPoints] = useState(false);
  const [showCollabPicker, setShowCollabPicker] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [pointsForm, setPointsForm] = useState({ points: "", reason: "" });
  const [collabSearch, setCollabSearch] = useState("");

  const { data: collaborators, isLoading: loadingCollabs } = trpc.collaborators.listWithStats.useQuery();
  const { data: highlightLog, isLoading: loadingLog } = trpc.highlight.log.useQuery();
  const utils = trpc.useUtils();

  const addPointsMutation = trpc.highlight.addPoints.useMutation({
    onSuccess: () => {
      toast.success("Pontos adicionados com sucesso!");
      utils.collaborators.listWithStats.invalidate();
      utils.highlight.log.invalidate();
      setShowAddPoints(false);
      setShowCollabPicker(false);
      setSelectedUser(null);
      setPointsForm({ points: "", reason: "" });
    },
    onError: (err) => toast.error(err.message),
  });

  const handleOpenAddPoints = (collab: any) => {
    setSelectedUser(collab);
    setPointsForm({ points: "", reason: "" });
    setShowCollabPicker(false);
    setShowAddPoints(true);
  };

  const handleAddPoints = () => {
    if (!selectedUser) return;
    const pts = parseInt(pointsForm.points);
    if (!pts || pts <= 0) { toast.error("Informe uma pontuação válida"); return; }
    if (!pointsForm.reason.trim()) { toast.error("Informe a justificativa"); return; }
    addPointsMutation.mutate({ userId: selectedUser.id, points: pts, reason: pointsForm.reason.trim() });
  };

  // Agrupar destaques por usuário
  const highlightedUsers = useMemo(() => {
    if (!highlightLog || highlightLog.length === 0) return [];
    const userMap = new Map<number, {
      userId: number; userName: string; userAvatarUrl: string | null;
      totalHighlightPoints: number;
      entries: { points: number; reason: string; createdAt: string }[];
    }>();
    for (const entry of highlightLog) {
      const existing = userMap.get(entry.userId);
      if (existing) {
        existing.totalHighlightPoints += entry.points;
        existing.entries.push({ points: entry.points, reason: entry.reason, createdAt: entry.createdAt });
      } else {
        userMap.set(entry.userId, {
          userId: entry.userId, userName: entry.userName || "Sem nome",
          userAvatarUrl: entry.userAvatarUrl || null, totalHighlightPoints: entry.points,
          entries: [{ points: entry.points, reason: entry.reason, createdAt: entry.createdAt }],
        });
      }
    }
    return Array.from(userMap.values()).sort((a, b) => b.totalHighlightPoints - a.totalHighlightPoints);
  }, [highlightLog]);

  const filteredCollabs = useMemo(() => {
    if (!collaborators) return [];
    if (!collabSearch.trim()) return collaborators;
    const q = collabSearch.toLowerCase();
    return collaborators.filter(c => (c.name?.toLowerCase().includes(q)) || (c.email?.toLowerCase().includes(q)));
  }, [collaborators, collabSearch]);

  const getInitials = (name: string) =>
    (name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

  const isLoading = loadingCollabs || loadingLog;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="text-center space-y-4">
          <Trophy className="h-12 w-12 mx-auto text-yellow-400 animate-pulse" />
          <p className="text-muted-foreground">Carregando destaques...</p>
        </div>
      </div>
    );
  }

  const topHighlight = highlightedUsers.length > 0 ? highlightedUsers[0] : null;
  const runners = highlightedUsers.slice(1);

  return (
    <div className="space-y-6 -mt-2">
      {/* Admin: botão discreto para dar pontos */}
      {isAdmin && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setCollabSearch(""); setShowCollabPicker(true); }}
            className="gap-2 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10 hover:border-yellow-500/50"
          >
            <Sparkles className="h-4 w-4" />
            Dar Pontos
          </Button>
        </div>
      )}

      {/* ===== ESTADO VAZIO ===== */}
      {!topHighlight && (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-yellow-500/10 rounded-full blur-3xl scale-150" />
            <div className="relative h-40 w-40 rounded-full bg-gradient-to-br from-yellow-500/20 via-amber-500/10 to-orange-500/5 border-2 border-dashed border-yellow-500/20 flex items-center justify-center">
              <Trophy className="h-20 w-20 text-yellow-500/30" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-muted-foreground/60 mb-2">Nenhum destaque ainda</h2>
          <p className="text-muted-foreground/40 max-w-md text-sm leading-relaxed">
            Quando um colaborador for reconhecido por seu desempenho excepcional,
            ele aparecerá aqui em destaque para toda a equipe.
          </p>
        </div>
      )}

      {/* ===== DESTAQUE PRINCIPAL — OCUPA TODA A TELA ===== */}
      {topHighlight && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative overflow-hidden rounded-3xl min-h-[65vh] flex flex-col items-center justify-center"
          style={{
            background: "linear-gradient(180deg, rgba(234,179,8,0.08) 0%, rgba(245,158,11,0.04) 30%, rgba(0,0,0,0) 100%)",
          }}
        >
          {/* Glow background */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-yellow-500/8 rounded-full blur-[120px]" />
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-amber-400/5 rounded-full blur-[80px]" />
          </div>

          {/* Decorative lines */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-24 bg-gradient-to-b from-yellow-500/30 to-transparent" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-px h-24 bg-gradient-to-t from-yellow-500/10 to-transparent" />
          </div>

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center px-6 py-12 w-full max-w-2xl mx-auto">
            {/* Title badge */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-8"
            >
              <div className="flex items-center gap-2 px-5 py-2 rounded-full bg-yellow-500/10 border border-yellow-500/20 backdrop-blur-sm">
                <Trophy className="h-4 w-4 text-yellow-400" />
                <span className="text-sm font-semibold text-yellow-400 tracking-wider uppercase">Colaborador Destaque</span>
              </div>
            </motion.div>

            {/* Crown */}
            <motion.div
              initial={{ opacity: 0, y: -30, scale: 0.5 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
              className="mb-[-20px] z-20"
            >
              <Crown className="h-16 w-16 text-yellow-400 drop-shadow-[0_0_20px_rgba(234,179,8,0.4)]" fill="currentColor" />
            </motion.div>

            {/* Avatar gigante */}
            <motion.div
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, type: "spring", stiffness: 150 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-yellow-500/20 rounded-full blur-2xl scale-110" />
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500 p-1 animate-[spin_8s_linear_infinite]" style={{ padding: "4px" }}>
                  <div className="w-full h-full rounded-full bg-background" />
                </div>
                <Avatar className="h-44 w-44 ring-4 ring-yellow-400/50 shadow-[0_0_60px_rgba(234,179,8,0.3)] relative z-10">
                  <AvatarImage src={topHighlight.userAvatarUrl || undefined} className="object-cover" />
                  <AvatarFallback className="text-5xl font-bold bg-gradient-to-br from-yellow-500/30 to-amber-600/20 text-yellow-400">
                    {getInitials(topHighlight.userName)}
                  </AvatarFallback>
                </Avatar>
              </div>
            </motion.div>

            {/* Nome */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-8 text-4xl font-extrabold tracking-tight text-center bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent"
            >
              {topHighlight.userName}
            </motion.h1>

            {/* Pontos */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mt-4 flex items-center gap-3"
            >
              <div className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-yellow-500/15 to-amber-500/10 border border-yellow-500/20 backdrop-blur-sm">
                <Zap className="h-7 w-7 text-yellow-400" />
                <span className="text-4xl font-black text-yellow-400">{topHighlight.totalHighlightPoints}</span>
                <span className="text-base text-yellow-400/70 font-medium ml-1">pontos</span>
              </div>
            </motion.div>

            {/* Justificativas */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="mt-8 w-full space-y-3"
            >
              <p className="text-xs font-semibold text-yellow-400/50 uppercase tracking-[0.2em] text-center mb-4">
                Reconhecimentos
              </p>
              {topHighlight.entries.map((entry, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 + i * 0.1 }}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-card/40 border border-yellow-500/10 backdrop-blur-sm"
                >
                  <div className="shrink-0">
                    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-sm px-3 py-1 font-bold">
                      +{entry.points}
                    </Badge>
                  </div>
                  <p className="text-sm flex-1 text-foreground/80 leading-relaxed">{entry.reason}</p>
                  <span className="text-xs text-muted-foreground/50 shrink-0">
                    {new Date(entry.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                  </span>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </motion.div>
      )}

      {/* ===== OUTROS DESTAQUES (2º, 3º...) ===== */}
      {runners.length > 0 && (
        <div className="space-y-4 pt-4">
          <div className="flex items-center gap-2 px-1">
            <Award className="h-4 w-4 text-muted-foreground/50" />
            <p className="text-xs font-semibold text-muted-foreground/50 uppercase tracking-[0.15em]">Outros reconhecidos</p>
          </div>

          <div className="grid gap-4">
            {runners.map((highlighted, index) => {
              const rank = index + 2;
              const isSilver = rank === 2;
              const isBronze = rank === 3;
              const ringColor = isSilver ? "ring-gray-300/60" : isBronze ? "ring-amber-700/50" : "ring-border/30";
              const badgeColor = isSilver ? "bg-gray-300 text-black" : isBronze ? "bg-amber-700 text-white" : "bg-muted text-muted-foreground";

              return (
                <motion.div
                  key={highlighted.userId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="relative rounded-2xl border border-border/20 bg-card/30 backdrop-blur-sm overflow-hidden p-6"
                >
                  <div className="flex items-start gap-5">
                    {/* Rank + Avatar */}
                    <div className="relative shrink-0">
                      <div className={`absolute -top-1 -left-1 z-10 h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shadow-lg ${badgeColor}`}>
                        {rank}º
                      </div>
                      <Avatar className={`h-16 w-16 ring-2 ${ringColor} shadow-lg`}>
                        <AvatarImage src={highlighted.userAvatarUrl || undefined} className="object-cover" />
                        <AvatarFallback className="text-lg font-bold">{getInitials(highlighted.userName)}</AvatarFallback>
                      </Avatar>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold truncate">{highlighted.userName}</h3>
                        <div className="flex items-center gap-1">
                          <Zap className="h-4 w-4 text-yellow-400" />
                          <span className="text-lg font-extrabold text-yellow-400">{highlighted.totalHighlightPoints}</span>
                          <span className="text-xs text-muted-foreground">pts</span>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        {highlighted.entries.map((entry, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs shrink-0 border-yellow-500/20 text-yellow-400/70">
                              +{entry.points}
                            </Badge>
                            <span className="text-xs text-muted-foreground truncate">{entry.reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== MODAL: ESCOLHER COLABORADOR (Admin) ===== */}
      <Dialog open={showCollabPicker} onOpenChange={setShowCollabPicker}>
        <DialogContent className="max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-400" /> Escolher Colaborador
            </DialogTitle>
            <DialogDescription>Selecione quem vai receber pontos de destaque</DialogDescription>
          </DialogHeader>

          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar colaborador..."
              value={collabSearch}
              onChange={(e) => setCollabSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="space-y-1 max-h-[50vh] overflow-y-auto pr-1">
            {filteredCollabs.map((collab) => (
              <div
                key={collab.id}
                onClick={() => handleOpenAddPoints(collab)}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-yellow-500/5 hover:border-yellow-500/20 border border-transparent cursor-pointer transition-all group"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={collab.avatarUrl || undefined} />
                  <AvatarFallback className="text-xs font-bold">{getInitials(collab.name || "")}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{collab.name || "Sem nome"}</p>
                  <p className="text-xs text-muted-foreground truncate">{collab.email}</p>
                </div>
                <Plus className="h-4 w-4 text-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))}
            {filteredCollabs.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-6 w-6 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhum colaborador encontrado</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== MODAL: DAR PONTOS ===== */}
      <Dialog open={showAddPoints} onOpenChange={setShowAddPoints}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-400" /> Dar Pontos de Destaque
            </DialogTitle>
            <DialogDescription>
              Reconheça <strong>{selectedUser?.name}</strong> pelo seu desempenho
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedUser && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/10">
                <Avatar className="h-14 w-14 ring-2 ring-yellow-400/30">
                  <AvatarImage src={selectedUser.avatarUrl || undefined} />
                  <AvatarFallback className="text-lg font-bold">{getInitials(selectedUser.name || "")}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-bold text-lg">{selectedUser.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedUser.email}</p>
                </div>
              </div>
            )}
            <div>
              <Label className="text-sm font-semibold">Pontos *</Label>
              <Input
                type="number" min="1" placeholder="Ex: 10, 20, 50..."
                value={pointsForm.points}
                onChange={(e) => setPointsForm(f => ({ ...f, points: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm font-semibold">Justificativa *</Label>
              <Textarea
                placeholder="Descreva o motivo do reconhecimento..."
                value={pointsForm.reason}
                onChange={(e) => setPointsForm(f => ({ ...f, reason: e.target.value }))}
                rows={3} className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddPoints(false)}>Cancelar</Button>
            <Button
              onClick={handleAddPoints}
              disabled={addPointsMutation.isPending || !pointsForm.points || !pointsForm.reason.trim()}
              className="gap-2 bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-700 hover:to-amber-700 text-white shadow-lg shadow-yellow-500/20"
            >
              {addPointsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              Adicionar Pontos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
