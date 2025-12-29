import { useEffect, useRef } from "react";
import type { FileItem } from "../../stores/fileStore";
import { getFileIcon } from "../../lib/fileUtils";

interface FileMentionAutocompleteProps {
  matches: FileItem[];
  selectedIndex: number;
  recentFiles: string[];
  onSelect: (file: FileItem) => void;
  onClose: () => void;
}

export function FileMentionAutocomplete({
  matches,
  selectedIndex,
  recentFiles,
  onSelect,
  onClose,
}: FileMentionAutocompleteProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedRef.current) {
      selectedRef.current.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  if (matches.length === 0) {
    return (
      <div
        ref={containerRef}
        className="absolute bottom-full left-0 mb-2 w-full max-w-md bg-background rounded-lg shadow-lg border border-border-light overflow-hidden z-50"
      >
        <div className="px-3 py-2 text-[11px] font-medium text-text-secondary uppercase tracking-wide border-b border-border-light">
          Files
        </div>
        <div className="px-3 py-4 text-[13px] text-text-muted text-center">
          No files found
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="absolute bottom-full left-0 mb-2 w-full max-w-md bg-background rounded-lg shadow-lg border border-border-light overflow-hidden z-50"
    >
      <div className="px-3 py-2 text-[11px] font-medium text-text-secondary uppercase tracking-wide border-b border-border-light">
        Files
      </div>
      <div className="max-h-[240px] overflow-y-auto">
        {matches.map((file, index) => {
          const isSelected = index === selectedIndex;
          const isRecent = recentFiles.includes(file.path);
          const fileIcon = getFileIcon(file.name);

          return (
            <button
              key={file.path}
              ref={isSelected ? selectedRef : undefined}
              onClick={() => onSelect(file)}
              className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors ${
                isSelected ? "bg-surface-hover" : "hover:bg-surface-hover"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {/* File Icon */}
                <span
                  className="w-5 h-5 flex items-center justify-center text-[10px] font-bold flex-shrink-0 rounded-sm"
                  style={{ color: fileIcon.color }}
                >
                  {fileIcon.icon}
                </span>

                {/* File Path */}
                <div className="min-w-0 flex-1">
                  <span className="text-[13px] text-text truncate block">
                    {file.path}
                  </span>
                </div>
              </div>

              {/* Recent Badge */}
              {isRecent && (
                <span className="ml-2 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 flex-shrink-0">
                  Recent
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="px-3 py-1.5 text-[11px] text-text-secondary border-t border-border-light bg-surface">
        <span className="mr-3">↑↓ navigate</span>
        <span className="mr-3">↵ select</span>
        <span>esc close</span>
      </div>
    </div>
  );
}
