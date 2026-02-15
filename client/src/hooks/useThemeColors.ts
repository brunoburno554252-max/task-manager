import { useMemo } from "react";
import { useTheme } from "@/contexts/ThemeContext";

/**
 * Returns dynamic color values that adapt to the current theme.
 * Use this for inline styles in charts, tooltips, and other components
 * that need theme-aware colors outside of Tailwind classes.
 */
export function useThemeColors() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return useMemo(
    () => ({
      // Chart tooltip
      tooltip: {
        background: isDark ? "oklch(0.19 0.02 270)" : "oklch(0.99 0.002 270)",
        border: isDark ? "oklch(0.28 0.02 270)" : "oklch(0.88 0.01 270)",
        color: isDark ? "oklch(0.93 0.005 270)" : "oklch(0.2 0.02 270)",
      },
      // Chart grid/axis
      chart: {
        gridStroke: isDark
          ? "oklch(0.26 0.018 270 / 0.5)"
          : "oklch(0.88 0.01 270 / 0.6)",
        tickFill: isDark
          ? "oklch(0.6 0.015 270)"
          : "oklch(0.45 0.02 270)",
        areaGradientStart: isDark
          ? "oklch(0.72 0.19 280)"
          : "oklch(0.55 0.2 340)",
      },
      // Primary accent per theme
      primary: isDark ? "oklch(0.72 0.19 280)" : "oklch(0.55 0.2 340)",
      isDark,
    }),
    [isDark],
  );
}
