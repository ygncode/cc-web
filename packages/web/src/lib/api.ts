import type { Attachment } from "../stores/sessionStore";

const BASE_URL = "/api";

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || "Request failed");
  }

  return response.json();
}

export const api = {
  // Health
  health: () => fetchJSON<{ status: string; cwd: string }>("/health"),

  // Sessions
  getSessions: () =>
    fetchJSON<{ sessions: Array<{ id: string; name: string; createdAt: string; updatedAt: string; messageCount: number }> }>(
      "/sessions"
    ),

  createSession: (name?: string) =>
    fetchJSON<{ session: { id: string; name: string; createdAt: string; updatedAt: string; messageCount: number } }>(
      "/sessions",
      { method: "POST", body: JSON.stringify({ name }) }
    ),

  getSession: (id: string) =>
    fetchJSON<{ session: any }>(`/sessions/${id}`),

  updateSession: (id: string, updates: { name?: string }) =>
    fetchJSON<{ session: any }>(`/sessions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    }),

  deleteSession: (id: string) =>
    fetchJSON<{ success: boolean }>(`/sessions/${id}`, { method: "DELETE" }),

  // Files
  getFiles: (depth?: number) =>
    fetchJSON<{ tree: any[]; cwd: string }>(`/files${depth ? `?depth=${depth}` : ""}`),

  getFileContent: (path: string) =>
    fetchJSON<{ content: string; path: string; extension: string; size: number }>(
      `/files/content?path=${encodeURIComponent(path)}`
    ),

  getChanges: () =>
    fetchJSON<{ changes: Array<{ status: string; path: string; type: string }>; isGitRepo: boolean }>(
      "/files/changes"
    ),

  uploadAttachments: async (files: File[]): Promise<{ attachments: Attachment[] }> => {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    const response = await fetch(`${BASE_URL}/files/upload`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Upload failed" }));
      throw new Error(error.error || "Upload failed");
    }

    return response.json();
  },

  // Terminal
  createTerminal: () =>
    fetchJSON<{ terminal: { id: string; cwd: string; createdAt: string } }>("/terminal", {
      method: "POST",
    }),

  execCommand: (terminalId: string, command: string, cols?: number) =>
    fetchJSON<{ stdout: string; stderr: string; exitCode: number }>(
      `/terminal/${terminalId}/exec`,
      { method: "POST", body: JSON.stringify({ command, cols }) }
    ),

  cancelCommand: (terminalId: string, processId: string) =>
    fetchJSON<{ success: boolean }>(
      `/terminal/${terminalId}/cancel`,
      { method: "POST", body: JSON.stringify({ processId }) }
    ),
};

// SSE helper for streaming agent responses
export function streamAgentQuery(
  prompt: string,
  sessionId?: string,
  agentSessionId?: string,
  model?: string,
  attachments?: Attachment[],
  budgetTokens?: number,
  planMode?: boolean,
  onMessage?: (message: any) => void,
  onError?: (error: Error) => void,
  onDone?: () => void
): { abort: () => void } {
  const abortController = new AbortController();
  let queryId: string | null = null;

  (async () => {
    try {
      const response = await fetch(`${BASE_URL}/agent/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, sessionId, agentSessionId, model, attachments, budgetTokens, planMode }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error("Failed to start query");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body");
      }

      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("event:")) {
            continue;
          }
          if (line.startsWith("data:")) {
            const data = line.slice(5).trim();

            if (data === "[DONE]") {
              onDone?.();
              return;
            }

            try {
              const parsed = JSON.parse(data);

              if (parsed.queryId) {
                queryId = parsed.queryId;
              }

              onMessage?.(parsed);
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        onError?.(error as Error);
      }
    }
  })();

  return {
    abort: () => {
      abortController.abort();
      if (queryId) {
        fetch(`${BASE_URL}/agent/abort`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ queryId }),
        }).catch(console.error);
      }
    },
  };
}

// SSE helper for streaming terminal command output
export function execCommandStream(
  terminalId: string,
  command: string,
  cols: number,
  onData: (type: "stdout" | "stderr", data: string) => void,
  onExit: (exitCode: number) => void,
  onError: (error: Error) => void
): { abort: () => void } {
  const abortController = new AbortController();
  let processId: string | null = null;

  (async () => {
    try {
      const response = await fetch(`${BASE_URL}/terminal/${terminalId}/exec-stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command, cols }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error("Failed to execute command");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      if (!reader) {
        throw new Error("No response body");
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data:")) {
            const data = line.slice(5).trim();
            if (data === "[DONE]") return;

            try {
              const parsed = JSON.parse(data);
              if (parsed.processId) processId = parsed.processId;
              if (parsed.type === "stdout" || parsed.type === "stderr") {
                onData(parsed.type, parsed.data);
              }
              if (parsed.type === "exit") {
                onExit(parsed.exitCode);
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        onError(error as Error);
      }
    }
  })();

  return {
    abort: () => {
      abortController.abort();
      if (processId) {
        fetch(`${BASE_URL}/terminal/${terminalId}/cancel`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ processId }),
        }).catch(() => {});
      }
    },
  };
}
