import { Message } from "./Message";
import { ToolCallBlock } from "./ToolCallBlock";
import { SubagentBlock } from "./SubagentBlock";
import type { Message as MessageType } from "../../stores/sessionStore";

interface MessageListProps {
  messages: MessageType[];
}

interface MessageGroup {
  type: "message" | "tools" | "task";
  messages: MessageType[];
  taskMessage?: MessageType;
  nestedToolMessages?: MessageType[];
  associatedToolMessages?: MessageType[]; // Tools associated with assistant message
  id: string;
}

// Check if a message is a streaming placeholder (loading state)
function isStreamingPlaceholder(message: MessageType): boolean {
  return (
    message.role === "assistant" &&
    (message as any).isStreaming === true &&
    !message.content
  );
}

// Group messages: task messages with their nested tool calls, tools associated with assistant messages
function groupMessages(messages: MessageType[]): MessageGroup[] {
  const groups: MessageGroup[] = [];
  let currentTaskMessage: MessageType | null = null;
  let currentTaskToolMessages: MessageType[] = [];
  let lastAssistantGroupIndex: number = -1; // Track last assistant message group
  let streamingPlaceholder: MessageType | null = null;

  for (const message of messages) {
    // Capture streaming placeholder to render at the end
    if (isStreamingPlaceholder(message)) {
      streamingPlaceholder = message;
      continue;
    }

    // Handle task messages
    if (message.role === "task") {
      // Flush previous task if any
      if (currentTaskMessage) {
        groups.push({
          type: "task",
          messages: [currentTaskMessage, ...currentTaskToolMessages],
          taskMessage: currentTaskMessage,
          nestedToolMessages: currentTaskToolMessages,
          id: `task-${currentTaskMessage.id}`,
        });
      }

      // Start new task
      currentTaskMessage = message;
      currentTaskToolMessages = [];
      continue;
    }

    // Handle tool messages
    if (message.role === "tool") {
      if (currentTaskMessage) {
        // Tool belongs to current task
        currentTaskToolMessages.push(message);
      } else if (lastAssistantGroupIndex >= 0) {
        // Associate tool with last assistant message
        const lastAssistantGroup = groups[lastAssistantGroupIndex];
        if (!lastAssistantGroup.associatedToolMessages) {
          lastAssistantGroup.associatedToolMessages = [];
        }
        lastAssistantGroup.associatedToolMessages.push(message);
      }
      // If no assistant message yet, ignore the tool (shouldn't happen in practice)
      continue;
    }

    // Handle regular messages (user, assistant, system)
    // Flush any pending task
    if (currentTaskMessage) {
      groups.push({
        type: "task",
        messages: [currentTaskMessage, ...currentTaskToolMessages],
        taskMessage: currentTaskMessage,
        nestedToolMessages: currentTaskToolMessages,
        id: `task-${currentTaskMessage.id}`,
      });
      currentTaskMessage = null;
      currentTaskToolMessages = [];
    }

    // Add regular message
    const newGroup: MessageGroup = {
      type: "message",
      messages: [message],
      id: message.id,
    };
    groups.push(newGroup);

    // Track assistant messages so we can associate tools with them
    if (message.role === "assistant") {
      lastAssistantGroupIndex = groups.length - 1;
    }
  }

  // Flush remaining task
  if (currentTaskMessage) {
    groups.push({
      type: "task",
      messages: [currentTaskMessage, ...currentTaskToolMessages],
      taskMessage: currentTaskMessage,
      nestedToolMessages: currentTaskToolMessages,
      id: `task-${currentTaskMessage.id}`,
    });
  }

  // Add streaming placeholder at the end so loading indicator appears below messages
  if (streamingPlaceholder) {
    const placeholderGroup: MessageGroup = {
      type: "message",
      messages: [streamingPlaceholder],
      id: streamingPlaceholder.id,
    };
    groups.push(placeholderGroup);
    // Associate any remaining tools with the streaming placeholder
    lastAssistantGroupIndex = groups.length - 1;
  }

  return groups;
}

export function MessageList({ messages }: MessageListProps) {
  const groups = groupMessages(messages);

  return (
    <div className="px-4 py-4 space-y-2">
      {groups.map((group) => {
        if (group.type === "task" && group.taskMessage) {
          return (
            <SubagentBlock
              key={group.id}
              taskMessage={group.taskMessage}
              nestedToolMessages={group.nestedToolMessages}
            />
          );
        }
        // Render standalone tool call blocks
        if (group.type === "tools") {
          return (
            <ToolCallBlock
              key={group.id}
              toolMessages={group.messages}
            />
          );
        }
        return (
          <Message
            key={group.id}
            message={group.messages[0]}
            associatedToolMessages={group.associatedToolMessages}
          />
        );
      })}
    </div>
  );
}
