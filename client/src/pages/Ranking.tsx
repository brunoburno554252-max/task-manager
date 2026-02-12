import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Trophy, Medal, TrendingUp, Target, Crown } from "lucide-react";

export default function Ranking() {
  const { data: ranking, isLoading } = trpc.gamification.ranking.useQuery();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="space-y-3">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const maxPoints = ranking && ranking.length > 0 ? ranking[0].totalPoints : 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Trophy className="h-6 w-6 text-amber-500" />
          Ranking de Produtividade
        </h1>
        <p className="text-muted-foreground mt-1">
          Acompanhe o desempenho e a pontuação de cada colaborador.
        </p>
      </div>

      {/* Top 3 Podium */}
      {ranking && ranking.length >= 3 && (
        <div className="grid grid-cols-3 gap-3">
          {[1, 0, 2].map((idx) => {
            const u = ranking[idx];
            if (!u) return null;
            const position = idx + 1;
            const colors = [
              "from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 ring-amber-200 dark:ring-amber-800",
              "from-slate-50 to-slate-100/50 dark:from-slate-950/30 dark:to-slate-800/20 ring-slate-200 dark:ring-slate-700",
              "from-orange-50 to-orange-100/50 dark:from-orange-950/30 dark:to-orange-900/20 ring-orange-200 dark:ring-orange-800",
            ];
            const icons = [Crown, Medal, Medal];
            const iconColors = ["text-amber-500", "text-slate-400", "text-orange-400"];
            const Icon = icons[idx];
            const isFirst = idx === 0;

            return (
              <Card
                key={u.id}
                className={`border-0 shadow-sm bg-gradient-to-br ${colors[idx]} ${isFirst ? "ring-2 scale-105" : "ring-1"}`}
              >
                <CardContent className="p-4 flex flex-col items-center text-center">
                  <Icon className={`h-6 w-6 ${iconColors[idx]} mb-2`} />
                  <div className={`h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary mb-2 ${isFirst ? "h-16 w-16" : ""}`}>
                    {u.name?.charAt(0)?.toUpperCase() ?? "?"}
                  </div>
                  <p className="font-semibold text-sm truncate w-full">{u.name ?? "Sem nome"}</p>
                  <p className="text-2xl font-bold text-primary mt-1">{u.totalPoints}</p>
                  <p className="text-xs text-muted-foreground">pontos</p>
                  <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                    <span>{u.completedTasks} concluídas</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Full Ranking */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Classificação Geral
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ranking && ranking.length > 0 ? (
            <div className="space-y-2">
              {ranking.map((u, i) => {
                const medals = ["🥇", "🥈", "🥉"];
                const completionRate = u.totalAssigned > 0
                  ? Math.round((u.completedTasks / u.totalAssigned) * 100)
                  : 0;
                const pointsPercent = maxPoints > 0 ? (u.totalPoints / maxPoints) * 100 : 0;

                return (
                  <div
                    key={u.id}
                    className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${
                      i === 0 ? "bg-amber-50/50 dark:bg-amber-950/10" : "hover:bg-muted/50"
                    }`}
                  >
                    <span className="text-lg w-10 text-center font-semibold shrink-0">
                      {i < 3 ? medals[i] : `${i + 1}º`}
                    </span>
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary shrink-0">
                      {u.name?.charAt(0)?.toUpperCase() ?? "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium truncate">{u.name ?? "Sem nome"}</p>
                        <p className="text-sm font-bold text-primary shrink-0 ml-2">{u.totalPoints} pts</p>
                      </div>
                      <Progress value={pointsPercent} className="h-1.5" />
                      <div className="flex gap-4 mt-1.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Target className="h-3 w-3" />
                          {u.completedTasks}/{u.totalAssigned} tarefas
                        </span>
                        <span>{u.onTimeTasks} no prazo</span>
                        <span>{completionRate}% conclusão</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16">
              <Trophy className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">Nenhum colaborador no ranking ainda</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
