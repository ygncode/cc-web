import { create } from "zustand";
import type { Command, CommandMatch, SkillCommand } from "../types/commands";
import { builtinCommands } from "../commands/builtinCommands";
import { api } from "../lib/api";

interface CustomCommandData {
  name: string;
  description: string;
  prompt: string;
  source: "global" | "project";
  namespace?: string;
}

interface CommandState {
  // Custom commands fetched from API
  customCommands: SkillCommand[];
  isLoading: boolean;
  hasFetched: boolean;

  // Fetch custom commands from backend
  fetchCustomCommands: () => Promise<void>;

  // Get all commands (builtin + custom)
  getAllCommands: () => Command[];

  // Find command by name or alias
  findCommand: (name: string) => Command | undefined;

  // Search commands for autocomplete
  searchCommands: (query: string) => CommandMatch[];
}

// Convert API response to SkillCommand
function toSkillCommand(cmd: CustomCommandData): SkillCommand {
  return {
    name: cmd.name,
    type: "skill",
    description: cmd.description,
    prompt: cmd.prompt,
    source: cmd.source,
    namespace: cmd.namespace,
  };
}

export const useCommandStore = create<CommandState>()((set, get) => ({
  customCommands: [],
  isLoading: false,
  hasFetched: false,

  fetchCustomCommands: async () => {
    set({ isLoading: true });
    try {
      const response = await api.getCommands();
      const customCommands = response.commands.map(toSkillCommand);
      set({ customCommands, hasFetched: true });
    } catch (error) {
      console.error("Failed to fetch custom commands:", error);
      set({ hasFetched: true });
    } finally {
      set({ isLoading: false });
    }
  },

  getAllCommands: () => {
    const { customCommands } = get();
    // Builtin commands first, then custom commands
    // Custom commands with same name as builtin will appear after (builtin takes precedence)
    return [...builtinCommands, ...customCommands];
  },

  findCommand: (name: string) => {
    const allCommands = get().getAllCommands();
    const lowerName = name.toLowerCase();

    // First try exact match (builtin commands checked first due to order)
    const exact = allCommands.find((c) => c.name.toLowerCase() === lowerName);
    if (exact) return exact;

    // Then try aliases
    return allCommands.find((c) => c.aliases?.some((a) => a.toLowerCase() === lowerName));
  },

  searchCommands: (query: string) => {
    const allCommands = get().getAllCommands();
    const lowerQuery = query.toLowerCase();
    const matches: CommandMatch[] = [];

    for (const command of allCommands) {
      // Exact match
      if (command.name.toLowerCase() === lowerQuery) {
        matches.push({ command, matchType: "exact", score: 100 });
        continue;
      }

      // Prefix match
      if (command.name.toLowerCase().startsWith(lowerQuery)) {
        matches.push({ command, matchType: "prefix", score: 80 });
        continue;
      }

      // Alias match
      if (command.aliases?.some((a) => a.toLowerCase().startsWith(lowerQuery))) {
        matches.push({ command, matchType: "alias", score: 60 });
        continue;
      }
    }

    // Sort by score (highest first)
    return matches.sort((a, b) => b.score - a.score);
  },
}));
