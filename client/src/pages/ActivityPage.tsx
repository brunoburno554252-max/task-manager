import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity, CheckCircle2, PlusCircle, Pencil, Trash2, Award, ArrowRight,
} from "lucide-react";

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

export default function ActivityPage() {
  const { data: activities, isLoading } = trpc.activity.list.useQuery({ limit: 100 });

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

  // Group by date
  const grouped: Record<string, typeof activities> = {};
  if (activities) {
    for (const a of activities) {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Atividades</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Acompanhe todas as ações realizadas na plataforma.
        </p>
      </div>

      {activities && activities.length > 0 ? (
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
          <p className="text-muted-foreground">Nenhuma atividade registrada</p>
          <p className="text-sm text-muted-foreground/60 mt-1">As ações realizadas aparecerão aqui.</p>
        </div>
      )}
    </div>
  );
}
