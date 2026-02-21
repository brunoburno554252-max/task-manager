import {
  ClipboardList,
  Sprout,
  Zap,
  Flame,
  Target,
  Brain,
  BookOpen,
  Crown,
  Gem,
} from "lucide-react";
import type { StatusLevel } from "@/lib/statusLevels";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  ClipboardList,
  Sprout,
  Zap,
  Flame,
  Target,
  Brain,
  BookOpen,
  Crown,
  Gem,
};

interface LevelIconProps {
  level: StatusLevel;
  size?: "sm" | "md" | "lg" | "xl";
  showBg?: boolean;
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-7 w-7",
  xl: "h-10 w-10",
};

const bgSizeClasses = {
  sm: "h-7 w-7",
  md: "h-9 w-9",
  lg: "h-12 w-12",
  xl: "h-16 w-16",
};

export default function LevelIcon({ level, size = "md", showBg = true }: LevelIconProps) {
  const IconComponent = iconMap[level.icon];
  if (!IconComponent) return null;

  if (!showBg) {
    return <IconComponent className={`${sizeClasses[size]} ${level.color}`} />;
  }

  return (
    <div className={`${bgSizeClasses[size]} rounded-xl ${level.bgColor} border ${level.borderColor} flex items-center justify-center shrink-0`}>
      <IconComponent className={`${sizeClasses[size]} ${level.color}`} />
    </div>
  );
}
