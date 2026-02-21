// Sistema de Status por Pontos - Níveis de Progressão
// Cada colaborador ganha um status baseado na quantidade total de pontos

export interface StatusLevel {
  name: string;
  minPoints: number;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  reward?: string;
}

export const statusLevels: StatusLevel[] = [
  {
    name: "Estagiário do CEO",
    minPoints: 0,
    icon: "📋",
    color: "text-slate-400",
    bgColor: "bg-slate-500/10",
    borderColor: "border-slate-500/20",
  },
  {
    name: "Júnior",
    minPoints: 100,
    icon: "🌱",
    color: "text-green-400",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/20",
  },
  {
    name: "Master",
    minPoints: 300,
    icon: "⚡",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
  },
  {
    name: "Sênior",
    minPoints: 500,
    icon: "🔥",
    color: "text-orange-400",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/20",
  },
  {
    name: "Mestre LA",
    minPoints: 1000,
    icon: "🎯",
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/20",
  },
  {
    name: "Gênio LA",
    minPoints: 2000,
    icon: "🧠",
    color: "text-pink-400",
    bgColor: "bg-pink-500/10",
    borderColor: "border-pink-500/20",
    reward: "Vale R$ 1.000,00",
  },
  {
    name: "Sábio LA",
    minPoints: 5000,
    icon: "🦉",
    color: "text-indigo-400",
    bgColor: "bg-indigo-500/10",
    borderColor: "border-indigo-500/20",
    reward: "Vale R$ 2.000,00",
  },
  {
    name: "Rei das Tarefas",
    minPoints: 10000,
    icon: "👑",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
    reward: "Prêmio Surpresa",
  },
  {
    name: "LAzeiro",
    minPoints: 20000,
    icon: "💎",
    color: "text-cyan-300",
    bgColor: "bg-cyan-500/10",
    borderColor: "border-cyan-500/20",
    reward: "iPhone 15 ou 16",
  },
];

/**
 * Retorna o nível atual do colaborador baseado nos pontos
 */
export function getStatusLevel(points: number): StatusLevel {
  let current = statusLevels[0];
  for (const level of statusLevels) {
    if (points >= level.minPoints) {
      current = level;
    } else {
      break;
    }
  }
  return current;
}

/**
 * Retorna o próximo nível (ou null se já é o máximo)
 */
export function getNextLevel(points: number): StatusLevel | null {
  for (const level of statusLevels) {
    if (points < level.minPoints) {
      return level;
    }
  }
  return null;
}

/**
 * Retorna o progresso percentual para o próximo nível (0-100)
 */
export function getLevelProgress(points: number): number {
  const current = getStatusLevel(points);
  const next = getNextLevel(points);
  if (!next) return 100; // Nível máximo
  const range = next.minPoints - current.minPoints;
  const progress = points - current.minPoints;
  return Math.min(100, Math.round((progress / range) * 100));
}
