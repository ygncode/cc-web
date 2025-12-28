import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Loader2, AlertCircle } from "lucide-react";
import type { FileTab } from "../../stores/filePreviewStore";
import { useLayoutStore } from "../../stores/layoutStore";

interface FileContentProps {
  tab: FileTab;
}

// Map file extensions to syntax highlighter language names
function getLanguageFromExtension(extension: string): string {
  const languageMap: Record<string, string> = {
    ts: "typescript",
    tsx: "tsx",
    js: "javascript",
    jsx: "jsx",
    json: "json",
    yaml: "yaml",
    yml: "yaml",
    md: "markdown",
    css: "css",
    scss: "scss",
    html: "html",
    htm: "html",
    py: "python",
    go: "go",
    rs: "rust",
    sql: "sql",
    sh: "bash",
    bash: "bash",
    zsh: "bash",
    toml: "toml",
    xml: "xml",
    java: "java",
    c: "c",
    cpp: "cpp",
    h: "c",
    hpp: "cpp",
    rb: "ruby",
    php: "php",
    swift: "swift",
    kt: "kotlin",
    scala: "scala",
    r: "r",
    lua: "lua",
    vim: "vim",
    dockerfile: "dockerfile",
    makefile: "makefile",
  };

  return languageMap[extension.toLowerCase()] || "text";
}

function MarkdownContent({ content }: { content: string }) {
  const theme = useLayoutStore((state) => state.theme);
  const isDark = theme === "dark";
  const syntaxTheme = isDark ? oneDark : oneLight;

  return (
    <div className="px-8 py-6 max-w-4xl">
      <ReactMarkdown
        components={{
          code({ node, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const isInline = !match;

            if (isInline) {
              return (
                <code
                  className="bg-surface-hover px-1.5 py-0.5 rounded text-[13px] font-mono text-text"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            return (
              <SyntaxHighlighter
                style={syntaxTheme}
                language={match[1]}
                PreTag="div"
                customStyle={{
                  margin: "16px 0",
                  borderRadius: "8px",
                  fontSize: "13px",
                  padding: "16px",
                }}
              >
                {String(children).replace(/\n$/, "")}
              </SyntaxHighlighter>
            );
          },
          h1({ children }) {
            return (
              <h1 className="text-3xl font-bold mt-8 mb-4 pb-2 border-b border-border text-text">
                {children}
              </h1>
            );
          },
          h2({ children }) {
            return (
              <h2 className="text-2xl font-semibold mt-6 mb-3 pb-2 border-b border-border text-text">
                {children}
              </h2>
            );
          },
          h3({ children }) {
            return (
              <h3 className="text-xl font-semibold mt-5 mb-2 text-text">{children}</h3>
            );
          },
          h4({ children }) {
            return (
              <h4 className="text-lg font-semibold mt-4 mb-2 text-text">{children}</h4>
            );
          },
          p({ children }) {
            return <p className="mb-4 leading-relaxed text-text">{children}</p>;
          },
          ul({ children }) {
            return (
              <ul className="list-disc list-outside ml-6 mb-4 space-y-2 text-text">
                {children}
              </ul>
            );
          },
          ol({ children }) {
            return (
              <ol className="list-decimal list-outside ml-6 mb-4 space-y-2 text-text">
                {children}
              </ol>
            );
          },
          li({ children }) {
            return <li className="leading-relaxed">{children}</li>;
          },
          blockquote({ children }) {
            return (
              <blockquote className="border-l-4 border-accent pl-4 my-4 italic text-text-secondary">
                {children}
              </blockquote>
            );
          },
          a({ href, children }) {
            return (
              <a
                href={href}
                className="text-accent hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                {children}
              </a>
            );
          },
          strong({ children }) {
            return <strong className="font-semibold text-text">{children}</strong>;
          },
          em({ children }) {
            return <em className="italic">{children}</em>;
          },
          hr() {
            return <hr className="my-6 border-border" />;
          },
          table({ children }) {
            return (
              <div className="overflow-x-auto my-4">
                <table className="min-w-full border border-border rounded-lg overflow-hidden">
                  {children}
                </table>
              </div>
            );
          },
          th({ children }) {
            return (
              <th className="px-4 py-2 bg-surface text-left text-text font-semibold border-b border-border">
                {children}
              </th>
            );
          },
          td({ children }) {
            return (
              <td className="px-4 py-2 border-b border-border text-text">{children}</td>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function CodeContent({ content, extension }: { content: string; extension: string }) {
  const language = getLanguageFromExtension(extension);
  const theme = useLayoutStore((state) => state.theme);
  const isDark = theme === "dark";

  // Choose theme based on app theme
  const syntaxTheme = isDark ? oneDark : oneLight;

  return (
    <div className="h-full overflow-auto">
      <SyntaxHighlighter
        style={syntaxTheme}
        language={language}
        showLineNumbers={true}
        lineNumberStyle={{
          minWidth: "3em",
          paddingRight: "16px",
          textAlign: "right",
          color: isDark ? "#636d83" : "#9ca3af",
          userSelect: "none",
        }}
        customStyle={{
          margin: 0,
          padding: "12px 0",
          borderRadius: 0,
          fontSize: "13px",
          lineHeight: "1.6",
          backgroundColor: isDark ? "#282c34" : "#ffffff",
          minHeight: "100%",
        }}
        codeTagProps={{
          style: {
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
          },
        }}
      >
        {content}
      </SyntaxHighlighter>
    </div>
  );
}

export function FileContent({ tab }: FileContentProps) {
  if (tab.isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-3 text-text-muted">
          <Loader2 size={20} className="animate-spin" />
          <span>Loading file...</span>
        </div>
      </div>
    );
  }

  if (tab.error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-3 text-red-500">
          <AlertCircle size={20} />
          <span>{tab.error}</span>
        </div>
      </div>
    );
  }

  if (!tab.content) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted">
        File is empty
      </div>
    );
  }

  // Render markdown files with rich formatting
  if (tab.extension === "md") {
    return <MarkdownContent content={tab.content} />;
  }

  // Render code files with syntax highlighting
  return <CodeContent content={tab.content} extension={tab.extension} />;
}
