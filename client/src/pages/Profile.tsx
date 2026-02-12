import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Trophy, Award, Target, Zap, Calendar, TrendingUp, Star,
} from "lucide-react";
import { useMemo } from "react";

export default function Profile() {
  const { user } = useAuth();
  const { data: myBadges, isLoading: badgesLoading } = trpc.gamification.myBadges.useQuery();
  const { data: myPoints, isLoading: pointsLoading } = trpc.gamification.myPoints.useQuery();
  const { data: ranking } = trpc.gamification.ranking.useQuery();

  const userStatsInput = useMemo(() => ({ userId: user?.id }), [user?.id]);
  const { data: stats, isLoading: statsLoading } = trpc.dashboard.stats.useQuery(userStatsInput);

  const myRank = useMemo(() => {
    if (!ranking || !user) return null;
    const idx = ranking.findIndex(r => r.id === user.id);
    return idx >= 0 ? idx + 1 : null;
  }, [ranking, user]);

  const isLoading = badgesLoading || pointsLoading || statsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-3xl">
        <Skeleton className="h-32 rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Meu Perfil</h1>
        <p className="text-muted-foreground text-sm mt-1">Suas informações e estatísticas de desempenho.</p>
      </div>

      {/* Profile Header */}
      <div className="stat-card p-6" style={{ "--stat-accent": "oklch(0.72 0.19 280)" } as React.CSSProperties}>
        <div className="flex items-center gap-5">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-xl font-bold bg-primary/20 text-primary">
              {user?.name?.charAt(0)?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold truncate">{user?.name}</h2>
              <Badge variant="secondary" className="text-xs bg-primary/20 text-primary border-0 font-semibold">
                {user?.role === "admin" ? "Administrador" : "Colaborador"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">{user?.email}</p>
            <p className="text-xs text-muted-foreground mt-1">
              <Calendar className="inline h-3 w-3 mr-1" />
              Membro desde {user?.createdAt ? new Date(user.createdAt).toLocaleDateString("pt-BR") : "-"}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="stat-card p-4 text-center" style={{ "--stat-accent": "oklch(0.72 0.19 280)" } as React.CSSProperties}>
          <Trophy className="h-5 w-5 text-primary mx-auto mb-2" />
          <p className="text-2xl font-bold">{myRank ?? "-"}</p>
          <p className="text-xs text-muted-foreground">Posição Ranking</p>
        </div>
        <div className="stat-card p-4 text-center" style={{ "--stat-accent": "oklch(0.75 0.18 50)" } as React.CSSProperties}>
          <Zap className="h-5 w-5 text-amber-400 mx-auto mb-2" />
          <p className="text-2xl font-bold">{ranking?.find(r => r.id === user?.id)?.totalPoints ?? 0}</p>
          <p className="text-xs text-muted-foreground">Pontos Totais</p>
        </div>
        <div className="stat-card p-4 text-center" style={{ "--stat-accent": "oklch(0.7 0.18 170)" } as React.CSSProperties}>
          <Target className="h-5 w-5 text-emerald-400 mx-auto mb-2" />
          <p className="text-2xl font-bold">{stats?.completed ?? 0}</p>
          <p className="text-xs text-muted-foreground">Concluídas</p>
        </div>
        <div className="stat-card p-4 text-center" style={{ "--stat-accent": "oklch(0.65 0.2 310)" } as React.CSSProperties}>
          <Award className="h-5 w-5 text-purple-400 mx-auto mb-2" />
          <p className="text-2xl font-bold">{myBadges?.length ?? 0}</p>
          <p className="text-xs text-muted-foreground">Conquistas</p>
        </div>
      </div>

      {/* Badges */}
      <div className="stat-card p-5" style={{ "--stat-accent": "oklch(0.65 0.2 310)" } as React.CSSProperties}>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Award className="h-4 w-4 text-primary" />
          Minhas Conquistas
        </h3>
        {myBadges && myBadges.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {myBadges.map((b) => (
              <div key={b.id} className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/30 border border-border/30">
                <span className="text-lg">{b.icon}</span>
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{b.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{b.description}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6">
            <Award className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">Nenhuma conquista ainda</p>
            <p className="text-xs text-muted-foreground mt-0.5">Complete tarefas para desbloquear!</p>
          </div>
        )}
      </div>

      {/* Performance */}
      {stats && (
        <div className="stat-card p-5" style={{ "--stat-accent": "oklch(0.7 0.18 170)" } as React.CSSProperties}>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Desempenho
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Taxa de Conclusão</span>
              <span className="text-sm font-bold">{stats.completionRate}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-chart-2 transition-all duration-500"
                style={{ width: `${stats.completionRate}%` }}
              />
            </div>
            <div className="grid grid-cols-4 gap-2 pt-1">
              <div className="text-center">
                <p className="text-lg font-bold">{stats.total}</p>
                <p className="text-[10px] text-muted-foreground">Total</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-amber-400">{stats.pending}</p>
                <p className="text-[10px] text-muted-foreground">Pendentes</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-blue-400">{stats.inProgress}</p>
                <p className="text-[10px] text-muted-foreground">Em Andamento</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-emerald-400">{stats.completed}</p>
                <p className="text-[10px] text-muted-foreground">Concluídas</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Points */}
      <div className="stat-card p-5" style={{ "--stat-accent": "oklch(0.75 0.18 50)" } as React.CSSProperties}>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Star className="h-4 w-4 text-primary" />
          Histórico de Pontos
        </h3>
        {myPoints && myPoints.length > 0 ? (
          <div className="space-y-1.5">
            {myPoints.slice(0, 10).map((p) => (
              <div key={p.id} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Zap className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs truncate">{p.reason}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(p.createdAt).toLocaleString("pt-BR")}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold text-primary shrink-0 ml-2">+{p.points}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6">
            <Zap className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum ponto registrado</p>
          </div>
        )}
      </div>
    </div>
  );
}
