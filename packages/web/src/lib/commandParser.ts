import type { ParsedCommand } from "../types/commands";

/**
 * Parse a command from user input.
 * Returns null if input is not a valid command.
 *
 * @example
 * parseCommand("/clear") → { command: "clear", args: "", fullMatch: "/clear" }
 * parseCommand("/new my session") → { command: "new", args: "my session", fullMatch: "/new my session" }
 * parseCommand("hello") → null
 */
export function parseCommand(input: string): ParsedCommand | null {
  const trimmed = input.trim();

  // Must start with /
  if (!trimmed.startsWith("/")) {
    return null;
  }

  // Match command name (alphanumeric, dash, underscore)
  const match = trimmed.match(/^\/([a-zA-Z0-9_-]+)(?:\s+(.*))?$/);

  if (!match) {
    return null;
  }

  return {
    command: match[1],
    args: match[2]?.trim() || "",
    fullMatch: trimmed,
  };
}

/**
 * Detect a partial command while user is typing (for autocomplete).
 * Returns the query (text after /) and its position.
 *
 * @example
 * detectPartialCommand("/cl", 3) → { query: "cl", startIndex: 0 }
 * detectPartialCommand("hello /the", 10) → null (not at start)
 * detectPartialCommand("/", 1) → { query: "", startIndex: 0 }
 */
export function detectPartialCommand(
  input: string,
  cursorPosition: number
): { query: string; startIndex: number } | null {
  // Only detect commands at the start of input
  if (!input.startsWith("/")) {
    return null;
  }

  // Get text from / to cursor
  const beforeCursor = input.slice(0, cursorPosition);

  // Check if we're still in the command name (no space yet)
  const match = beforeCursor.match(/^\/([a-zA-Z0-9_-]*)$/);

  if (!match) {
    return null;
  }

  return {
    query: match[1],
    startIndex: 0,
  };
}

/**
 * Expand a skill prompt template with arguments.
 *
 * @example
 * expandSkillPrompt("Review this: {{args}}", "my code") → "Review this: my code"
 */
export function expandSkillPrompt(template: string, args: string): string {
  return template.replace(/\{\{args\}\}/g, args).trim();
}
