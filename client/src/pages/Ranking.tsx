import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Trophy, Zap, Target, Clock, TrendingUp, Crown,
} from "lucide-react";

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
          {/* Reorder: 2nd, 1st, 3rd for podium effect */}
          {[top3[1], top3[0], top3[2]].filter(Boolean).map((r, displayIdx) => {
            if (!r) return null;
            const actualIdx = displayIdx === 0 ? 1 : displayIdx === 1 ? 0 : 2;
            const isFirst = actualIdx === 0;
            const isMe = r.id === user?.id;
            const completionRate = r.totalAssigned > 0
              ? Math.round((r.completedTasks / r.totalAssigned) * 100)
              : 0;

            return (
              <div
                key={r.id}
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
              </div>
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
                <div
                  key={r.id}
                  className={`flex items-center gap-4 p-4 hover:bg-muted/20 transition-colors ${isMe ? "bg-primary/5" : ""}`}
                >
                  <span className="text-sm font-bold text-muted-foreground w-8 text-center">
                    {i + 4}º
                  </span>
                  <Avatar className="h-9 w-9 shrink-0">
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
                </div>
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
    </div>
  );
}
