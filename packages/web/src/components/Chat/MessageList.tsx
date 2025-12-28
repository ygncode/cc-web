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
  id: string;
}

// Group messages: task messages with their nested tool calls, and standalone tool calls
function groupMessages(messages: MessageType[]): MessageGroup[] {
  const groups: MessageGroup[] = [];
  let currentTaskMessage: MessageType | null = null;
  let currentTaskToolMessages: MessageType[] = [];
  let standaloneToolGroup: MessageType[] = [];

  for (const message of messages) {
    // Handle task messages
    if (message.role === "task") {
      // Flush any standalone tool messages first
      if (standaloneToolGroup.length > 0) {
        groups.push({
          type: "tools",
          messages: standaloneToolGroup,
          id: `tools-${standaloneToolGroup[0].id}`,
        });
        standaloneToolGroup = [];
      }

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
      } else {
        // Standalone tool
        standaloneToolGroup.push(message);
      }
      continue;
    }

    // Handle regular messages (user, assistant, system)
    // Flush any pending groups first
    if (standaloneToolGroup.length > 0) {
      groups.push({
        type: "tools",
        messages: standaloneToolGroup,
        id: `tools-${standaloneToolGroup[0].id}`,
      });
      standaloneToolGroup = [];
    }

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
    groups.push({
      type: "message",
      messages: [message],
      id: message.id,
    });
  }

  // Flush remaining groups
  if (standaloneToolGroup.length > 0) {
    groups.push({
      type: "tools",
      messages: standaloneToolGroup,
      id: `tools-${standaloneToolGroup[0].id}`,
    });
  }

  if (currentTaskMessage) {
    groups.push({
      type: "task",
      messages: [currentTaskMessage, ...currentTaskToolMessages],
      taskMessage: currentTaskMessage,
      nestedToolMessages: currentTaskToolMessages,
      id: `task-${currentTaskMessage.id}`,
    });
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
        if (group.type === "tools") {
          return (
            <ToolCallBlock
              key={group.id}
              toolMessages={group.messages}
              assistantMessageCount={1}
            />
          );
        }
        return <Message key={group.id} message={group.messages[0]} />;
      })}
    </div>
  );
}
