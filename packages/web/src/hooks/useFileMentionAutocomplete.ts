import { useState, useCallback, useMemo } from "react";
import { useFileStore, type FileItem } from "../stores/fileStore";
import { detectFileMention } from "../lib/fileMentionParser";

interface UseFileMentionAutocompleteResult {
  // State
  isOpen: boolean;
  query: string;
  matches: FileItem[];
  selectedIndex: number;
  mentionStart: number;
  mentionEnd: number;

  // Actions
  handleInputChange: (value: string, cursorPosition: number) => void;
  handleKeyDown: (e: React.KeyboardEvent) => boolean;
  selectFile: (
    file: FileItem,
    currentValue: string,
    cursorPosition: number
  ) => { newValue: string; newCursorPos: number };
  close: () => void;
  reset: () => void;
}

export function useFileMentionAutocomplete(): UseFileMentionAutocompleteResult {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionStart, setMentionStart] = useState(0);
  const [mentionEnd, setMentionEnd] = useState(0);

  const searchFiles = useFileStore((state) => state.searchFiles);
  const addRecentFile = useFileStore((state) => state.addRecentFile);

  // Get filtered matches based on query
  const matches = useMemo(() => {
    if (!isOpen) return [];
    return searchFiles(query);
  }, [isOpen, query, searchFiles]);

  // Handle input changes - detect when to show autocomplete
  const handleInputChange = useCallback(
    (value: string, cursorPosition: number) => {
      const mention = detectFileMention(value, cursorPosition);

      if (mention) {
        setQuery(mention.query);
        setMentionStart(mention.startIndex);
        setMentionEnd(mention.endIndex);
        setIsOpen(true);
        setSelectedIndex(0);
      } else {
        setIsOpen(false);
        setQuery("");
      }
    },
    []
  );

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
            // Return true to indicate we handled the key
            // Caller should call selectFile() to get the new value
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

  // Select a file and return the updated text with cursor position
  const selectFile = useCallback(
    (
      file: FileItem,
      currentValue: string,
      _cursorPosition: number
    ): { newValue: string; newCursorPos: number } => {
      // Add to recent files
      addRecentFile(file.path);

      // Replace from @ to current cursor with the file path
      const beforeMention = currentValue.slice(0, mentionStart);
      const afterMention = currentValue.slice(mentionEnd);
      const insertText = `@${file.path} `;

      const newValue = beforeMention + insertText + afterMention;
      const newCursorPos = mentionStart + insertText.length;

      // Reset state
      setIsOpen(false);
      setQuery("");
      setSelectedIndex(0);

      return { newValue, newCursorPos };
    },
    [mentionStart, mentionEnd, addRecentFile]
  );

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
    setMentionStart(0);
    setMentionEnd(0);
  }, []);

  return {
    isOpen,
    query,
    matches,
    selectedIndex,
    mentionStart,
    mentionEnd,
    handleInputChange,
    handleKeyDown,
    selectFile,
    close,
    reset,
  };
}
