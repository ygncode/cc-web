import { nanoid } from "nanoid";

export interface Attachment {
  id: string;
  originalName: string;
  storedPath: string;
  mimeType: string;
  size: number;
}

export interface Message {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: unknown;
  timestamp: Date;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolResult?: unknown;
  attachments?: Attachment[];
}

export interface Session {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  messages: Message[];
  agentSessionId?: string;
}

// In-memory session storage (can be replaced with file-based or DB later)
const sessions = new Map<string, Session>();

export function createSession(name?: string): Session {
  const id = nanoid(10);
  const session: Session = {
    id,
    name: name || "Untitled",
    createdAt: new Date(),
    updatedAt: new Date(),
    messages: [],
  };
  sessions.set(id, session);
  return session;
}

export function getSession(id: string): Session | undefined {
  return sessions.get(id);
}

export function getAllSessions(): Session[] {
  return Array.from(sessions.values()).sort(
    (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
  );
}

export function updateSession(
  id: string,
  updates: Partial<Pick<Session, "name" | "agentSessionId">>
): Session | undefined {
  const session = sessions.get(id);
  if (!session) return undefined;

  if (updates.name !== undefined) {
    session.name = updates.name;
  }
  if (updates.agentSessionId !== undefined) {
    session.agentSessionId = updates.agentSessionId;
  }
  session.updatedAt = new Date();
  return session;
}

export function deleteSession(id: string): boolean {
  return sessions.delete(id);
}

export function addMessage(sessionId: string, message: Omit<Message, "id" | "timestamp">): Message | undefined {
  const session = sessions.get(sessionId);
  if (!session) return undefined;

  const newMessage: Message = {
    ...message,
    id: nanoid(8),
    timestamp: new Date(),
  };
  session.messages.push(newMessage);
  session.updatedAt = new Date();
  return newMessage;
}

export function getMessages(sessionId: string): Message[] {
  const session = sessions.get(sessionId);
  return session?.messages || [];
}
