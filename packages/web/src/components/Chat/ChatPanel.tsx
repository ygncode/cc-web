import { useRef, useEffect, useState, useCallback } from "react";
import { ChevronDown } from "lucide-react";
import { MessageList } from "./MessageList";
import { WelcomeState } from "./WelcomeState";
import type { Message } from "../../stores/sessionStore";

interface ChatPanelProps {
  messages: Message[];
}

export function ChatPanel({ messages }: ChatPanelProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const checkScrollPosition = useCallback(() => {
    if (!scrollContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const hasScrollableContent = scrollHeight > clientHeight;

    // Show button only if there's scrollable content AND more than 100px from bottom
    setShowScrollButton(hasScrollableContent && distanceFromBottom > 100);
  }, []);

  const handleScroll = useCallback(() => {
    checkScrollPosition();
  }, [checkScrollPosition]);

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Check scroll position when content changes (expand/collapse)
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Use ResizeObserver to detect content size changes
    const resizeObserver = new ResizeObserver(() => {
      checkScrollPosition();
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [checkScrollPosition]);

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto bg-background relative"
    >
      {messages.length === 0 ? (
        <WelcomeState />
      ) : (
        <MessageList messages={messages} />
      )}
      <div ref={messagesEndRef} />

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <button
          onClick={scrollToBottom}
          className="sticky bottom-4 right-4 ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-background border border-border-light rounded-lg shadow-md hover:bg-surface-hover transition-colors z-10"
        >
          <ChevronDown size={14} className="text-text-secondary" />
          <span className="text-[13px] text-text">Scroll to bottom</span>
        </button>
      )}
    </div>
  );
}
