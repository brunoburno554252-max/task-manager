// Sistema de Status por Pontos - Níveis de Progressão
// Cada colaborador ganha um status baseado na quantidade total de pontos

export interface StatusLevel {
  name: string;
  minPoints: number;
  icon: string; // Lucide icon name
  color: string;
  bgColor: string;
  borderColor: string;
  gradientFrom: string;
  gradientTo: string;
  reward?: string;
}

export const statusLevels: StatusLevel[] = [
  {
    name: "Estagiário do CEO",
    minPoints: 0,
    icon: "ClipboardList",
    color: "text-slate-400",
    bgColor: "bg-slate-500/10",
    borderColor: "border-slate-500/20",
    gradientFrom: "from-slate-500",
    gradientTo: "to-slate-400",
  },
  {
    name: "Júnior",
    minPoints: 100,
    icon: "Sprout",
    color: "text-green-400",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/20",
    gradientFrom: "from-green-500",
    gradientTo: "to-emerald-400",
  },
  {
    name: "Master",
    minPoints: 300,
    icon: "Zap",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
    gradientFrom: "from-blue-500",
    gradientTo: "to-cyan-400",
  },
  {
    name: "Sênior",
    minPoints: 500,
    icon: "Flame",
    color: "text-orange-400",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/20",
    gradientFrom: "from-orange-500",
    gradientTo: "to-red-400",
  },
  {
    name: "Mestre LA",
    minPoints: 1000,
    icon: "Target",
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/20",
    gradientFrom: "from-purple-500",
    gradientTo: "to-violet-400",
  },
  {
    name: "Gênio LA",
    minPoints: 2000,
    icon: "Brain",
    color: "text-pink-400",
    bgColor: "bg-pink-500/10",
    borderColor: "border-pink-500/20",
    gradientFrom: "from-pink-500",
    gradientTo: "to-rose-400",
    reward: "Vale R$ 1.000,00",
  },
  {
    name: "Sábio LA",
    minPoints: 5000,
    icon: "BookOpen",
    color: "text-indigo-400",
    bgColor: "bg-indigo-500/10",
    borderColor: "border-indigo-500/20",
    gradientFrom: "from-indigo-500",
    gradientTo: "to-blue-400",
    reward: "Vale R$ 2.000,00",
  },
  {
    name: "Rei das Tarefas",
    minPoints: 10000,
    icon: "Crown",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
    gradientFrom: "from-amber-500",
    gradientTo: "to-yellow-400",
    reward: "Prêmio Surpresa",
  },
  {
    name: "LAzeiro",
    minPoints: 20000,
    icon: "Gem",
    color: "text-cyan-300",
    bgColor: "bg-cyan-500/10",
    borderColor: "border-cyan-500/20",
    gradientFrom: "from-cyan-400",
    gradientTo: "to-teal-300",
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
