import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { Award, Lock, CheckCircle2 } from "lucide-react";

export default function Badges() {
  const { user } = useAuth();
  const { data: allBadges, isLoading: badgesLoading } = trpc.gamification.badges.useQuery();
  const { data: myBadges, isLoading: myBadgesLoading } = trpc.gamification.myBadges.useQuery();

  const isLoading = badgesLoading || myBadgesLoading;
  const earnedIds = new Set(myBadges?.map(b => b.badgeId) ?? []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-20 rounded-xl" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Conquistas</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Complete tarefas e alcance metas para desbloquear conquistas.
        </p>
      </div>

      {/* Summary */}
      <div className="stat-card p-5 flex items-center gap-5" style={{ "--stat-accent": "oklch(0.65 0.2 310)" } as React.CSSProperties}>
        <div className="h-14 w-14 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0 glow-primary">
          <Award className="h-7 w-7 text-primary" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Conquistas Desbloqueadas</p>
          <p className="text-3xl font-bold">
            {myBadges?.length ?? 0}
            <span className="text-lg text-muted-foreground font-normal"> / {allBadges?.length ?? 0}</span>
          </p>
        </div>
        <div className="flex-1">
          <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-chart-4 transition-all duration-500"
              style={{ width: `${allBadges && allBadges.length > 0 ? ((myBadges?.length ?? 0) / allBadges.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Badges Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {allBadges?.map((badge) => {
          const earned = earnedIds.has(badge.id);
          const earnedBadge = myBadges?.find(b => b.badgeId === badge.id);

          return (
            <div
              key={badge.id}
              className={`stat-card p-4 flex flex-col items-center text-center transition-all ${
                earned
                  ? "ring-1 ring-primary/30"
                  : "opacity-50"
              }`}
              style={{
                "--stat-accent": earned ? "oklch(0.72 0.19 280)" : "oklch(0.3 0.01 270)",
              } as React.CSSProperties}
            >
              <div className={`text-4xl mb-2 ${earned ? "drop-shadow-lg" : "grayscale"}`}>
                {badge.icon}
              </div>
              <h3 className="font-semibold text-xs">{badge.name}</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                {badge.description}
              </p>
              {earned ? (
                <div className="flex items-center gap-1 mt-2 text-[10px] text-primary font-medium">
                  <CheckCircle2 className="h-3 w-3" />
                  {earnedBadge?.earnedAt ? new Date(earnedBadge.earnedAt).toLocaleDateString("pt-BR") : "Conquistado"}
                </div>
              ) : (
                <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground">
                  <Lock className="h-3 w-3" />
                  Bloqueado
                </div>
              )}
            </div>
          );
        })}
      </div>

      {(!allBadges || allBadges.length === 0) && (
        <div className="stat-card p-12 text-center" style={{ "--stat-accent": "oklch(0.72 0.19 280)" } as React.CSSProperties}>
          <Award className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhuma conquista disponível</p>
        </div>
      )}
    </div>
  );
}
