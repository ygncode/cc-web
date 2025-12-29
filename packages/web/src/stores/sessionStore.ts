import { create } from "zustand";
import { api } from "../lib/api";

export interface Attachment {
  id: string;
  originalName: string;
  storedPath: string;
  mimeType: string;
  size: number;
}

export interface Message {
  id: string;
  role: "user" | "assistant" | "system" | "tool" | "task";
  content: unknown;
  timestamp: Date;
  endTime?: Date;  // When the message/response completed
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolResult?: unknown;
  isStreaming?: boolean;
  attachments?: Attachment[];
  // Task/Subagent fields
  taskType?: string;        // e.g., "Explore", "Plan"
  taskDescription?: string; // e.g., "Explore streaming implementation"
  taskPrompt?: string;      // Full prompt for expanded view
  taskStartTime?: number;   // Timestamp when task started
  taskEndTime?: number;     // Timestamp when task completed
  taskToolCount?: number;   // Count of tool calls in this task
  isTaskLoading?: boolean;  // Whether task is still running
  taskResult?: string;      // Final result from the task
  // Skill fields
  activeSkill?: string;     // Name of skill used for this message
}

export interface Session {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  agentSessionId?: string;
}

interface SessionState {
  sessions: Session[];
  activeSessionId: string | null;
  messages: Map<string, Message[]>;
  loadingSessionIds: Set<string>;  // Track which sessions are currently loading
  isLoading: boolean;
  hasFetched: boolean;

  // Actions
  fetchSessions: () => Promise<void>;
  createSession: (name?: string) => Promise<Session | null>;
  setActiveSession: (id: string) => void;
  deleteSession: (id: string) => Promise<void>;
  renameSession: (id: string, name: string) => Promise<void>;
  setAgentSessionId: (sessionId: string, agentSessionId: string) => void;
  getAgentSessionId: (sessionId: string) => string | undefined;
  setSessionLoading: (sessionId: string, loading: boolean) => void;
  isSessionLoading: (sessionId: string) => boolean;
  addMessage: (sessionId: string, message: Omit<Message, "id" | "timestamp">) => string;
  updateMessage: (sessionId: string, messageId: string, updates: Partial<Message>) => void;
  getMessages: (sessionId: string) => Message[];
  clearMessages: (sessionId: string) => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  messages: new Map(),
  loadingSessionIds: new Set(),
  isLoading: false,
  hasFetched: false,

  fetchSessions: async () => {
    set({ isLoading: true });
    try {
      const data = await api.getSessions();
      set({ sessions: data.sessions, hasFetched: true });

      // Set first session as active if none selected
      if (data.sessions.length > 0 && !get().activeSessionId) {
        set({ activeSessionId: data.sessions[0].id });
      }
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
      set({ hasFetched: true });
    } finally {
      set({ isLoading: false });
    }
  },

  createSession: async (name?: string) => {
    try {
      const data = await api.createSession(name);
      set((state) => ({
        sessions: [...state.sessions, data.session],
        activeSessionId: data.session.id,
      }));
      return data.session;
    } catch (error) {
      console.error("Failed to create session:", error);
      return null;
    }
  },

  setActiveSession: (id: string) => {
    set({ activeSessionId: id });
  },

  deleteSession: async (id: string) => {
    try {
      await api.deleteSession(id);
      set((state) => {
        const newSessions = state.sessions.filter((s) => s.id !== id);
        const newMessages = new Map(state.messages);
        newMessages.delete(id);

        let newActiveId = state.activeSessionId;
        if (state.activeSessionId === id) {
          newActiveId = newSessions.length > 0 ? newSessions[0].id : null;
        }

        return {
          sessions: newSessions,
          messages: newMessages,
          activeSessionId: newActiveId,
        };
      });
    } catch (error) {
      console.error("Failed to delete session:", error);
    }
  },

  renameSession: async (id: string, name: string) => {
    try {
      await api.updateSession(id, { name });
      set((state) => ({
        sessions: state.sessions.map((s) =>
          s.id === id ? { ...s, name } : s
        ),
      }));
    } catch (error) {
      console.error("Failed to rename session:", error);
    }
  },

  setAgentSessionId: (sessionId: string, agentSessionId: string) => {
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId ? { ...s, agentSessionId } : s
      ),
    }));
  },

  getAgentSessionId: (sessionId: string) => {
    return get().sessions.find((s) => s.id === sessionId)?.agentSessionId;
  },

  setSessionLoading: (sessionId: string, loading: boolean) => {
    set((state) => {
      const newLoadingIds = new Set(state.loadingSessionIds);
      if (loading) {
        newLoadingIds.add(sessionId);
      } else {
        newLoadingIds.delete(sessionId);
      }
      return { loadingSessionIds: newLoadingIds };
    });
  },

  isSessionLoading: (sessionId: string) => {
    return get().loadingSessionIds.has(sessionId);
  },

  addMessage: (sessionId: string, message: Omit<Message, "id" | "timestamp">) => {
    const messageId = crypto.randomUUID();
    set((state) => {
      const newMessages = new Map(state.messages);
      const sessionMessages = newMessages.get(sessionId) || [];
      newMessages.set(sessionId, [
        ...sessionMessages,
        {
          ...message,
          id: messageId,
          timestamp: new Date(),
        },
      ]);
      return { messages: newMessages };
    });
    return messageId;
  },

  updateMessage: (sessionId: string, messageId: string, updates: Partial<Message>) => {
    set((state) => {
      const newMessages = new Map(state.messages);
      const sessionMessages = [...(newMessages.get(sessionId) || [])];

      const index = sessionMessages.findIndex((m) => m.id === messageId);
      if (index !== -1) {
        sessionMessages[index] = {
          ...sessionMessages[index],
          ...updates,
        };
        newMessages.set(sessionId, sessionMessages);
      }

      return { messages: newMessages };
    });
  },

  getMessages: (sessionId: string) => {
    return get().messages.get(sessionId) || [];
  },

  clearMessages: (sessionId: string) => {
    set((state) => {
      const newMessages = new Map(state.messages);
      newMessages.set(sessionId, []);
      return { messages: newMessages };
    });
  },
}));
