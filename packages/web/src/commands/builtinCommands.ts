import type { Command, CommandContext } from "../types/commands";

export const builtinCommands: Command[] = [
  // Client-side commands
  {
    name: "clear",
    type: "client",
    description: "Clear chat history for current session",
    aliases: ["cls"],
    execute: (_args: string, context: CommandContext) => {
      if (context.sessionId) {
        context.clearMessages(context.sessionId);
      }
    },
  },
  {
    name: "new",
    type: "client",
    description: "Create a new chat session",
    aliases: ["n"],
    execute: async (args: string, context: CommandContext) => {
      await context.createSession(args || undefined);
    },
  },
  {
    name: "theme",
    type: "client",
    description: "Toggle or set theme (dark/light)",
    aliases: ["dark", "light"],
    execute: (args: string, context: CommandContext) => {
      const arg = args.toLowerCase().trim();
      if (arg === "dark") {
        context.setTheme("dark");
      } else if (arg === "light") {
        context.setTheme("light");
      } else {
        context.toggleTheme();
      }
    },
  },
  {
    name: "reload",
    type: "client",
    description: "Reload custom commands from filesystem",
    aliases: ["refresh"],
    execute: async (_args: string, context: CommandContext) => {
      await context.reloadCommands();
      if (context.sessionId) {
        context.addSystemMessage(context.sessionId, "Commands reloaded successfully.");
      }
    },
  },
];
