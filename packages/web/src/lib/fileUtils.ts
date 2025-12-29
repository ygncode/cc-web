/**
 * Shared file utilities.
 */

export interface FileIconInfo {
  icon: string;
  color: string;
}

/**
 * Get file icon and color based on filename/extension.
 */
export function getFileIcon(name: string): FileIconInfo {
  const ext = name.split(".").pop()?.toLowerCase() || "";

  const icons: Record<string, FileIconInfo> = {
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

    // Other
    env: { icon: "E", color: "#ecd53f" },
    example: { icon: "E", color: "#888" },
    lock: { icon: "L", color: "#888" },

    // Images
    png: { icon: "IMG", color: "#a855f7" },
    jpg: { icon: "IMG", color: "#a855f7" },
    jpeg: { icon: "IMG", color: "#a855f7" },
    gif: { icon: "IMG", color: "#a855f7" },
    svg: { icon: "SVG", color: "#ffb13b" },
    webp: { icon: "IMG", color: "#a855f7" },

    // HTML
    html: { icon: "H", color: "#e34c26" },
    htm: { icon: "H", color: "#e34c26" },

    // Python
    py: { icon: "PY", color: "#3776ab" },

    // Go
    go: { icon: "GO", color: "#00add8" },

    // Rust
    rs: { icon: "RS", color: "#dea584" },

    // Shell
    sh: { icon: "$", color: "#4eaa25" },
    bash: { icon: "$", color: "#4eaa25" },
    zsh: { icon: "$", color: "#4eaa25" },
  };

  // Special filenames
  if (name === "package.json") return { icon: "{}", color: "#e8274b" };
  if (name === "tsconfig.json") return { icon: "{}", color: "#3178c6" };
  if (name === "Dockerfile") return { icon: "D", color: "#2496ed" };
  if (name === "Makefile") return { icon: "M", color: "#427819" };
  if (name.startsWith(".")) return { icon: "·", color: "#888" };

  return icons[ext] || { icon: "F", color: "#888" };
}

/**
 * Get the file extension from a path or filename.
 */
export function getFileExtension(path: string): string {
  const name = path.split("/").pop() || path;
  const ext = name.split(".").pop()?.toLowerCase() || "";
  return ext;
}

/**
 * Get the filename from a path.
 */
export function getFileName(path: string): string {
  return path.split("/").pop() || path;
}
