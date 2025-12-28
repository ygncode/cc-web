import { query, type SDKMessage } from "@anthropic-ai/claude-agent-sdk";

// Map UI model IDs to full SDK model IDs
const MODEL_ID_MAP: Record<string, string> = {
  "opus-4.5": "claude-opus-4-5-20251101",
  "sonnet-4.5": "claude-sonnet-4-5-20250929",
  "haiku-4.5": "claude-haiku-4-5-20241022",
};

export interface AgentMessage {
  type: string;
  subtype?: string;
  message?: {
    role: string;
    content: unknown;
  };
  result?: string;
  sessionId?: string;
  error?: string;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolResult?: string;
}

export interface QueryOptions {
  prompt: string;
  cwd: string;
  sessionId?: string;
  model?: string;
  abortSignal?: AbortSignal;
}

/**
 * Execute an agent query with streaming responses using Claude Agent SDK
 */
export async function* executeQuery(
  options: QueryOptions
): AsyncGenerator<AgentMessage> {
  const { prompt, cwd, model, abortSignal } = options;

  // Resolve model ID to full SDK model name
  const resolvedModel = model ? MODEL_ID_MAP[model] || model : undefined;

  // Generate a session ID
  const sessionId = crypto.randomUUID();

  yield {
    type: "system",
    subtype: "init",
    sessionId,
  };

  try {
    const sdkOptions = {
      allowedTools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "Task", "TodoWrite"],
      permissionMode: "bypassPermissions" as const,
      cwd,
      ...(resolvedModel && { model: resolvedModel }),
    };

    console.log("[agent] Starting SDK query with options:", sdkOptions);

    for await (const message of query({ prompt, options: sdkOptions })) {
      console.log("[agent] Received SDK message:", JSON.stringify(message, null, 2));

      // Check for abort
      if (abortSignal?.aborted) {
        yield { type: "aborted" };
        break;
      }

      // Map SDK messages to our AgentMessage format
      const sdkMsg = message as SDKMessage;

      if (sdkMsg.type === "assistant") {
        // Extract text content from assistant message
        const content = sdkMsg.message?.content;
        let textContent = "";

        if (Array.isArray(content)) {
          for (const block of content) {
            if (block.type === "text") {
              textContent += block.text;
            } else if (block.type === "tool_use") {
              // Emit tool call message
              yield {
                type: "tool_call",
                toolName: block.name,
                toolInput: block.input as Record<string, unknown>,
              };
            }
          }
        }

        if (textContent) {
          yield {
            type: "assistant",
            message: {
              role: "assistant",
              content: textContent,
            },
          };
        }
      } else if (sdkMsg.type === "user") {
        // Tool results come as user messages
        const content = sdkMsg.message?.content;
        if (Array.isArray(content)) {
          for (const block of content) {
            if (block.type === "tool_result") {
              yield {
                type: "tool_result",
                toolResult:
                  typeof block.content === "string"
                    ? block.content
                    : JSON.stringify(block.content),
              };
            }
          }
        }
      } else if (sdkMsg.type === "result") {
        yield {
          type: "result",
          result: (sdkMsg as { result?: string }).result || "Query completed",
          sessionId,
        };
      } else if (sdkMsg.type === "system") {
        // SDK system messages (session info, etc.)
        console.log("[agent] SDK system message:", sdkMsg);
      } else {
        // Log unknown message types for debugging
        console.log("[agent] Unknown message type:", sdkMsg.type, sdkMsg);
      }
    }

    // Ensure we always emit a result message at the end
    yield {
      type: "result",
      result: "Query completed",
      sessionId,
    };
  } catch (error) {
    console.error("[agent] Error in executeQuery:", error);
    yield {
      type: "error",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Simple one-shot query that returns all messages
 */
export async function queryAgent(
  options: QueryOptions
): Promise<AgentMessage[]> {
  const messages: AgentMessage[] = [];

  for await (const message of executeQuery(options)) {
    messages.push(message);
  }

  return messages;
}
