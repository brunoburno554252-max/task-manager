import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ListTodo, CheckCircle2, Clock, AlertTriangle, TrendingUp, Trophy, Zap, Target, Activity,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { useMemo } from "react";

const COLORS = [
  "oklch(0.55 0.2 265)",
  "oklch(0.65 0.17 180)",
  "oklch(0.7 0.15 145)",
  "oklch(0.6 0.18 300)",
];

export default function Home() {
  const { user } = useAuth();
  const { data: stats, isLoading: statsLoading } = trpc.dashboard.stats.useQuery({});
  const { data: ranking, isLoading: rankingLoading } = trpc.gamification.ranking.useQuery();
  const { data: recentCompletions } = trpc.dashboard.recentCompletions.useQuery({});
  const { data: activities } = trpc.activity.list.useQuery({ limit: 5 });

  const pieData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: "Concluídas", value: stats.completed, color: COLORS[2] },
      { name: "Em Andamento", value: stats.inProgress, color: COLORS[0] },
      { name: "Pendentes", value: stats.pending, color: COLORS[3] },
      { name: "Atrasadas", value: stats.overdue, color: COLORS[1] },
    ].filter(d => d.value > 0);
  }, [stats]);

  const weeklyData = useMemo(() => {
    if (!recentCompletions || recentCompletions.length === 0) return [];
    const days: Record<string, number> = {};
    const now = Date.now();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now - i * 86400000);
      const key = d.toLocaleDateString("pt-BR", { weekday: "short" });
      days[key] = 0;
    }
    for (const c of recentCompletions) {
      if (!c.completedAt) continue;
      const d = new Date(c.completedAt);
      const diff = Math.floor((now - c.completedAt) / 86400000);
      if (diff < 7) {
        const key = d.toLocaleDateString("pt-BR", { weekday: "short" });
        if (key in days) days[key]++;
      }
    }
    return Object.entries(days).map(([name, value]) => ({ name, value }));
  }, [recentCompletions]);

  const topRanking = useMemo(() => {
    if (!ranking) return [];
    return ranking.slice(0, 5);
  }, [ranking]);

  if (statsLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Olá, {user?.name?.split(" ")[0] ?? "Usuário"} 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          Aqui está o resumo de desempenho da sua equipe.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total de Tarefas</p>
                <p className="text-3xl font-bold mt-1">{stats?.total ?? 0}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <ListTodo className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Concluídas</p>
                <p className="text-3xl font-bold mt-1 text-green-700 dark:text-green-400">{stats?.completed ?? 0}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/20 dark:to-amber-900/10">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Em Andamento</p>
                <p className="text-3xl font-bold mt-1 text-amber-700 dark:text-amber-400">{stats?.inProgress ?? 0}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/20 dark:to-red-900/10">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Atrasadas</p>
                <p className="text-3xl font-bold mt-1 text-red-700 dark:text-red-400">{stats?.overdue ?? 0}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Completion Rate + Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Taxa de Conclusão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-4">
              <div className="relative h-36 w-36">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" className="text-muted/30" strokeWidth="10" />
                  <circle
                    cx="60" cy="60" r="50" fill="none"
                    stroke="oklch(0.55 0.2 265)"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${(stats?.completionRate ?? 0) * 3.14} 314`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-bold">{stats?.completionRate ?? 0}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Distribuição por Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "none",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      fontSize: "13px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[180px] text-muted-foreground text-sm">
                Nenhuma tarefa registrada
              </div>
            )}
            <div className="flex flex-wrap gap-3 justify-center mt-2">
              {pieData.map((d, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-muted-foreground">{d.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Conclusões (7 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {weeklyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.005 265)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="oklch(0.6 0.02 265)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="oklch(0.6 0.02 265)" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "none",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      fontSize: "13px",
                    }}
                  />
                  <Bar dataKey="value" fill="oklch(0.55 0.2 265)" radius={[4, 4, 0, 0]} name="Concluídas" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[180px] text-muted-foreground text-sm">
                Nenhuma conclusão recente
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ranking + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              Top 5 Ranking
            </CardTitle>
          </CardHeader>
          <CardContent>
            {rankingLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 rounded-lg" />
                ))}
              </div>
            ) : topRanking.length > 0 ? (
              <div className="space-y-2">
                {topRanking.map((u, i) => {
                  const medals = ["🥇", "🥈", "🥉"];
                  return (
                    <div
                      key={u.id}
                      className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                        i === 0 ? "bg-amber-50 dark:bg-amber-950/20" : "hover:bg-muted/50"
                      }`}
                    >
                      <span className="text-lg w-8 text-center font-semibold">
                        {i < 3 ? medals[i] : `${i + 1}º`}
                      </span>
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary shrink-0">
                        {u.name?.charAt(0)?.toUpperCase() ?? "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{u.name ?? "Sem nome"}</p>
                        <p className="text-xs text-muted-foreground">
                          {u.completedTasks} tarefas concluídas
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-primary">{u.totalPoints} pts</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                Nenhum colaborador no ranking
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Atividades Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activities && activities.length > 0 ? (
              <div className="space-y-3">
                {activities.map((a) => (
                  <div key={a.id} className="flex items-start gap-3 p-2">
                    <div className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{a.details}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(a.createdAt).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                Nenhuma atividade registrada
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
