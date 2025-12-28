import { useEffect, useRef, useCallback } from "react";
import { Terminal, ITheme } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { execCommandStream } from "../../lib/api";
import { useLayoutStore } from "../../stores/layoutStore";

const darkTheme: ITheme = {
  background: "#1a1a1a",
  foreground: "#e5e5e5",
  cursor: "#a78bfa",
  cursorAccent: "#1a1a1a",
  selectionBackground: "rgba(167, 139, 250, 0.3)",
  black: "#1a1a1a",
  red: "#f87171",
  green: "#4ade80",
  yellow: "#facc15",
  blue: "#60a5fa",
  magenta: "#c084fc",
  cyan: "#22d3ee",
  white: "#e5e5e5",
  brightBlack: "#666",
  brightRed: "#fca5a5",
  brightGreen: "#86efac",
  brightYellow: "#fde047",
  brightBlue: "#93c5fd",
  brightMagenta: "#d8b4fe",
  brightCyan: "#67e8f9",
  brightWhite: "#ffffff",
};

const lightTheme: ITheme = {
  background: "#ffffff",
  foreground: "#1a1a1a",
  cursor: "#a78bfa",
  cursorAccent: "#ffffff",
  selectionBackground: "rgba(167, 139, 250, 0.3)",
  black: "#1a1a1a",
  red: "#dc2626",
  green: "#16a34a",
  yellow: "#ca8a04",
  blue: "#2563eb",
  magenta: "#9333ea",
  cyan: "#0891b2",
  white: "#e5e5e5",
  brightBlack: "#666",
  brightRed: "#ef4444",
  brightGreen: "#22c55e",
  brightYellow: "#eab308",
  brightBlue: "#3b82f6",
  brightMagenta: "#a855f7",
  brightCyan: "#06b6d4",
  brightWhite: "#ffffff",
};

interface TerminalPanelProps {
  terminalId: string;
  onExit?: () => void;
}

export function TerminalPanel({ terminalId, onExit }: TerminalPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const currentLineRef = useRef("");
  const runningProcessRef = useRef<{ abort: () => void } | null>(null);
  const theme = useLayoutStore((state) => state.theme);

  const executeCommand = useCallback((command: string, terminal: Terminal) => {
    // Handle clear command locally
    if (command === "clear" || command === "cls") {
      terminal.clear();
      terminal.write("$ ");
      return;
    }

    // Handle exit command
    if (command === "exit") {
      terminal.writeln("\x1b[90mExiting terminal...\x1b[0m");
      onExit?.();
      return;
    }

    // Use streaming for all commands
    const cols = terminal.cols;

    runningProcessRef.current = execCommandStream(
      terminalId,
      command,
      cols,
      (type, data) => {
        // Normalize line endings for xterm.js:
        // xterm requires \r\n for proper line breaks (\n alone doesn't return cursor to column 0)
        // 1. First normalize \r\n to \n
        // 2. Convert standalone \r to \n (progress bar updates become new lines)
        // 3. Then convert all \n to \r\n
        const normalized = data
          .replace(/\r\n/g, '\n')
          .replace(/\r/g, '\n')
          .replace(/\n/g, '\r\n');

        if (type === "stderr") {
          terminal.write(`\x1b[31m${normalized}\x1b[0m`);
        } else {
          terminal.write(normalized);
        }
      },
      (_exitCode) => {
        terminal.write("\r\n$ ");
        runningProcessRef.current = null;
      },
      (error) => {
        terminal.writeln(`\x1b[31mError: ${error.message}\x1b[0m`);
        terminal.write("$ ");
        runningProcessRef.current = null;
      }
    );
  }, [terminalId, onExit]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Create terminal instance
    const terminal = new Terminal({
      theme: theme === "dark" ? darkTheme : lightTheme,
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      fontSize: 12,
      lineHeight: 1.3,
      cursorBlink: true,
      cursorStyle: "bar",
      scrollback: 1000,
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);

    terminal.open(containerRef.current);

    // Small delay to ensure container is ready
    setTimeout(() => {
      fitAddon.fit();
    }, 10);

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Initialize terminal
    terminal.writeln("\x1b[90mcc-web terminal\x1b[0m");
    terminal.writeln("");
    terminal.write("$ ");

    // Handle resize
    const handleResize = () => {
      fitAddon.fit();
    };
    window.addEventListener("resize", handleResize);

    // Handle input
    terminal.onKey(({ key, domEvent }) => {
      const printable = !domEvent.altKey && !domEvent.ctrlKey && !domEvent.metaKey;

      if (domEvent.key === "Enter") {
        terminal.writeln("");
        const cmd = currentLineRef.current.trim();
        currentLineRef.current = "";

        if (cmd) {
          executeCommand(cmd, terminal);
        } else {
          terminal.write("$ ");
        }
      } else if (domEvent.key === "Backspace") {
        if (currentLineRef.current.length > 0) {
          currentLineRef.current = currentLineRef.current.slice(0, -1);
          terminal.write("\b \b");
        }
      } else if (domEvent.key === "c" && domEvent.ctrlKey) {
        // Handle Ctrl+C - abort running process if any
        if (runningProcessRef.current) {
          runningProcessRef.current.abort();
          runningProcessRef.current = null;
        }
        terminal.writeln("^C");
        currentLineRef.current = "";
        terminal.write("$ ");
      } else if (printable) {
        currentLineRef.current += key;
        terminal.write(key);
      }
    });

    return () => {
      window.removeEventListener("resize", handleResize);
      terminal.dispose();
    };
  }, [terminalId, executeCommand]);

  // Handle parent resize
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      setTimeout(() => {
        fitAddonRef.current?.fit();
      }, 10);
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Update terminal theme when app theme changes
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.options.theme = theme === "dark" ? darkTheme : lightTheme;
    }
  }, [theme]);

  return (
    <div ref={containerRef} className="h-full w-full bg-background" />
  );
}
