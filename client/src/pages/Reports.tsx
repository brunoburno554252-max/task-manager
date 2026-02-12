import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarChart3, Users, Target, TrendingUp, Award } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts";
import { useState, useMemo } from "react";

export default function Reports() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [selectedUser, setSelectedUser] = useState<string>("all");

  const { data: ranking, isLoading: rankingLoading } = trpc.gamification.ranking.useQuery();
  const { data: allUsers } = trpc.users.list.useQuery();
  const { data: globalStats } = trpc.dashboard.stats.useQuery({});

  const selectedUserId = selectedUser !== "all" ? parseInt(selectedUser) : undefined;
  const userStatsInput = useMemo(() => ({ userId: selectedUserId }), [selectedUserId]);
  const { data: userStats } = trpc.dashboard.stats.useQuery(userStatsInput);

  const stats = selectedUser === "all" ? globalStats : userStats;

  const performanceData = useMemo(() => {
    if (!ranking) return [];
    const data = selectedUser === "all" ? ranking : ranking.filter(r => r.id === selectedUserId);
    return data.slice(0, 10).map(u => ({
      name: u.name?.split(" ")[0] ?? "?",
      concluidas: u.completedTasks,
      noPrazo: u.onTimeTasks,
      pontos: u.totalPoints,
    }));
  }, [ranking, selectedUser, selectedUserId]);

  const radarData = useMemo(() => {
    if (!ranking || selectedUser === "all") return [];
    const u = ranking.find(r => r.id === selectedUserId);
    if (!u) return [];
    const maxInRanking = {
      completed: Math.max(...ranking.map(r => r.completedTasks), 1),
      onTime: Math.max(...ranking.map(r => r.onTimeTasks), 1),
      points: Math.max(...ranking.map(r => r.totalPoints), 1),
      total: Math.max(...ranking.map(r => r.totalAssigned), 1),
    };
    return [
      { metric: "Concluídas", value: Math.round((u.completedTasks / maxInRanking.completed) * 100) },
      { metric: "No Prazo", value: Math.round((u.onTimeTasks / maxInRanking.onTime) * 100) },
      { metric: "Pontuação", value: Math.round((u.totalPoints / maxInRanking.points) * 100) },
      { metric: "Volume", value: Math.round((u.totalAssigned / maxInRanking.total) * 100) },
      { metric: "Eficiência", value: u.totalAssigned > 0 ? Math.round((u.completedTasks / u.totalAssigned) * 100) : 0 },
    ];
  }, [ranking, selectedUser, selectedUserId]);

  const isLoading = rankingLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Relatórios
          </h1>
          <p className="text-muted-foreground mt-1">
            Análise detalhada de desempenho individual e da equipe.
          </p>
        </div>
        <Select value={selectedUser} onValueChange={setSelectedUser}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filtrar por" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Visão Geral</SelectItem>
            {allUsers?.map(u => (
              <SelectItem key={u.id} value={u.id.toString()}>
                {u.name ?? `User #${u.id}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-xl font-bold">{stats?.total ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
              <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Concluídas</p>
              <p className="text-xl font-bold text-green-700 dark:text-green-400">{stats?.completed ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
              <Award className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Taxa</p>
              <p className="text-xl font-bold text-amber-700 dark:text-amber-400">{stats?.completionRate ?? 0}%</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
              <Users className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Atrasadas</p>
              <p className="text-xl font-bold text-red-700 dark:text-red-400">{stats?.overdue ?? 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bar Chart - Performance Comparison */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">
              {selectedUser === "all" ? "Desempenho por Colaborador" : "Desempenho Individual"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {performanceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={performanceData}>
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
                  <Bar dataKey="concluidas" fill="oklch(0.55 0.2 265)" radius={[4, 4, 0, 0]} name="Concluídas" />
                  <Bar dataKey="noPrazo" fill="oklch(0.7 0.15 145)" radius={[4, 4, 0, 0]} name="No Prazo" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
                Sem dados disponíveis
              </div>
            )}
          </CardContent>
        </Card>

        {/* Radar Chart - Individual Performance */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">
              {selectedUser === "all" ? "Pontuação por Colaborador" : "Perfil de Desempenho"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedUser !== "all" && radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="oklch(0.9 0.005 265)" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} stroke="oklch(0.6 0.02 265)" />
                  <PolarRadiusAxis tick={{ fontSize: 10 }} stroke="oklch(0.8 0.005 265)" />
                  <Radar
                    name="Desempenho"
                    dataKey="value"
                    stroke="oklch(0.55 0.2 265)"
                    fill="oklch(0.55 0.2 265)"
                    fillOpacity={0.2}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "none",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      fontSize: "13px",
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            ) : selectedUser === "all" && performanceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={performanceData}>
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
                  <Bar dataKey="pontos" fill="oklch(0.6 0.18 300)" radius={[4, 4, 0, 0]} name="Pontos" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
                Selecione um colaborador para ver o perfil
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
