import { useRef } from "react";
import { useSessionStore, type Attachment } from "../stores/sessionStore";
import { streamAgentQuery, api } from "../lib/api";

interface ActiveTask {
  messageId: string;
  toolCount: number;
  startTime: number;
  toolId?: string; // The tool_use_id of the Task tool call
}

// Think level type (0=off, 1=Think, 2=Megathink, 3=Ultrathink)
type ThinkLevel = 0 | 1 | 2 | 3;

// Map think levels to budget tokens
const THINK_LEVEL_BUDGET_TOKENS: Record<ThinkLevel, number | undefined> = {
  0: undefined,  // Off - no extended thinking
  1: 10000,      // Think - 10k tokens
  2: 50000,      // Megathink - 50k tokens
  3: 128000,     // Ultrathink - 128k tokens (max)
};

interface QueuedMessage {
  prompt: string;
  model?: string;
  files?: File[];
  thinkLevel?: ThinkLevel;
  planMode?: boolean;
}

// Per-session message queue (stored outside hook to persist across re-renders)
const messageQueues = new Map<string, QueuedMessage[]>();

export function useChatSession(sessionId: string | null) {
  const { addMessage, updateMessage, getMessages, setAgentSessionId, getAgentSessionId, setSessionLoading, isSessionLoading } = useSessionStore();
  const abortRef = useRef<{ abort: () => void } | null>(null);
  const activeTaskRef = useRef<ActiveTask | null>(null);

  const messages = sessionId ? getMessages(sessionId) : [];
  const agentSessionId = sessionId ? getAgentSessionId(sessionId) : undefined;
  const isLoading = sessionId ? isSessionLoading(sessionId) : false;

  // Process queued messages after current stream completes
  const processQueue = (targetSessionId: string) => {
    const queue = messageQueues.get(targetSessionId) || [];
    if (queue.length > 0 && !isSessionLoading(targetSessionId)) {
      const nextMessage = queue.shift();
      messageQueues.set(targetSessionId, queue);
      if (nextMessage) {
        // Use setTimeout to avoid calling handleSend directly in callback
        setTimeout(() => {
          handleSend(nextMessage.prompt, nextMessage.model, nextMessage.files, nextMessage.thinkLevel, nextMessage.planMode);
        }, 0);
      }
    }
  };

  const handleSend = async (prompt: string, model?: string, files?: File[], thinkLevel?: ThinkLevel, planMode?: boolean) => {
    if (!sessionId || !prompt.trim()) return;

    // If this session is currently loading, queue the message instead of dropping it
    if (isSessionLoading(sessionId)) {
      const queue = messageQueues.get(sessionId) || [];
      queue.push({ prompt, model, files, thinkLevel, planMode });
      messageQueues.set(sessionId, queue);
      return;
    }

    // Convert think level to budget tokens
    const budgetTokens = thinkLevel !== undefined ? THINK_LEVEL_BUDGET_TOKENS[thinkLevel] : undefined;

    setSessionLoading(sessionId, true);
    activeTaskRef.current = null;
    let uploadedAttachments: Attachment[] = [];

    // Upload files first if any
    if (files && files.length > 0) {
      try {
        const result = await api.uploadAttachments(files);
        uploadedAttachments = result.attachments;
      } catch (error) {
        console.error("Upload failed:", error);
        addMessage(sessionId, {
          role: "system",
          content: `File upload failed: ${(error as Error).message}`,
        });
        setSessionLoading(sessionId, false);
        processQueue(sessionId);
        return;
      }
    }

    // Add user message with attachments
    addMessage(sessionId, {
      role: "user",
      content: prompt,
      attachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
    });

    // Add placeholder for assistant response and track its ID
    const assistantMessageId = addMessage(sessionId, {
      role: "assistant",
      content: "",
      isStreaming: true,
    });

    let fullContent = "";

    const stream = streamAgentQuery(
      prompt,
      sessionId,
      agentSessionId,
      model,
      uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
      budgetTokens,
      planMode,
      (message) => {
        // Capture agent session ID and save to store (per-session)
        if (message.agentSessionId && !agentSessionId && sessionId) {
          setAgentSessionId(sessionId, message.agentSessionId);
        }

        // Handle Task tool calls - create a task message
        if (message.type === "tool_call" && message.toolName === "Task") {
          const input = message.toolInput || {};
          const taskType = (input.subagent_type as string) || "Task";
          const taskDescription = (input.description as string) || "Running task...";
          const taskPrompt = input.prompt as string;
          const toolId = message.toolId as string | undefined;

          // Complete any existing task
          if (activeTaskRef.current) {
            updateMessage(sessionId, activeTaskRef.current.messageId, {
              isTaskLoading: false,
              taskEndTime: Date.now(),
              taskToolCount: activeTaskRef.current.toolCount,
            });
          }

          // Create new task message
          const taskMessageId = addMessage(sessionId, {
            role: "task",
            content: "",
            taskType,
            taskDescription,
            taskPrompt,
            taskStartTime: Date.now(),
            isTaskLoading: true,
            taskToolCount: 0,
          });

          activeTaskRef.current = {
            messageId: taskMessageId,
            toolCount: 0,
            startTime: Date.now(),
            toolId,
          };
          return;
        }

        // Handle other tool calls - count them for active task or add as standalone
        if (message.type === "tool_call") {
          if (activeTaskRef.current) {
            // Tool call within a Task - count it
            activeTaskRef.current.toolCount++;
            updateMessage(sessionId, activeTaskRef.current.messageId, {
              taskToolCount: activeTaskRef.current.toolCount,
            });
          }

          // Add as a tool message (for both Task nested tools and standalone tools)
          addMessage(sessionId, {
            role: "tool",
            content: "",
            toolName: message.toolName,
            toolInput: message.toolInput,
          });
          return;
        }

        // Handle tool results
        if (message.type === "tool_result") {
          const toolId = message.toolId as string | undefined;

          // Helper function to extract text from tool result
          const extractTextFromResult = (result: unknown): string => {
            if (typeof result === "string") {
              // Try to parse as JSON in case it's a stringified array
              try {
                const parsed = JSON.parse(result);
                if (Array.isArray(parsed)) {
                  return parsed
                    .filter((item: any) => item.type === "text")
                    .map((item: any) => item.text)
                    .join("");
                }
                return result;
              } catch {
                return result;
              }
            }
            if (Array.isArray(result)) {
              return result
                .filter((item: any) => item.type === "text")
                .map((item: any) => item.text)
                .join("");
            }
            return String(result);
          };

          // Check if this is the result for the active Task tool
          if (activeTaskRef.current && toolId && activeTaskRef.current.toolId === toolId) {
            // This is the Task tool result - set it as taskResult
            updateMessage(sessionId, activeTaskRef.current.messageId, {
              isTaskLoading: false,
              taskEndTime: Date.now(),
              taskToolCount: activeTaskRef.current.toolCount,
              taskResult: extractTextFromResult(message.toolResult),
            });
            activeTaskRef.current = null;
            return;
          }

          // Update the last tool message with the result
          const currentMessages = getMessages(sessionId);
          const lastToolMessage = [...currentMessages].reverse().find((m) => m.role === "tool" && !m.toolResult);
          if (lastToolMessage) {
            updateMessage(sessionId, lastToolMessage.id, {
              toolResult: message.toolResult,
            });
          }
          return;
        }

        // Handle assistant messages
        if (message.type === "assistant" && message.message?.content) {
          // Complete any active task first (if it wasn't already completed by tool_result)
          if (activeTaskRef.current) {
            updateMessage(sessionId, activeTaskRef.current.messageId, {
              isTaskLoading: false,
              taskEndTime: Date.now(),
              taskToolCount: activeTaskRef.current.toolCount,
              // Don't set taskResult here - it should come from the tool_result
            });
            activeTaskRef.current = null;
          }

          const content = message.message.content;
          if (Array.isArray(content)) {
            const textContent = content
              .filter((c: any) => c.type === "text")
              .map((c: any) => c.text)
              .join("");
            fullContent += textContent;
          } else if (typeof content === "string") {
            fullContent += content;
          }
          // Update the assistant message by its ID (not the last message, which may be a tool message)
          updateMessage(sessionId, assistantMessageId, { content: fullContent });
        }

        // Handle result message - marks the end of the query
        if (message.type === "result") {
          // Complete any active task
          if (activeTaskRef.current) {
            updateMessage(sessionId, activeTaskRef.current.messageId, {
              isTaskLoading: false,
              taskEndTime: Date.now(),
              taskToolCount: activeTaskRef.current.toolCount,
            });
            activeTaskRef.current = null;
          }

          // Clear streaming state on the assistant message and set endTime
          updateMessage(sessionId, assistantMessageId, {
            isStreaming: false,
            endTime: new Date(),
          });
        }
      },
      (error) => {
        console.error("Query error:", error);
        // Complete any active task on error
        if (activeTaskRef.current) {
          updateMessage(sessionId, activeTaskRef.current.messageId, {
            isTaskLoading: false,
            taskEndTime: Date.now(),
          });
          activeTaskRef.current = null;
        }
        // Update the assistant message with the error
        updateMessage(sessionId, assistantMessageId, {
          content: `Error: ${error.message}`,
          isStreaming: false,
          endTime: new Date(),
        });
        setSessionLoading(sessionId, false);
        processQueue(sessionId);
      },
      () => {
        // Complete any active task on done
        if (activeTaskRef.current) {
          updateMessage(sessionId, activeTaskRef.current.messageId, {
            isTaskLoading: false,
            taskEndTime: Date.now(),
          });
          activeTaskRef.current = null;
        }

        // Clear streaming state on the assistant message and set endTime
        updateMessage(sessionId, assistantMessageId, {
          isStreaming: false,
          endTime: new Date(),
        });

        setSessionLoading(sessionId, false);
        abortRef.current = null;
        processQueue(sessionId);
      }
    );

    abortRef.current = stream;
  };

  const handleAbort = () => {
    // Complete any active task on abort
    if (activeTaskRef.current && sessionId) {
      updateMessage(sessionId, activeTaskRef.current.messageId, {
        isTaskLoading: false,
        taskEndTime: Date.now(),
      });
      activeTaskRef.current = null;
    }
    abortRef.current?.abort();
    if (sessionId) {
      setSessionLoading(sessionId, false);
      // Clear the queue on abort - user intentionally stopped
      messageQueues.delete(sessionId);
    }
  };

  return {
    messages,
    isLoading,
    handleSend,
    handleAbort,
  };
}
