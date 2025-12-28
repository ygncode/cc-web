import { useRef, useState } from "react";
import { useSessionStore, type Attachment } from "../stores/sessionStore";
import { streamAgentQuery, api } from "../lib/api";

interface ActiveTask {
  messageId: string;
  toolCount: number;
  startTime: number;
}

export function useChatSession(sessionId: string | null) {
  const { addMessage, updateLastMessage, updateMessage, getMessages } = useSessionStore();
  const [isLoading, setIsLoading] = useState(false);
  const [agentSessionId, setAgentSessionId] = useState<string | undefined>();
  const abortRef = useRef<{ abort: () => void } | null>(null);
  const activeTaskRef = useRef<ActiveTask | null>(null);

  const messages = sessionId ? getMessages(sessionId) : [];

  const handleSend = async (prompt: string, model?: string, files?: File[]) => {
    if (!sessionId || !prompt.trim() || isLoading) return;

    setIsLoading(true);
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
        setIsLoading(false);
        return;
      }
    }

    // Add user message with attachments
    addMessage(sessionId, {
      role: "user",
      content: prompt,
      attachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
    });

    // Add placeholder for assistant response
    addMessage(sessionId, {
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
      (message) => {
        // Capture agent session ID
        if (message.agentSessionId && !agentSessionId) {
          setAgentSessionId(message.agentSessionId);
        }

        // Handle Task tool calls - create a task message
        if (message.type === "tool_call" && message.toolName === "Task") {
          const input = message.toolInput || {};
          const taskType = (input.subagent_type as string) || "Task";
          const taskDescription = (input.description as string) || "Running task...";
          const taskPrompt = input.prompt as string;

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
          };
          return;
        }

        // Handle other tool calls - count them for active task
        if (message.type === "tool_call" && activeTaskRef.current) {
          activeTaskRef.current.toolCount++;
          updateMessage(sessionId, activeTaskRef.current.messageId, {
            taskToolCount: activeTaskRef.current.toolCount,
          });

          // Also add as a tool message for detailed view
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
          // Complete any active task first
          if (activeTaskRef.current) {
            updateMessage(sessionId, activeTaskRef.current.messageId, {
              isTaskLoading: false,
              taskEndTime: Date.now(),
              taskToolCount: activeTaskRef.current.toolCount,
              taskResult: message.message.content as string,
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
          updateLastMessage(sessionId, fullContent);
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
        updateLastMessage(sessionId, `Error: ${error.message}`);
        setIsLoading(false);
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
        setIsLoading(false);
        abortRef.current = null;
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
    setIsLoading(false);
  };

  return {
    messages,
    isLoading,
    handleSend,
    handleAbort,
  };
}
