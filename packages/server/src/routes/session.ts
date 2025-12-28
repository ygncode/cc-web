import { Hono } from "hono";
import {
  createSession,
  getSession,
  getAllSessions,
  updateSession,
  deleteSession,
  getMessages,
} from "../services/session.js";
import type { AppContext } from "../index.js";

export const sessionRoutes = new Hono<{ Variables: AppContext }>();

/**
 * List all sessions
 */
sessionRoutes.get("/", (c) => {
  const sessions = getAllSessions();
  return c.json({
    sessions: sessions.map((s) => ({
      id: s.id,
      name: s.name,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      messageCount: s.messages.length,
    })),
  });
});

/**
 * Create a new session
 */
sessionRoutes.post("/", async (c) => {
  const body = await c.req.json<{ name?: string }>().catch(() => ({}));
  const session = createSession(body.name);
  return c.json({ session }, 201);
});

/**
 * Get a session by ID
 */
sessionRoutes.get("/:id", (c) => {
  const id = c.req.param("id");
  const session = getSession(id);

  if (!session) {
    return c.json({ error: "Session not found" }, 404);
  }

  return c.json({ session });
});

/**
 * Get messages for a session
 */
sessionRoutes.get("/:id/messages", (c) => {
  const id = c.req.param("id");
  const session = getSession(id);

  if (!session) {
    return c.json({ error: "Session not found" }, 404);
  }

  return c.json({ messages: getMessages(id) });
});

/**
 * Update a session (rename, etc.)
 */
sessionRoutes.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<{ name?: string }>();

  const session = updateSession(id, body);
  if (!session) {
    return c.json({ error: "Session not found" }, 404);
  }

  return c.json({ session });
});

/**
 * Delete a session
 */
sessionRoutes.delete("/:id", (c) => {
  const id = c.req.param("id");
  const deleted = deleteSession(id);

  if (!deleted) {
    return c.json({ error: "Session not found" }, 404);
  }

  return c.json({ success: true });
});
