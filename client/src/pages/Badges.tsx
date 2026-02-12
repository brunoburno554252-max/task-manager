import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(9)].map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Award className="h-6 w-6 text-primary" />
          Conquistas
        </h1>
        <p className="text-muted-foreground mt-1">
          Complete tarefas e alcance metas para desbloquear conquistas.
        </p>
      </div>

      {/* Summary */}
      <div className="flex items-center gap-6 p-4 rounded-xl bg-gradient-to-r from-primary/5 to-primary/10">
        <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center">
          <Award className="h-7 w-7 text-primary" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Conquistas Desbloqueadas</p>
          <p className="text-3xl font-bold">
            {myBadges?.length ?? 0}
            <span className="text-lg text-muted-foreground font-normal"> / {allBadges?.length ?? 0}</span>
          </p>
        </div>
      </div>

      {/* Badges Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {allBadges?.map((badge) => {
          const earned = earnedIds.has(badge.id);
          const earnedBadge = myBadges?.find(b => b.badgeId === badge.id);

          return (
            <Card
              key={badge.id}
              className={`border-0 shadow-sm transition-all ${
                earned
                  ? "bg-gradient-to-br from-primary/5 to-primary/10 ring-1 ring-primary/20"
                  : "opacity-60 grayscale"
              }`}
            >
              <CardContent className="p-5 flex flex-col items-center text-center">
                <div className={`text-4xl mb-3 ${earned ? "" : "opacity-50"}`}>
                  {badge.icon}
                </div>
                <h3 className="font-semibold text-sm">{badge.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">{badge.description}</p>
                {earned ? (
                  <div className="flex items-center gap-1 mt-3 text-xs text-primary font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Conquistado {earnedBadge?.earnedAt ? new Date(earnedBadge.earnedAt).toLocaleDateString("pt-BR") : ""}
                  </div>
                ) : (
                  <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
                    <Lock className="h-3.5 w-3.5" />
                    Bloqueado
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {(!allBadges || allBadges.length === 0) && (
        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Award className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">Nenhuma conquista disponível</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
