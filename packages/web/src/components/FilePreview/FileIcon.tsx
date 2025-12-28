interface FileIconProps {
  filename: string;
  size?: "sm" | "md";
}

// Get file icon based on extension
function getFileIcon(name: string): { icon: string; color: string } {
  const ext = name.split(".").pop()?.toLowerCase() || "";

  const icons: Record<string, { icon: string; color: string }> = {
    // TypeScript/JavaScript
    ts: { icon: "TS", color: "#3178c6" },
    tsx: { icon: "TSX", color: "#3178c6" },
    js: { icon: "JS", color: "#f7df1e" },
    jsx: { icon: "JSX", color: "#f7df1e" },

    // Config files
    json: { icon: "{}", color: "#cbcb41" },
    yaml: { icon: "Y", color: "#cb171e" },
    yml: { icon: "Y", color: "#cb171e" },
    toml: { icon: "T", color: "#9c4221" },

    // Markdown
    md: { icon: "M", color: "#519aba" },

    // Styles
    css: { icon: "#", color: "#563d7c" },
    scss: { icon: "#", color: "#c6538c" },

    // Data
    sql: { icon: "DB", color: "#e38c00" },

    // Git
    gitignore: { icon: "G", color: "#f05032" },

    // Go
    go: { icon: "Go", color: "#00add8" },

    // Python
    py: { icon: "Py", color: "#3776ab" },

    // Rust
    rs: { icon: "Rs", color: "#dea584" },

    // HTML
    html: { icon: "<>", color: "#e34c26" },
    htm: { icon: "<>", color: "#e34c26" },

    // Other
    env: { icon: "E", color: "#ecd53f" },
    example: { icon: "E", color: "#888" },
    lock: { icon: "L", color: "#888" },
    txt: { icon: "T", color: "#888" },
  };

  // Special filenames
  if (name === "package.json") return { icon: "{}", color: "#e8274b" };
  if (name === "tsconfig.json") return { icon: "{}", color: "#3178c6" };
  if (name === "Dockerfile") return { icon: "D", color: "#2496ed" };
  if (name === "Makefile") return { icon: "M", color: "#6d8086" };
  if (name.startsWith(".")) return { icon: "·", color: "#888" };

  return icons[ext] || { icon: "F", color: "#888" };
}

export function FileIcon({ filename, size = "sm" }: FileIconProps) {
  const { icon, color } = getFileIcon(filename);

  const sizeClasses = {
    sm: "w-4 h-4 text-[10px]",
    md: "w-5 h-5 text-[11px]",
  };

  return (
    <span
      className={`${sizeClasses[size]} flex items-center justify-center font-bold flex-shrink-0 rounded-sm`}
      style={{ color }}
    >
      {icon}
    </span>
  );
}
