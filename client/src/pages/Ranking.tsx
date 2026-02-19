import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Trophy, Zap, Target, Clock, TrendingUp, Crown,
  Star, Plus, Minus, Loader2, History, ChevronDown, ChevronUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";

const medals = ["🥇", "🥈", "🥉"];

export default function Ranking() {
  const { user } = useAuth();
  const { data: ranking, isLoading } = trpc.gamification.ranking.useQuery();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  const top3 = ranking?.slice(0, 3) ?? [];
  const rest = ranking?.slice(3) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ranking</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Classificação de produtividade dos colaboradores.
        </p>
      </div>

      {/* Top 3 Podium */}
      {top3.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[top3[1], top3[0], top3[2]].filter(Boolean).map((r, displayIdx) => {
            if (!r) return null;
            const actualIdx = displayIdx === 0 ? 1 : displayIdx === 1 ? 0 : 2;
            const isFirst = actualIdx === 0;
            const isMe = r.id === user?.id;
            const completionRate = r.totalAssigned > 0
              ? Math.round((r.completedTasks / r.totalAssigned) * 100)
              : 0;

            return (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: isFirst ? 0.1 : actualIdx === 1 ? 0.25 : 0.4, duration: 0.5, type: "spring", stiffness: 200 }}
                className={`stat-card p-5 text-center relative ${isFirst ? "md:-mt-4 md:mb-4" : ""} ${isMe ? "ring-1 ring-primary/40" : ""}`}
                style={{
                  "--stat-accent": isFirst
                    ? "oklch(0.75 0.18 50)"
                    : actualIdx === 1
                    ? "oklch(0.7 0.12 250)"
                    : "oklch(0.65 0.12 40)",
                } as React.CSSProperties}
              >
                {isFirst && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Crown className="h-6 w-6 text-amber-400 drop-shadow-lg" />
                  </div>
                )}
                <div className="text-3xl mb-2">{medals[actualIdx]}</div>
                <Avatar className="h-14 w-14 mx-auto mb-2">
                  {(r as any).avatarUrl ? (
                    <AvatarImage src={(r as any).avatarUrl} alt={r.name || ""} className="object-cover" />
                  ) : null}
                  <AvatarFallback className={`text-lg font-bold ${isFirst ? "bg-amber-500/20 text-amber-400" : "bg-primary/20 text-primary"}`}>
                    {r.name?.charAt(0)?.toUpperCase() ?? "?"}
                  </AvatarFallback>
                </Avatar>
                <h3 className="font-semibold text-sm truncate">{r.name ?? "Sem nome"}</h3>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <Zap className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-lg font-bold">{r.totalPoints}</span>
                  <span className="text-xs text-muted-foreground">pts</span>
                </div>
                <div className="grid grid-cols-3 gap-1 mt-3 pt-3 border-t border-border/30">
                  <div>
                    <p className="text-sm font-bold text-emerald-400">{r.completedTasks}</p>
                    <p className="text-[9px] text-muted-foreground">Concluídas</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-blue-400">{r.onTimeTasks}</p>
                    <p className="text-[9px] text-muted-foreground">No prazo</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold">{completionRate}%</p>
                    <p className="text-[9px] text-muted-foreground">Taxa</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Rest of Ranking */}
      {rest.length > 0 && (
        <div className="stat-card overflow-hidden" style={{ "--stat-accent": "oklch(0.72 0.19 280)" } as React.CSSProperties}>
          <div className="divide-y divide-border/30">
            {rest.map((r, i) => {
              const isMe = r.id === user?.id;
              const completionRate = r.totalAssigned > 0
                ? Math.round((r.completedTasks / r.totalAssigned) * 100)
                : 0;

              return (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.05, duration: 0.3 }}
                  className={`flex items-center gap-4 p-4 hover:bg-muted/20 transition-colors ${isMe ? "bg-primary/5" : ""}`}
                >
                  <span className="text-sm font-bold text-muted-foreground w-8 text-center">
                    {i + 4}º
                  </span>
                  <Avatar className="h-9 w-9 shrink-0">
                    {(r as any).avatarUrl ? (
                      <AvatarImage src={(r as any).avatarUrl} alt={r.name || ""} className="object-cover" />
                    ) : null}
                    <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                      {r.name?.charAt(0)?.toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {r.name ?? "Sem nome"}
                      {isMe && <span className="text-xs text-primary ml-2">(você)</span>}
                    </p>
                  </div>
                  <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground shrink-0">
                    <div className="flex items-center gap-1">
                      <Target className="h-3 w-3 text-emerald-400" />
                      <span>{r.completedTasks}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-blue-400" />
                      <span>{r.onTimeTasks}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      <span>{completionRate}%</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Zap className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-sm font-bold">{r.totalPoints}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {(!ranking || ranking.length === 0) && (
        <div className="stat-card p-12 text-center" style={{ "--stat-accent": "oklch(0.72 0.19 280)" } as React.CSSProperties}>
          <Trophy className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhum colaborador no ranking ainda.</p>
          <p className="text-sm text-muted-foreground/60 mt-1">Complete tarefas para aparecer aqui!</p>
        </div>
      )}

      {/* Points Management - Admin Only */}
      {user?.role === "admin" && ranking && ranking.length > 0 && (
        <PointsManager ranking={ranking} />
      )}
    </div>
  );
}

function PointsManager({ ranking }: { ranking: { id: number; name: string | null; totalPoints: number }[] }) {
  const utils = trpc.useUtils();
  const [selectedUser, setSelectedUser] = useState<number | "">("");
  const [pointsAmount, setPointsAmount] = useState("");
  const [reason, setReason] = useState("");
  const [isPositive, setIsPositive] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  // Fetch points history for selected user
  const { data: pointsHistory } = trpc.gamification.userPoints.useQuery(
    { userId: selectedUser as number },
    { enabled: !!selectedUser && showHistory }
  );

  // Fetch user badges for selected user
  const { data: userBadges } = trpc.gamification.userBadges.useQuery(
    { userId: selectedUser as number },
    { enabled: !!selectedUser }
  );

  const adjustMutation = trpc.gamification.adjustPoints.useMutation({
    onSuccess: (data) => {
      const badges = data.newBadges;
      toast.success(
        `Pontos ${isPositive ? "concedidos" : "removidos"} com sucesso!` +
        (badges?.length ? ` Nova(s) conquista(s): ${badges.join(", ")}` : "")
      );
      utils.gamification.ranking.invalidate();
      utils.gamification.userPoints.invalidate();
      utils.gamification.userBadges.invalidate();
      utils.collaborators.listWithStats.invalidate();
      setPointsAmount("");
      setReason("");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pts = parseInt(pointsAmount);
    if (!selectedUser || !pts || !reason.trim()) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    if (pts <= 0) {
      toast.error("A quantidade de pontos deve ser maior que zero");
      return;
    }
    adjustMutation.mutate({
      userId: selectedUser as number,
      points: isPositive ? pts : -pts,
      reason: reason.trim(),
    });
  };

  const selectedUserData = ranking.find(r => r.id === selectedUser);
  const quickAmounts = [5, 10, 25, 50, 100, 250];
  const quickReasons = [
    "Entrega excepcional",
    "Proatividade",
    "Trabalho em equipe",
    "Meta atingida",
    "Pontualidade",
    "Bônus especial",
  ];

  return (
    <div className="stat-card p-6" style={{ "--stat-accent": "oklch(0.75 0.18 50)" } as React.CSSProperties}>
      <h2 className="text-base font-semibold flex items-center gap-2 mb-1">
        <Star className="h-5 w-5 text-amber-400" />
        Gerenciar Pontos
      </h2>
      <p className="text-sm text-muted-foreground mb-4">Conceda ou remova pontos dos colaboradores de forma detalhada.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Colaborador Selection */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Colaborador *</Label>
          <select
            value={selectedUser}
            onChange={e => setSelectedUser(e.target.value ? parseInt(e.target.value) : "")}
            required
            className="w-full h-10 px-3 rounded-lg border border-border/30 bg-muted/10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Selecione um colaborador...</option>
            {ranking.map(r => (
              <option key={r.id} value={r.id}>{r.name ?? "Sem nome"} — {r.totalPoints} pts</option>
            ))}
          </select>
        </div>

        {/* Selected user info card */}
        {selectedUserData && (
          <div className="rounded-lg bg-muted/10 p-3 flex items-center gap-3">
            <Avatar className="h-10 w-10">
              {(selectedUserData as any).avatarUrl ? (
                <AvatarImage src={(selectedUserData as any).avatarUrl} alt={selectedUserData.name || ""} className="object-cover" />
              ) : null}
              <AvatarFallback className="text-sm font-bold bg-primary/20 text-primary">
                {selectedUserData.name?.charAt(0)?.toUpperCase() ?? "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-sm font-medium">{selectedUserData.name}</p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Zap className="h-3 w-3 text-amber-400" />
                <span className="font-bold text-foreground">{selectedUserData.totalPoints}</span> pontos atuais
              </div>
            </div>
            {userBadges && userBadges.length > 0 && (
              <div className="flex gap-0.5">
                {userBadges.slice(0, 5).map((b: any) => (
                  <span key={b.id} className="text-lg" title={b.name}>{b.icon}</span>
                ))}
                {userBadges.length > 5 && (
                  <span className="text-xs text-muted-foreground self-center ml-1">+{userBadges.length - 5}</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tipo (Conceder/Remover) */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Ação *</Label>
          <div className="flex gap-2">
            <button type="button" onClick={() => setIsPositive(true)}
              className={`flex-1 h-10 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 transition-all ${isPositive ? "bg-emerald-500/20 text-emerald-500 border-2 border-emerald-500/40 shadow-sm" : "bg-muted/10 text-muted-foreground border border-border/30 hover:bg-muted/20"}`}>
              <Plus className="h-4 w-4" /> Conceder Pontos
            </button>
            <button type="button" onClick={() => setIsPositive(false)}
              className={`flex-1 h-10 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 transition-all ${!isPositive ? "bg-red-500/20 text-red-500 border-2 border-red-500/40 shadow-sm" : "bg-muted/10 text-muted-foreground border border-border/30 hover:bg-muted/20"}`}>
              <Minus className="h-4 w-4" /> Remover Pontos
            </button>
          </div>
        </div>

        {/* Quantidade com quick buttons */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Quantidade de Pontos *</Label>
          <Input
            type="number"
            min="1"
            max="10000"
            placeholder="Digite a quantidade..."
            value={pointsAmount}
            onChange={e => setPointsAmount(e.target.value)}
            required
            className="bg-muted/10 border-border/30 h-10 text-center text-lg font-bold"
          />
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {quickAmounts.map(v => (
              <button
                key={v}
                type="button"
                onClick={() => setPointsAmount(v.toString())}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  pointsAmount === v.toString()
                    ? isPositive
                      ? "bg-emerald-500/20 text-emerald-500 border border-emerald-500/30"
                      : "bg-red-500/20 text-red-500 border border-red-500/30"
                    : "bg-muted/10 text-muted-foreground border border-border/30 hover:bg-muted/20"
                }`}
              >
                {v} pts
              </button>
            ))}
          </div>
        </div>

        {/* Motivo com quick reasons */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Motivo *</Label>
          <Input
            placeholder="Descreva o motivo da alteração de pontos..."
            value={reason}
            onChange={e => setReason(e.target.value)}
            required
            className="bg-muted/10 border-border/30 h-10"
          />
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {quickReasons.map(r => (
              <button
                key={r}
                type="button"
                onClick={() => setReason(r)}
                className={`px-2.5 py-1 rounded-lg text-[11px] transition-all ${
                  reason === r
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "bg-muted/10 text-muted-foreground border border-border/30 hover:bg-muted/20"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Preview */}
        {selectedUserData && pointsAmount && reason && (
          <div className={`rounded-lg p-3 text-sm ${isPositive ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-red-500/10 border border-red-500/20"}`}>
            <p className={isPositive ? "text-emerald-500" : "text-red-500"}>
              {isPositive ? "+" : "-"}{pointsAmount} pontos para <strong>{selectedUserData.name}</strong>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Motivo: {reason} — Novo total: {selectedUserData.totalPoints + (isPositive ? parseInt(pointsAmount) || 0 : -(parseInt(pointsAmount) || 0))} pts
            </p>
          </div>
        )}

        <Button type="submit" disabled={adjustMutation.isPending || !selectedUser || !pointsAmount || !reason.trim()} className="gap-2 w-full h-10">
          {adjustMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />}
          {isPositive ? "Conceder Pontos" : "Remover Pontos"}
        </Button>
      </form>

      {/* Points History Toggle */}
      {selectedUser && (
        <>
          <Separator className="my-4 bg-border/20" />
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
          >
            <History className="h-4 w-4" />
            <span className="font-medium">Histórico de Pontos</span>
            {showHistory ? <ChevronUp className="h-3.5 w-3.5 ml-auto" /> : <ChevronDown className="h-3.5 w-3.5 ml-auto" />}
          </button>

          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-3 space-y-1.5 max-h-[300px] overflow-y-auto">
                  {pointsHistory && pointsHistory.length > 0 ? (
                    pointsHistory.map((entry: any) => (
                      <div key={entry.id} className="flex items-center gap-3 rounded-lg bg-muted/10 px-3 py-2">
                        <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${
                          entry.points > 0 ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
                        }`}>
                          {entry.points > 0 ? <Plus className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{entry.reason}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(entry.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                            {" "}
                            {new Date(entry.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                        <span className={`text-sm font-bold shrink-0 ${entry.points > 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {entry.points > 0 ? "+" : ""}{entry.points}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-4">Nenhum registro de pontos encontrado.</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
