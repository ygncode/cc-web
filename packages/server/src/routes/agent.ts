import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { executeQuery } from "../services/agent.js";
import { addMessage, updateSession, type Attachment } from "../services/session.js";
import type { AppContext } from "../index.js";

export const agentRoutes = new Hono<{ Variables: AppContext }>();

// Active abort controllers for cancellation
const activeQueries = new Map<string, AbortController>();

/**
 * Execute agent query with SSE streaming
 */
agentRoutes.post("/query", async (c) => {
  const cwd = c.get("cwd");
  const body = await c.req.json<{
    prompt: string;
    sessionId?: string;
    agentSessionId?: string;
    model?: string;
    attachments?: Attachment[];
    budgetTokens?: number;
    planMode?: boolean;
  }>();

  const { prompt, sessionId, agentSessionId, model, attachments, budgetTokens, planMode } = body;

  if (!prompt) {
    return c.json({ error: "Prompt is required" }, 400);
  }

  // Create abort controller for this query
  const queryId = crypto.randomUUID();
  const abortController = new AbortController();
  activeQueries.set(queryId, abortController);

  // Build enhanced prompt with attachment context
  let enhancedPrompt = prompt;
  if (attachments && attachments.length > 0) {
    const attachmentInfo = attachments
      .map((a) => `- ${a.originalName} (${a.mimeType}): ${a.storedPath}`)
      .join("\n");

    enhancedPrompt = `${prompt}\n\n[User has attached the following files. You can read them using the Read tool with their stored paths:]\n${attachmentInfo}`;
  }

  // Add user message to session if provided
  if (sessionId) {
    addMessage(sessionId, {
      role: "user",
      content: prompt,
      attachments,
    });
  }

  return streamSSE(c, async (stream) => {
    try {
      // Send query ID for abort capability
      await stream.writeSSE({
        data: JSON.stringify({ type: "queryId", queryId }),
        event: "meta",
      });

      let capturedAgentSessionId = agentSessionId;

      for await (const message of executeQuery({
        prompt: enhancedPrompt,
        cwd,
        sessionId: agentSessionId,
        model,
        budgetTokens,
        planMode,
        abortSignal: abortController.signal,
      })) {
        // Capture agent session ID for resume capability
        if (message.type === "system" && message.subtype === "init" && message.sessionId) {
          capturedAgentSessionId = message.sessionId;

          // Update session with agent session ID
          if (sessionId) {
            updateSession(sessionId, { agentSessionId: capturedAgentSessionId });
          }
        }

        // Add assistant message to session
        if (sessionId && message.type === "assistant" && message.message) {
          addMessage(sessionId, {
            role: "assistant",
            content: message.message.content,
          });
        }

        await stream.writeSSE({
          data: JSON.stringify({
            ...message,
            agentSessionId: capturedAgentSessionId,
          }),
          event: "message",
        });

        if (message.type === "result" || message.type === "error") {
          break;
        }
      }

      await stream.writeSSE({
        data: "[DONE]",
        event: "done",
      });
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        await stream.writeSSE({
          data: JSON.stringify({ type: "aborted" }),
          event: "message",
        });
      } else {
        await stream.writeSSE({
          data: JSON.stringify({
            type: "error",
            error: error instanceof Error ? error.message : String(error),
          }),
          event: "message",
        });
      }
    } finally {
      activeQueries.delete(queryId);
    }
  });
});

/**
 * Abort an active query
 */
agentRoutes.post("/abort", async (c) => {
  const { queryId } = await c.req.json<{ queryId: string }>();

  const controller = activeQueries.get(queryId);
  if (controller) {
    controller.abort();
    activeQueries.delete(queryId);
    return c.json({ success: true });
  }

  return c.json({ error: "Query not found" }, 404);
});
