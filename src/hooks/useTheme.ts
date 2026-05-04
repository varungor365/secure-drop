import { useTheme as useNextTheme } from "next-themes";

export type Theme = "dark" | "light" | "system";

export function useTheme() {
  const { theme, setTheme, resolvedTheme } = useNextTheme();

  const toggle = () => setTheme(resolvedTheme === "dark" ? "light" : "dark");

  return {
    theme: theme as Theme,
    resolvedTheme: resolvedTheme as "dark" | "light",
    setTheme,
    toggle,
    isDark: resolvedTheme === "dark",
  };
}
