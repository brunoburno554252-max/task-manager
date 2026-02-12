import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  User, Award, Trophy, Target, Calendar, Star, Zap,
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

  const myRankData = useMemo(() => {
    if (!ranking || !user) return null;
    return ranking.find(r => r.id === user.id);
  }, [ranking, user]);

  const isLoading = badgesLoading || pointsLoading || statsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-primary/5 via-primary/10 to-accent/5">
        <CardContent className="p-6">
          <div className="flex items-center gap-5">
            <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center text-3xl font-bold text-primary shrink-0">
              {user?.name?.charAt(0)?.toUpperCase() ?? "?"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold truncate">{user?.name ?? "Usuário"}</h1>
                <Badge variant="secondary" className="shrink-0">
                  {user?.role === "admin" ? "Administrador" : "Colaborador"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{user?.email}</p>
              <div className="flex items-center gap-4 mt-3">
                {myRank && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <Trophy className="h-4 w-4 text-amber-500" />
                    <span className="font-medium">{myRank}º lugar</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-sm">
                  <Star className="h-4 w-4 text-primary" />
                  <span className="font-medium">{user?.totalPoints ?? 0} pontos</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm">
                  <Award className="h-4 w-4 text-green-500" />
                  <span className="font-medium">{myBadges?.length ?? 0} conquistas</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Stats */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Minhas Estatísticas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total de Tarefas</span>
              <span className="font-semibold">{stats?.total ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Concluídas</span>
              <span className="font-semibold text-green-600">{stats?.completed ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Em Andamento</span>
              <span className="font-semibold text-blue-600">{stats?.inProgress ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Pendentes</span>
              <span className="font-semibold">{stats?.pending ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Atrasadas</span>
              <span className="font-semibold text-red-600">{stats?.overdue ?? 0}</span>
            </div>
            <div className="pt-2">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm text-muted-foreground">Taxa de Conclusão</span>
                <span className="font-semibold text-primary">{stats?.completionRate ?? 0}%</span>
              </div>
              <Progress value={stats?.completionRate ?? 0} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Badges */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Award className="h-4 w-4 text-primary" />
              Minhas Conquistas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {myBadges && myBadges.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {myBadges.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center gap-2 p-3 rounded-lg bg-primary/5"
                  >
                    <span className="text-2xl">{b.icon}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{b.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{b.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <Award className="h-10 w-10 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">Nenhuma conquista ainda</p>
                <p className="text-xs text-muted-foreground mt-1">Complete tarefas para desbloquear!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Points */}
        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Histórico de Pontos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {myPoints && myPoints.length > 0 ? (
              <div className="space-y-2">
                {myPoints.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Star className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm truncate">{p.reason}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(p.createdAt).toLocaleString("pt-BR")}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-primary shrink-0 ml-2">+{p.points}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <Zap className="h-10 w-10 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">Nenhum ponto registrado</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
