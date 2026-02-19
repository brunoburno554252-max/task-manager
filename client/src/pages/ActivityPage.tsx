import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Activity, CheckCircle2, PlusCircle, Pencil, Trash2, Award, ArrowRight,
  Calendar, Filter, X,
} from "lucide-react";
import { useState, useMemo } from "react";

const actionIcons: Record<string, typeof Activity> = {
  created: PlusCircle,
  updated: Pencil,
  deleted: Trash2,
  status_changed: ArrowRight,
  earned_badge: Award,
  completed: CheckCircle2,
};

const actionColors: Record<string, string> = {
  created: "bg-blue-500/15 text-blue-400",
  updated: "bg-amber-500/15 text-amber-400",
  deleted: "bg-red-500/15 text-red-400",
  status_changed: "bg-purple-500/15 text-purple-400",
  earned_badge: "bg-emerald-500/15 text-emerald-400",
  completed: "bg-emerald-500/15 text-emerald-400",
};

const periodOptions = [
  { key: "all", label: "Todas" },
  { key: "today", label: "Hoje" },
  { key: "week", label: "Últimos 7 dias" },
  { key: "month", label: "Últimos 30 dias" },
  { key: "custom", label: "Personalizado" },
];

export default function ActivityPage() {
  const { data: activities, isLoading } = trpc.activity.list.useQuery({ limit: 500 });
  const [period, setPeriod] = useState("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  // Filter activities by period
  const filteredActivities = useMemo(() => {
    if (!activities) return [];
    if (period === "all") return activities;

    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    switch (period) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        break;
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "custom":
        if (!customStart) return activities;
        startDate = new Date(customStart + "T00:00:00");
        endDate = customEnd ? new Date(customEnd + "T23:59:59") : endDate;
        break;
      default:
        return activities;
    }

    return activities.filter(a => {
      const d = new Date(a.createdAt);
      return d >= startDate && d <= endDate;
    });
  }, [activities, period, customStart, customEnd]);

  // Group by date
  const grouped: Record<string, typeof filteredActivities> = {};
  if (filteredActivities) {
    for (const a of filteredActivities) {
      const dateKey = new Date(a.createdAt).toLocaleDateString("pt-BR", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey]!.push(a);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="space-y-2">
          {[...Array(10)].map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Atividades</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Acompanhe todas as ações realizadas na plataforma.
        </p>
      </div>

      {/* Period Filter */}
      <div className="stat-card p-4" style={{ "--stat-accent": "oklch(0.65 0.15 270)" } as React.CSSProperties}>
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Filtrar por período</span>
          {period !== "all" && (
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs ml-auto" onClick={() => { setPeriod("all"); setCustomStart(""); setCustomEnd(""); }}>
              <X className="h-3 w-3 mr-1" /> Limpar
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {periodOptions.map(opt => (
            <button
              key={opt.key}
              onClick={() => setPeriod(opt.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                period === opt.key
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "bg-muted/10 text-muted-foreground border border-border/30 hover:bg-muted/20"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Custom date range */}
        {period === "custom" && (
          <div className="flex items-center gap-3 mt-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="date"
                value={customStart}
                onChange={e => setCustomStart(e.target.value)}
                className="h-8 px-2 rounded-md border border-border/30 bg-muted/10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <span className="text-xs text-muted-foreground">até</span>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customEnd}
                onChange={e => setCustomEnd(e.target.value)}
                className="h-8 px-2 rounded-md border border-border/30 bg-muted/10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
        )}

        {/* Results count */}
        <p className="text-[10px] text-muted-foreground mt-2">
          {filteredActivities.length} atividade{filteredActivities.length !== 1 ? "s" : ""} encontrada{filteredActivities.length !== 1 ? "s" : ""}
        </p>
      </div>

      {filteredActivities && filteredActivities.length > 0 ? (
        <div className="space-y-5">
          {Object.entries(grouped).map(([date, items]) => (
            <div key={date}>
              <h3 className="text-xs font-medium text-muted-foreground mb-2 capitalize px-1">{date}</h3>
              <div className="stat-card overflow-hidden" style={{ "--stat-accent": "oklch(0.65 0.2 310)" } as React.CSSProperties}>
                <div className="divide-y divide-border/30">
                  {items?.map((a) => {
                    const Icon = actionIcons[a.action] ?? Activity;
                    const colorClass = actionColors[a.action] ?? "bg-muted/30 text-muted-foreground";

                    return (
                      <div key={a.id} className="flex items-start gap-3 p-3.5 hover:bg-muted/10 transition-colors">
                        <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm leading-relaxed">{a.details ?? `${a.action} ${a.entityType}`}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {new Date(a.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="stat-card p-12 text-center" style={{ "--stat-accent": "oklch(0.72 0.19 280)" } as React.CSSProperties}>
          <Activity className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-muted-foreground">
            {period !== "all" ? "Nenhuma atividade encontrada neste período" : "Nenhuma atividade registrada"}
          </p>
          <p className="text-sm text-muted-foreground/60 mt-1">
            {period !== "all" ? "Tente ajustar o filtro de período." : "As ações realizadas aparecerão aqui."}
          </p>
        </div>
      )}
    </div>
  );
}
