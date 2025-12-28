import { Sun, Moon } from "lucide-react";
import { useLayoutStore } from "../../stores/layoutStore";

export function ThemeToggle() {
  const { theme, toggleTheme } = useLayoutStore();

  return (
    <button
      onClick={toggleTheme}
      className="p-1.5 hover:bg-surface-hover rounded transition-colors"
      title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
    >
      {theme === "light" ? (
        <Moon size={16} className="text-text-secondary" />
      ) : (
        <Sun size={16} className="text-text-secondary" />
      )}
    </button>
  );
}
