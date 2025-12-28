import { create } from "zustand";

export interface TerminalSession {
  id: string;
  name: string;
  createdAt: Date;
}

interface TerminalState {
  terminals: TerminalSession[];
  activeTerminalId: string | null;

  addTerminal: () => Promise<TerminalSession | null>;
  removeTerminal: (id: string) => void;
  setActiveTerminal: (id: string) => void;
}

export const useTerminalStore = create<TerminalState>((set, get) => ({
  terminals: [],
  activeTerminalId: null,

  addTerminal: async () => {
    try {
      const response = await fetch("/api/terminal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      const terminal: TerminalSession = {
        id: data.terminal.id,
        name: `Terminal ${get().terminals.length + 1}`,
        createdAt: new Date(data.terminal.createdAt),
      };

      set((state) => ({
        terminals: [...state.terminals, terminal],
        activeTerminalId: terminal.id,
      }));

      return terminal;
    } catch (error) {
      console.error("Failed to create terminal:", error);
      return null;
    }
  },

  removeTerminal: (id: string) => {
    fetch(`/api/terminal/${id}`, { method: "DELETE" }).catch(console.error);

    const state = get();
    const newTerminals = state.terminals.filter((t) => t.id !== id);
    let newActiveId = state.activeTerminalId;

    if (state.activeTerminalId === id) {
      newActiveId = newTerminals.length > 0 ? newTerminals[0].id : null;
    }

    set({
      terminals: newTerminals,
      activeTerminalId: newActiveId,
    });

    // Auto-create a new terminal if all terminals are closed
    if (newTerminals.length === 0) {
      get().addTerminal();
    }
  },

  setActiveTerminal: (id: string) => {
    set({ activeTerminalId: id });
  },
}));
