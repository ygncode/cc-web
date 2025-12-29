import { useEffect, useRef } from "react";
import type { Command, CommandMatch } from "../../types/commands";

interface CommandAutocompleteProps {
  matches: CommandMatch[];
  selectedIndex: number;
  onSelect: (command: Command) => void;
  onClose: () => void;
}

export function CommandAutocomplete({
  matches,
  selectedIndex,
  onSelect,
  onClose,
}: CommandAutocompleteProps) {
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
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="absolute bottom-full left-0 mb-2 w-full max-w-md bg-background rounded-lg shadow-lg border border-border-light overflow-hidden z-50"
    >
      <div className="px-3 py-2 text-[11px] font-medium text-text-secondary uppercase tracking-wide border-b border-border-light">
        Commands
      </div>
      <div className="max-h-[240px] overflow-y-auto">
        {matches.map((match, index) => {
          const { command } = match;
          const isSelected = index === selectedIndex;
          const isSkill = command.type === "skill";

          // Determine label and style based on command type and source
          let label = "COMMAND";
          let badgeClass = "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";

          if (isSkill) {
            const source = command.source;
            if (source === "global") {
              label = "GLOBAL";
              badgeClass = "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300";
            } else if (source === "project") {
              label = "PROJECT";
              badgeClass = "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
            } else {
              label = "SKILL";
              badgeClass = "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
            }
          }

          return (
            <button
              key={command.name}
              ref={isSelected ? selectedRef : undefined}
              onClick={() => onSelect(command)}
              className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors ${
                isSelected ? "bg-surface-hover" : "hover:bg-surface-hover"
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-medium text-text">/{command.name}</span>
                  {command.aliases && command.aliases.length > 0 && (
                    <span className="text-[11px] text-text-secondary">
                      ({command.aliases.map((a) => `/${a}`).join(", ")})
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-text-muted truncate mt-0.5">
                  {command.description}
                </p>
              </div>
              <span
                className={`ml-3 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide rounded ${badgeClass}`}
              >
                {label}
              </span>
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
