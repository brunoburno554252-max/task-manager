import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ListTodo, CheckCircle2, Clock, AlertTriangle, TrendingUp,
  Trophy, Activity, Zap, ArrowRight,
} from "lucide-react";
import { useLocation } from "wouter";
import { useMemo } from "react";
import {
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

const COLORS = {
  pending: "#f59e0b",
  in_progress: "#3b82f6",
  completed: "#10b981",
  overdue: "#ef4444",
};

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { data: stats, isLoading: statsLoading } = trpc.dashboard.stats.useQuery({});
  const { data: ranking } = trpc.gamification.ranking.useQuery();
  const { data: recentCompletions } = trpc.dashboard.recentCompletions.useQuery({ days: 30 });
  const { data: activityData } = trpc.activity.list.useQuery({ limit: 8 });

  const pieData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: "Pendentes", value: stats.pending, color: COLORS.pending },
      { name: "Em Andamento", value: stats.inProgress, color: COLORS.in_progress },
      { name: "Concluídas", value: stats.completed, color: COLORS.completed },
    ].filter(d => d.value > 0);
  }, [stats]);

  const areaData = useMemo(() => {
    if (!recentCompletions || recentCompletions.length === 0) return [];
    const grouped: Record<string, number> = {};
    for (const c of recentCompletions) {
      if (c.completedAt) {
        const day = new Date(c.completedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
        grouped[day] = (grouped[day] ?? 0) + 1;
      }
    }
    return Object.entries(grouped).map(([date, count]) => ({ date, count }));
  }, [recentCompletions]);

  const topRanking = useMemo(() => ranking?.slice(0, 5) ?? [], [ranking]);

  if (statsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: "Total de Tarefas",
      value: stats?.total ?? 0,
      icon: ListTodo,
      accent: "oklch(0.72 0.19 280)",
      iconColor: "text-primary",
    },
    {
      label: "Concluídas",
      value: stats?.completed ?? 0,
      icon: CheckCircle2,
      accent: "oklch(0.7 0.18 170)",
      iconColor: "text-emerald-400",
    },
    {
      label: "Em Andamento",
      value: stats?.inProgress ?? 0,
      icon: Clock,
      accent: "oklch(0.65 0.18 240)",
      iconColor: "text-blue-400",
    },
    {
      label: "Atrasadas",
      value: stats?.overdue ?? 0,
      icon: AlertTriangle,
      accent: "oklch(0.65 0.22 25)",
      iconColor: "text-red-400",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Olá, {user?.name?.split(" ")[0]}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Aqui está o resumo de desempenho da sua equipe.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="stat-card px-3 py-1.5 flex items-center gap-2" style={{ "--stat-accent": "oklch(0.72 0.19 280)" } as React.CSSProperties}>
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold">{stats?.completionRate ?? 0}% concluído</span>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="stat-card p-4"
            style={{ "--stat-accent": card.accent } as React.CSSProperties}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground font-medium">{card.label}</span>
              <card.icon className={`h-4 w-4 ${card.iconColor}`} />
            </div>
            <p className="text-3xl font-bold tracking-tight">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Pie Chart */}
        <div className="lg:col-span-2 stat-card p-5" style={{ "--stat-accent": "oklch(0.72 0.19 280)" } as React.CSSProperties}>
          <h3 className="text-sm font-semibold mb-4">Distribuição por Status</h3>
          {pieData.length > 0 ? (
            <div className="flex items-center gap-4">
              <div className="w-36 h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={38}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {pieData.map((d) => (
                  <div key={d.name} className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                    <span className="text-xs text-muted-foreground">{d.name}</span>
                    <span className="text-xs font-semibold ml-auto">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-36 text-sm text-muted-foreground/50">
              Nenhuma tarefa registrada
            </div>
          )}
        </div>

        {/* Area Chart */}
        <div className="lg:col-span-3 stat-card p-5" style={{ "--stat-accent": "oklch(0.7 0.18 170)" } as React.CSSProperties}>
          <h3 className="text-sm font-semibold mb-4">Conclusões (30 dias)</h3>
          {areaData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={areaData}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.72 0.19 280)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="oklch(0.72 0.19 280)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.26 0.018 270 / 0.5)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "oklch(0.6 0.015 270)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "oklch(0.6 0.015 270)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.19 0.02 270)",
                    border: "1px solid oklch(0.28 0.02 270)",
                    borderRadius: "0.5rem",
                    fontSize: "12px",
                    color: "oklch(0.93 0.005 270)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="oklch(0.72 0.19 280)"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorCount)"
                  name="Concluídas"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-40 text-sm text-muted-foreground/50">
              Nenhuma conclusão recente
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Ranking */}
        <div className="stat-card p-5" style={{ "--stat-accent": "oklch(0.75 0.18 50)" } as React.CSSProperties}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-400" />
              Top 5 Ranking
            </h3>
            <button
              onClick={() => setLocation("/ranking")}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              Ver tudo <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <div className="space-y-1.5">
            {topRanking.map((r, i) => {
              const medals = ["🥇", "🥈", "🥉"];
              return (
                <div key={r.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                  <span className="text-sm w-6 text-center font-bold">
                    {i < 3 ? medals[i] : `${i + 1}º`}
                  </span>
                  <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                    {r.name?.charAt(0)?.toUpperCase() ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.name ?? "Sem nome"}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Zap className="h-3 w-3 text-amber-400" />
                    <span className="text-xs font-bold">{r.totalPoints}</span>
                  </div>
                </div>
              );
            })}
            {topRanking.length === 0 && (
              <div className="text-center py-6 text-sm text-muted-foreground/50">
                Nenhum colaborador no ranking
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="stat-card p-5" style={{ "--stat-accent": "oklch(0.65 0.2 310)" } as React.CSSProperties}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-purple-400" />
              Atividades Recentes
            </h3>
            <button
              onClick={() => setLocation("/activity")}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              Ver tudo <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <div className="space-y-1.5">
            {activityData?.slice(0, 6).map((a) => (
              <div key={a.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs leading-relaxed">{a.details}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {new Date(a.createdAt).toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>
            ))}
            {(!activityData || activityData.length === 0) && (
              <div className="text-center py-6 text-sm text-muted-foreground/50">
                Nenhuma atividade recente
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
