import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  created: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  updated: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
  deleted: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
  status_changed: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
  earned_badge: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
  completed: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
};

export default function ActivityPage() {
  const { data: activities, isLoading } = trpc.activity.list.useQuery({ limit: 100 });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="space-y-3">
          {[...Array(10)].map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
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
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Activity className="h-6 w-6 text-primary" />
          Histórico de Atividades
        </h1>
        <p className="text-muted-foreground mt-1">
          Acompanhe todas as ações realizadas na plataforma.
        </p>
      </div>

      {activities && activities.length > 0 ? (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, items]) => (
            <div key={date}>
              <h3 className="text-sm font-medium text-muted-foreground mb-3 capitalize">{date}</h3>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-0 divide-y divide-border">
                  {items?.map((a) => {
                    const Icon = actionIcons[a.action] ?? Activity;
                    const colorClass = actionColors[a.action] ?? "bg-muted text-muted-foreground";

                    return (
                      <div key={a.id} className="flex items-start gap-3 p-4">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">{a.details ?? `${a.action} ${a.entityType}`}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(a.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      ) : (
        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Activity className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">Nenhuma atividade registrada</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
