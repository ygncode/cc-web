import { useState, useCallback, useMemo } from "react";
import { useCommandStore } from "../stores/commandStore";
import { detectPartialCommand } from "../lib/commandParser";
import type { Command, CommandMatch } from "../types/commands";

interface UseCommandAutocompleteResult {
  // State
  isOpen: boolean;
  query: string;
  matches: CommandMatch[];
  selectedIndex: number;

  // Actions
  handleInputChange: (value: string, cursorPosition: number) => void;
  handleKeyDown: (e: React.KeyboardEvent) => boolean;
  selectCommand: (command: Command) => string;
  close: () => void;
  reset: () => void;
}

export function useCommandAutocomplete(): UseCommandAutocompleteResult {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const searchCommands = useCommandStore((state) => state.searchCommands);

  // Get filtered matches based on query
  const matches = useMemo(() => {
    if (!isOpen) return [];
    return searchCommands(query);
  }, [isOpen, query, searchCommands]);

  // Handle input changes - detect when to show autocomplete
  const handleInputChange = useCallback((value: string, cursorPosition: number) => {
    const partial = detectPartialCommand(value, cursorPosition);

    if (partial) {
      setQuery(partial.query);
      setIsOpen(true);
      setSelectedIndex(0);
    } else {
      setIsOpen(false);
      setQuery("");
    }
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent): boolean => {
      if (!isOpen || matches.length === 0) {
        return false;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % matches.length);
          return true;

        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + matches.length) % matches.length);
          return true;

        case "Tab":
        case "Enter":
          if (matches[selectedIndex]) {
            e.preventDefault();
            // Return the command - caller should handle insertion
            return true;
          }
          return false;

        case "Escape":
          e.preventDefault();
          setIsOpen(false);
          return true;

        default:
          return false;
      }
    },
    [isOpen, matches, selectedIndex]
  );

  // Select a command and return the text to insert
  const selectCommand = useCallback((command: Command): string => {
    setIsOpen(false);
    setQuery("");
    setSelectedIndex(0);
    return `/${command.name} `;
  }, []);

  // Close autocomplete
  const close = useCallback(() => {
    setIsOpen(false);
    setQuery("");
    setSelectedIndex(0);
  }, []);

  // Reset state
  const reset = useCallback(() => {
    setIsOpen(false);
    setQuery("");
    setSelectedIndex(0);
  }, []);

  return {
    isOpen,
    query,
    matches,
    selectedIndex,
    handleInputChange,
    handleKeyDown,
    selectCommand,
    close,
    reset,
  };
}
