import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Loader2 } from "lucide-react";
import type { Message as MessageType } from "../../stores/sessionStore";

interface MessageProps {
  message: MessageType;
}

// Loading indicator with animated dots
function LoadingIndicator() {
  const [dots, setDots] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((d) => (d + 1) % 4);
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2 text-text-muted py-1">
      <Loader2 size={14} className="animate-spin" />
      <span className="text-[13px]">
        Processing{".".repeat(dots)}
      </span>
    </div>
  );
}

export function Message({ message }: MessageProps) {
  const isUser = message.role === "user";
  const isStreaming = (message as any).isStreaming && !message.content;

  const content =
    typeof message.content === "string"
      ? message.content
      : JSON.stringify(message.content);

  // User message: right-aligned with bubble
  if (isUser) {
    return (
      <div className="flex justify-end py-2">
        <div className="bg-user-bubble rounded-2xl px-4 py-3 max-w-[80%]">
          <span className="text-[14px] text-text whitespace-pre-wrap">{content}</span>
        </div>
      </div>
    );
  }

  // Assistant message: left-aligned without bubble
  return (
    <div className="flex justify-start py-2">
      <div className="max-w-[90%]">
        <div className="text-[13px] text-text leading-relaxed">
          {content ? (
            <ReactMarkdown
              components={{
                code({ node, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || "");
                  const isInline = !match;

                  if (isInline) {
                    return (
                      <code
                        className="bg-surface-hover px-1.5 py-0.5 rounded text-[12px] font-mono text-text"
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  }

                  return (
                    <SyntaxHighlighter
                      style={oneDark}
                      language={match[1]}
                      PreTag="div"
                      customStyle={{
                        margin: "8px 0",
                        borderRadius: "6px",
                        fontSize: "12px",
                      }}
                    >
                      {String(children).replace(/\n$/, "")}
                    </SyntaxHighlighter>
                  );
                },
                p({ children }) {
                  return <p className="mb-2 last:mb-0">{children}</p>;
                },
                ul({ children }) {
                  return <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>;
                },
                ol({ children }) {
                  return <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>;
                },
              }}
            >
              {content}
            </ReactMarkdown>
          ) : isStreaming ? (
            <LoadingIndicator />
          ) : null}
        </div>
      </div>
    </div>
  );
}
