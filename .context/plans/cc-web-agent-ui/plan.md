# CC-Web: Claude Code Web UI

A web-based interface for Claude Agent SDK that allows users to interact with Claude Code through a browser, accessible via mobile/tablet devices.

## Overview

**Goal:** Create a self-hosted web application that provides a Claude Code-like experience accessible from any device via browser.

**Command:** `cc-web start` → Accessible at `http://localhost:8888`

**Key Constraint:** Agent restricted to current working directory and subdirectories only (no parent directory access).

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Bun |
| Frontend | Vite + React + TypeScript |
| Backend | Hono |
| Agent | @anthropic-ai/claude-agent-sdk |
| Styling | Tailwind CSS |
| Terminal | xterm.js |
| State | Zustand (lightweight) |

---

## Project Structure

```
cc-web/
├── package.json                 # Root package with workspaces
├── bunfig.toml                  # Bun configuration
├── tsconfig.json                # Shared TypeScript config
│
├── packages/
│   ├── cli/                     # CLI entry point
│   │   ├── package.json
│   │   ├── src/
│   │   │   └── index.ts         # cc-web command (start, --port, etc.)
│   │   └── bin/
│   │       └── cc-web.ts        # Executable entry
│   │
│   ├── server/                  # Hono backend
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── index.ts         # Server entry
│   │   │   ├── routes/
│   │   │   │   ├── agent.ts     # Agent query endpoints
│   │   │   │   ├── session.ts   # Session management
│   │   │   │   ├── files.ts     # File browser API
│   │   │   │   └── terminal.ts  # PTY/terminal endpoints
│   │   │   ├── services/
│   │   │   │   ├── agent.ts     # Claude Agent SDK wrapper
│   │   │   │   ├── sandbox.ts   # Directory restriction logic
│   │   │   │   └── pty.ts       # Terminal service
│   │   │   └── middleware/
│   │   │       └── auth.ts      # Future: Basic auth middleware
│   │   └── tsconfig.json
│   │
│   └── web/                     # React frontend
│       ├── package.json
│       ├── vite.config.ts
│       ├── index.html
│       ├── src/
│       │   ├── main.tsx         # React entry
│       │   ├── App.tsx          # Main app component
│       │   ├── components/
│       │   │   ├── Layout/
│       │   │   │   ├── Header.tsx
│       │   │   │   ├── Sidebar.tsx
│       │   │   │   └── ResizeHandle.tsx
│       │   │   ├── Chat/
│       │   │   │   ├── ChatPanel.tsx
│       │   │   │   ├── MessageList.tsx
│       │   │   │   ├── Message.tsx
│       │   │   │   ├── PromptInput.tsx
│       │   │   │   └── ToolCall.tsx
│       │   │   ├── FileTree/
│       │   │   │   ├── FileTree.tsx
│       │   │   │   ├── FileNode.tsx
│       │   │   │   └── FileViewer.tsx
│       │   │   ├── Terminal/
│       │   │   │   ├── TerminalPanel.tsx
│       │   │   │   └── TerminalTabs.tsx
│       │   │   └── Session/
│       │   │       ├── SessionTabs.tsx
│       │   │       └── SessionManager.tsx
│       │   ├── hooks/
│       │   │   ├── useAgent.ts
│       │   │   ├── useSession.ts
│       │   │   ├── useTerminal.ts
│       │   │   └── useFiles.ts
│       │   ├── stores/
│       │   │   ├── sessionStore.ts
│       │   │   ├── layoutStore.ts
│       │   │   └── terminalStore.ts
│       │   ├── lib/
│       │   │   ├── api.ts       # API client
│       │   │   └── sse.ts       # SSE helper
│       │   └── styles/
│       │       └── globals.css
│       └── tsconfig.json
│
└── .context/
    └── plans/
        └── cc-web-agent-ui/
            └── plan.md          # This file
```

---

## Implementation Phases

### Phase 1: Project Setup & Core Infrastructure

1. **Initialize monorepo with Bun workspaces**
   - Create root `package.json` with workspace configuration
   - Set up shared TypeScript config
   - Configure Bun settings

2. **Create CLI package**
   - Implement `cc-web start` command
   - Add options: `--port` (default 8888), `--host` (default localhost)
   - Handle graceful shutdown

3. **Create Hono server package**
   - Basic server setup with CORS
   - Health check endpoint
   - Static file serving for frontend build

4. **Create Vite + React frontend**
   - Initialize with Vite React template
   - Configure Tailwind CSS
   - Set up basic routing

---

### Phase 2: Agent Integration & Chat

1. **Agent service (server/src/services/agent.ts)**
   ```typescript
   // Key implementation points:
   - Use @anthropic-ai/claude-agent-sdk query() function
   - Set cwd to process.cwd() (where cc-web start is run)
   - Configure allowedTools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep"]
   - Set permissionMode: "acceptEdits" (auto-accept for web use)
   - Implement canUseTool callback for directory restriction
   ```

2. **Directory restriction (sandbox.ts)**
   ```typescript
   // Security: Prevent path traversal
   function isPathAllowed(requestedPath: string, basePath: string): boolean {
     const resolved = path.resolve(basePath, requestedPath);
     return resolved.startsWith(basePath);
   }

   // Use in canUseTool callback:
   canUseTool: async (toolName, input) => {
     if (['Read', 'Write', 'Edit', 'Glob', 'Grep'].includes(toolName)) {
       const filePath = input.file_path || input.path;
       if (filePath && !isPathAllowed(filePath, BASE_DIR)) {
         return { behavior: 'deny', message: 'Access restricted to project directory' };
       }
     }
     if (toolName === 'Bash') {
       // Additional command validation if needed
     }
     return { behavior: 'allow', updatedInput: input };
   }
   ```

3. **Agent API routes (routes/agent.ts)**
   - `POST /api/agent/query` - Execute agent with streaming (SSE)
   - `POST /api/agent/abort` - Abort current execution

4. **Chat UI components**
   - `ChatPanel` - Main chat container
   - `MessageList` - Scrollable message history
   - `Message` - Individual message (user/assistant/tool)
   - `PromptInput` - Input with keyboard shortcuts (Cmd+Enter to send)
   - `ToolCall` - Display tool executions with collapsible details

---

### Phase 3: Session Management

1. **Session storage (in-memory initially, file-based later)**
   ```typescript
   interface Session {
     id: string;
     name: string;
     createdAt: Date;
     updatedAt: Date;
     messages: Message[];
     agentSessionId?: string;  // For resume
   }
   ```

2. **Session API routes (routes/session.ts)**
   - `GET /api/sessions` - List all sessions
   - `POST /api/sessions` - Create new session
   - `GET /api/sessions/:id` - Get session with messages
   - `DELETE /api/sessions/:id` - Delete session
   - `PATCH /api/sessions/:id` - Rename session

3. **Session UI components**
   - `SessionTabs` - Tab bar with + button for new sessions
   - `SessionManager` - Session list in sidebar (if sidebar mode)

---

### Phase 4: File Browser

1. **File API routes (routes/files.ts)**
   - `GET /api/files` - List directory tree (restricted to cwd)
   - `GET /api/files/content?path=...` - Read file content
   - `GET /api/files/changes` - Get uncommitted changes (if git)

2. **File tree components**
   - `FileTree` - Recursive tree view with expand/collapse
   - `FileNode` - Individual file/folder with icon
   - `FileViewer` - Read-only file preview (syntax highlighted)

3. **Features**
   - Toggle between "Changes" and "All files" views
   - Click to preview file
   - Show file icons based on extension

---

### Phase 5: Terminal Integration

1. **PTY service (services/pty.ts)**
   ```typescript
   // Use node-pty for pseudo-terminal
   import * as pty from 'node-pty';

   class PTYService {
     private terminals: Map<string, pty.IPty>;

     create(id: string, cwd: string): void;
     write(id: string, data: string): void;
     resize(id: string, cols: number, rows: number): void;
     destroy(id: string): void;
   }
   ```

2. **Terminal WebSocket endpoint**
   - `WS /api/terminal/:id` - Bidirectional terminal communication

3. **Terminal UI (xterm.js)**
   - `TerminalPanel` - Container with xterm instance
   - `TerminalTabs` - Multiple terminal tabs with + button
   - Auto-resize on panel resize
   - Copy/paste support

---

### Phase 6: UI Polish & Layout

1. **Layout structure (matching reference UI)**
   ```
   ┌──────────────────────────────────────────────────────────────┐
   │ Header: [Logo] [Session Tabs...] [+] [History]               │
   ├────────────────────────────────────┬─────────────────────────┤
   │                                    │ [Changes] [All files]   │
   │                                    │ ┌─────────────────────┐ │
   │  Chat Area                         │ │ File Tree           │ │
   │  - Message history                 │ │  ├── cmd/           │ │
   │  - Tool call displays              │ │  ├── docs/          │ │
   │                                    │ │  └── ...            │ │
   │                                    │ └─────────────────────┘ │
   │                                    │                         │
   │                                    │ ▼ Run    Terminal    +  │
   │                                    │ ┌─────────────────────┐ │
   │ ┌──────────────────────────────┐   │ │ $ _                 │ │
   │ │ Prompt Input         [Icons] │   │ │                     │ │
   │ └──────────────────────────────┘   │ └─────────────────────┘ │
   │ [Model: Opus 4.5] [Actions...]     │                         │
   └────────────────────────────────────┴─────────────────────────┘
   ```

2. **Resizable panels**
   - Chat/sidebar horizontal resize
   - Terminal vertical resize
   - Persist layout in localStorage

3. **Theme**
   - Dark theme (matching reference)
   - Monospace fonts for code/terminal
   - Syntax highlighting for code blocks

---

### Phase 7: CLI & Distribution

1. **CLI implementation**
   ```typescript
   // packages/cli/src/index.ts
   import { serve } from '@hono/node-server';
   import app from '@cc-web/server';

   const program = new Command()
     .name('cc-web')
     .description('Web UI for Claude Code')
     .version('0.1.0');

   program
     .command('start')
     .option('-p, --port <port>', 'Port to listen on', '8888')
     .option('-h, --host <host>', 'Host to bind to', 'localhost')
     .action(async (options) => {
       const port = parseInt(options.port);
       console.log(`Starting cc-web on http://${options.host}:${port}`);
       console.log(`Working directory: ${process.cwd()}`);

       serve({ fetch: app.fetch, port, hostname: options.host });
     });
   ```

2. **Package configuration**
   - Set `bin` field in package.json
   - Build script to bundle for distribution
   - Embed frontend build in server package

---

## Future Considerations (Phase 8+)

### Basic Authentication
```typescript
// middleware/auth.ts
app.use('/api/*', async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  // Basic auth or token validation
  await next();
});
```

### Configuration File
```yaml
# cc-web.yaml
port: 8888
host: 0.0.0.0
auth:
  enabled: true
  username: admin
  password: $hashed_password
```

### Mobile Optimizations
- Touch-friendly UI elements
- Responsive layout for small screens
- Virtual keyboard handling

---

## API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/agent/query` | Execute agent query (SSE stream) |
| POST | `/api/agent/abort` | Abort current execution |
| GET | `/api/sessions` | List sessions |
| POST | `/api/sessions` | Create session |
| GET | `/api/sessions/:id` | Get session |
| DELETE | `/api/sessions/:id` | Delete session |
| PATCH | `/api/sessions/:id` | Update session |
| GET | `/api/files` | List file tree |
| GET | `/api/files/content` | Read file content |
| WS | `/api/terminal/:id` | Terminal WebSocket |

---

## Dependencies

### Server (packages/server)
```json
{
  "dependencies": {
    "hono": "^4.0.0",
    "@anthropic-ai/claude-agent-sdk": "latest",
    "node-pty": "^1.0.0",
    "nanoid": "^5.0.0"
  }
}
```

### Web (packages/web)
```json
{
  "dependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "zustand": "^4.0.0",
    "@xterm/xterm": "^5.0.0",
    "@xterm/addon-fit": "^0.8.0",
    "react-markdown": "^9.0.0",
    "shiki": "^1.0.0"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "tailwindcss": "^3.0.0",
    "typescript": "^5.0.0"
  }
}
```

### CLI (packages/cli)
```json
{
  "dependencies": {
    "commander": "^12.0.0",
    "@cc-web/server": "workspace:*"
  }
}
```

---

## Security Considerations

1. **Directory Restriction**
   - All file operations validated against base directory
   - Path traversal prevention (resolve + startsWith check)
   - No access to parent directories

2. **Bash Command Sandboxing**
   - Commands execute in restricted cwd
   - Consider blocking dangerous commands (rm -rf /, etc.)

3. **Future Auth**
   - HTTPS recommended for production
   - Rate limiting for auth attempts
   - Session tokens with expiration

---

## Success Criteria

- [ ] `cc-web start` launches server on port 8888
- [ ] UI matches reference design (chat, file tree, terminal)
- [ ] Agent queries execute with streaming responses
- [ ] File operations restricted to cwd and subdirectories
- [ ] Multiple chat sessions supported
- [ ] Terminal functional with PTY
- [ ] Works on mobile/tablet browsers
- [ ] No access outside project directory
