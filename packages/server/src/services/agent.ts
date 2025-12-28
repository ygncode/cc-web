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
  budgetTokens?: number;
  planMode?: boolean;
  abortSignal?: AbortSignal;
}

/**
 * Execute an agent query with streaming responses using Claude Agent SDK
 */
export async function* executeQuery(
  options: QueryOptions
): AsyncGenerator<AgentMessage> {
  const { prompt, cwd, sessionId: existingSessionId, model, budgetTokens, planMode, abortSignal } = options;

  // Resolve model ID to full SDK model name
  const resolvedModel = model ? MODEL_ID_MAP[model] || model : undefined;

  // Track the SDK's session ID (will be set from SDK system init message)
  let sdkSessionId: string | undefined = existingSessionId;

  try {
    const sdkOptions = {
      allowedTools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "Task", "TodoWrite"],
      permissionMode: "bypassPermissions" as const,
      cwd,
      ...(resolvedModel && { model: resolvedModel }),
      // Resume from existing session if we have one
      ...(existingSessionId && { resume: existingSessionId }),
      // Extended thinking budget tokens (enables thinking when set)
      ...(budgetTokens && { thinkingBudgetTokens: budgetTokens }),
      // Plan mode - tells the agent to plan before executing
      ...(planMode && { planMode: true }),
    };

    console.log("[agent] Starting SDK query with options:", sdkOptions);
    console.log("[agent] Resuming session:", existingSessionId || "none (new session)");

    for await (const message of query({ prompt, options: sdkOptions })) {
      console.log("[agent] Received SDK message:", JSON.stringify(message, null, 2));

      // Check for abort
      if (abortSignal?.aborted) {
        yield { type: "aborted" };
        break;
      }

      // Map SDK messages to our AgentMessage format
      const sdkMsg = message as SDKMessage;

      if (sdkMsg.type === "system" && (sdkMsg as { subtype?: string }).subtype === "init") {
        // Capture the SDK's session ID from its init message
        sdkSessionId = (sdkMsg as { session_id: string }).session_id;
        console.log("[agent] SDK session ID:", sdkSessionId);

        // Yield our init message with the SDK's session ID
        yield {
          type: "system",
          subtype: "init",
          sessionId: sdkSessionId,
        };
      } else if (sdkMsg.type === "assistant") {
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
                toolId: block.id,
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
                toolId: block.tool_use_id,
              };
            }
          }
        }
      } else if (sdkMsg.type === "result") {
        yield {
          type: "result",
          result: (sdkMsg as { result?: string }).result || "Query completed",
          sessionId: sdkSessionId,
        };
      } else if (sdkMsg.type === "system") {
        // Other SDK system messages (status, etc.)
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
      sessionId: sdkSessionId,
    };
  } catch (error) {
    console.error("[agent] Error in executeQuery:", error);
    yield {
      type: "error",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

