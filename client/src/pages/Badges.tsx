import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { Award, Lock, CheckCircle2, Trophy, Gift, Star, TrendingUp } from "lucide-react";
import { statusLevels, getStatusLevel, getNextLevel, getLevelProgress } from "@/lib/statusLevels";
import LevelIcon from "@/components/LevelIcon";

export default function Badges() {
  const { user } = useAuth();
  const { data: allBadges, isLoading: badgesLoading } = trpc.gamification.badges.useQuery();
  const { data: myBadges, isLoading: myBadgesLoading } = trpc.gamification.myBadges.useQuery();

  const isLoading = badgesLoading || myBadgesLoading;
  const earnedIds = new Set(myBadges?.map(b => b.badgeId) ?? []);
  const userPoints = (user as any)?.totalPoints || 0;
  const currentLevel = getStatusLevel(userPoints);
  const nextLevel = getNextLevel(userPoints);
  const progress = getLevelProgress(userPoints);

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
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Conquistas</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Ganhe pontos completando tarefas e suba de nível para desbloquear recompensas incríveis!
        </p>
      </div>

      {/* Meu Nível Atual - Card compacto e bem alinhado */}
      <div className="rounded-xl border border-border/40 bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Star className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">Meu Nível Atual</h2>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Ícone e nome do nível */}
          <div className="flex flex-col items-center text-center shrink-0">
            <LevelIcon level={currentLevel} size="xl" />
            <span className={`text-lg font-bold mt-2 ${currentLevel.color}`}>{currentLevel.name}</span>
            <span className="text-sm text-muted-foreground">{userPoints.toLocaleString()} pontos</span>
            {currentLevel.reward && (
              <span className="flex items-center gap-1 mt-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-semibold border border-amber-500/20">
                <Gift className="h-3 w-3" /> {currentLevel.reward}
              </span>
            )}
          </div>

          {/* Barra de progresso */}
          {nextLevel && (
            <div className="flex-1 w-full min-w-0">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                <span>Progresso para <strong className={nextLevel.color}>{nextLevel.name}</strong></span>
                <span className="font-medium">{progress}%</span>
              </div>
              <div className="h-3 rounded-full bg-muted/30 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-chart-4 transition-all duration-700"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-muted-foreground">
                  Faltam <strong className="text-foreground">{(nextLevel.minPoints - userPoints).toLocaleString()}</strong> pontos
                </span>
                <div className="flex items-center gap-1.5">
                  <LevelIcon level={nextLevel} size="sm" />
                  <span className={`text-xs font-semibold ${nextLevel.color}`}>{nextLevel.name}</span>
                </div>
              </div>
            </div>
          )}

          {!nextLevel && (
            <div className="flex-1 text-center sm:text-left">
              <p className="text-lg font-bold text-amber-400">Nível Máximo Alcançado!</p>
              <p className="text-sm text-muted-foreground mt-1">Parabéns! Você chegou ao topo da hierarquia.</p>
            </div>
          )}
        </div>
      </div>

      {/* Tabela de Níveis de Progressão */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="h-5 w-5 text-amber-400" />
          <h2 className="text-lg font-bold">Níveis de Progressão</h2>
        </div>

        <div className="space-y-2">
          {statusLevels.map((level, index) => {
            const isCurrentLevel = currentLevel.name === level.name;
            const isUnlocked = userPoints >= level.minPoints;
            const isNext = nextLevel?.name === level.name;
            const maxPoints = index < statusLevels.length - 1 ? statusLevels[index + 1].minPoints - 1 : null;

            return (
              <div
                key={level.name}
                className={`relative rounded-xl border p-4 transition-all overflow-hidden ${
                  isCurrentLevel
                    ? "border-primary/50 bg-primary/5 shadow-md"
                    : isNext
                    ? "border-amber-500/30 bg-amber-500/5"
                    : isUnlocked
                    ? "border-green-500/20 bg-card"
                    : "border-border/20 bg-card opacity-60"
                }`}
              >
                {/* Badges de status - dentro do card, não fora */}
                {isCurrentLevel && (
                  <div className="absolute top-2 right-3 px-2 py-0.5 rounded-md bg-primary text-primary-foreground text-[10px] font-bold">
                    SEU NÍVEL
                  </div>
                )}
                {isNext && (
                  <div className="absolute top-2 right-3 px-2 py-0.5 rounded-md bg-amber-500 text-white text-[10px] font-bold animate-pulse">
                    PRÓXIMO
                  </div>
                )}

                <div className="flex items-center gap-3">
                  {/* Número do nível */}
                  <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    isUnlocked ? "bg-primary/20 text-primary" : "bg-muted/20 text-muted-foreground"
                  }`}>
                    {index + 1}
                  </div>

                  {/* Ícone */}
                  <div className={`shrink-0 ${!isUnlocked ? "opacity-40 grayscale" : ""}`}>
                    <LevelIcon level={level} size="md" />
                  </div>

                  {/* Nome e pontos */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className={`font-bold text-sm ${isUnlocked ? level.color : "text-muted-foreground"}`}>
                        {level.name}
                      </h3>
                      {isUnlocked ? (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-green-400 font-medium">
                          <CheckCircle2 className="h-3 w-3" /> Desbloqueado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                          <Lock className="h-3 w-3" /> Bloqueado
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {level.minPoints.toLocaleString()} {maxPoints ? `a ${maxPoints.toLocaleString()}` : "+"} pontos
                    </p>
                  </div>

                  {/* Recompensa - alinhada à direita */}
                  <div className="shrink-0 hidden sm:block">
                    {level.reward ? (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <Gift className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                        <span className="text-xs font-bold text-amber-400 whitespace-nowrap">{level.reward}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/10 border border-border/20">
                        <TrendingUp className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                        <span className="text-xs text-muted-foreground whitespace-nowrap">Prestígio</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Recompensa mobile - abaixo do conteúdo */}
                <div className="sm:hidden mt-2 ml-10">
                  {level.reward ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-xs font-bold text-amber-400">
                      <Gift className="h-3 w-3" /> {level.reward}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted/10 border border-border/20 text-xs text-muted-foreground">
                      <TrendingUp className="h-3 w-3" /> Prestígio
                    </span>
                  )}
                </div>

                {/* Barra de progresso para o próximo nível */}
                {isNext && (
                  <div className="mt-3 pt-3 border-t border-border/20 ml-10">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                      <span>Seu progresso</span>
                      <span className="font-medium">{userPoints.toLocaleString()} / {level.minPoints.toLocaleString()} pts</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-amber-400 transition-all duration-700"
                        style={{ width: `${Math.min(100, (userPoints / level.minPoints) * 100)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Faltam <strong className="text-foreground">{(level.minPoints - userPoints).toLocaleString()}</strong> pontos para desbloquear
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Conquistas Especiais (Badges) */}
      {allBadges && allBadges.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Award className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold">Conquistas Especiais</h2>
            <span className="text-xs text-muted-foreground ml-2">
              {myBadges?.length ?? 0} / {allBadges?.length ?? 0} desbloqueadas
            </span>
          </div>

          {/* Summary bar */}
          <div className="rounded-xl border border-border/40 bg-card p-4 mb-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0">
                <Award className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">Progresso das Conquistas</p>
                <div className="h-2 rounded-full bg-muted/30 overflow-hidden mt-2">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-chart-4 transition-all duration-500"
                    style={{ width: `${allBadges.length > 0 ? ((myBadges?.length ?? 0) / allBadges.length) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <p className="text-2xl font-bold shrink-0">
                {myBadges?.length ?? 0}
                <span className="text-sm text-muted-foreground font-normal">/{allBadges.length}</span>
              </p>
            </div>
          </div>

          {/* Badges Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {allBadges.map((badge) => {
              const earned = earnedIds.has(badge.id);
              const earnedBadge = myBadges?.find(b => b.badgeId === badge.id);

              return (
                <div
                  key={badge.id}
                  className={`rounded-xl border p-4 flex flex-col items-center text-center transition-all ${
                    earned
                      ? "border-primary/30 bg-primary/5"
                      : "border-border/20 bg-card opacity-50"
                  }`}
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
        </div>
      )}

      {(!allBadges || allBadges.length === 0) && (
        <div className="rounded-xl border border-border/20 bg-card p-12 text-center">
          <Award className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhuma conquista especial disponível ainda</p>
        </div>
      )}
    </div>
  );
}
