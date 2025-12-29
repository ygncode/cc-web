// Command execution context - passed to client commands
export interface CommandContext {
  sessionId: string | null;
  clearMessages: (sessionId: string) => void;
  createSession: (name?: string) => Promise<void>;
  setTheme: (theme: "light" | "dark") => void;
  toggleTheme: () => void;
  addSystemMessage: (sessionId: string, content: string) => void;
  sendPrompt: (prompt: string) => void;
  reloadCommands: () => Promise<void>;
}

// Base command interface
export interface BaseCommand {
  name: string;
  description: string;
  aliases?: string[];
}

// Client-side command (executes immediately in browser)
export interface ClientCommand extends BaseCommand {
  type: "client";
  execute: (args: string, context: CommandContext) => void | Promise<void>;
}

// Server-side skill (expands to prompt and sends to agent)
export interface SkillCommand extends BaseCommand {
  type: "skill";
  prompt: string;
  source?: "global" | "project";  // For custom commands loaded from filesystem
  namespace?: string;              // Subdirectory namespace (e.g., "frontend")
}

export type Command = ClientCommand | SkillCommand;

// For autocomplete filtering
export interface CommandMatch {
  command: Command;
  matchType: "exact" | "prefix" | "alias";
  score: number;
}

// Parsed command from user input
export interface ParsedCommand {
  command: string;
  args: string;
  fullMatch: string;
}
