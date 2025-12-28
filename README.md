# cc-web

A web-based UI for Claude AI, built on the Anthropic API. Access Claude's coding capabilities through a browser interface, perfect for remote access from mobile/tablet devices.

## Features

- **Chat Interface**: Interactive chat with Claude AI
- **Code Editing**: Claude can read, write, and edit files in your project
- **Terminal**: Built-in terminal with command execution
- **File Browser**: View and navigate your project files
- **Session Management**: Create and switch between chat sessions
- **Directory Sandboxing**: Agent is restricted to the current directory and subdirectories only

## Requirements

- [Bun](https://bun.sh/) runtime (v1.0+)
- Anthropic API key

## Installation

```bash
# Clone or navigate to the cc-web directory
cd cc-web

# Install dependencies
bun install

# Build all packages
bun run build
```

## Usage

1. Set your Anthropic API key:

```bash
export ANTHROPIC_API_KEY=your-api-key
```

2. Navigate to your project directory:

```bash
cd /path/to/your/project
```

3. Start the server:

```bash
cc-web start
```

Or run directly from the repository:

```bash
bun run --filter=@cc-web/cli start
```

4. Open http://localhost:8888 in your browser

## CLI Options

```
cc-web start [options]

Options:
  -p, --port <port>  Port to listen on (default: "8888")
  -H, --host <host>  Host to bind to (default: "localhost")
  -h, --help         Display help
```

### Remote Access

To access from other devices on your network:

```bash
cc-web start --host 0.0.0.0
```

Then access via `http://your-ip:8888` from any device.

## Development

Run the development servers:

```bash
# Terminal 1: Start the backend
bun run --filter=@cc-web/server dev

# Terminal 2: Start the frontend (with hot reload)
bun run --filter=@cc-web/web dev
```

Frontend runs on http://localhost:3000 with API proxy to the backend.

## Project Structure

```
cc-web/
├── packages/
│   ├── cli/          # CLI entry point (cc-web command)
│   ├── server/       # Hono backend + Anthropic API integration
│   └── web/          # React frontend (Vite + Tailwind)
├── package.json      # Root workspace config
└── README.md
```

## Security

- **Directory Restriction**: All file operations are sandboxed to the current working directory
- **Path Traversal Prevention**: Resolved paths are validated before any file operation
- **Future**: Basic authentication support planned for remote deployments

## Tech Stack

- **Runtime**: Bun
- **Frontend**: React 18, Vite, Tailwind CSS, xterm.js
- **Backend**: Hono
- **AI**: Anthropic Claude API with tool calling
- **State**: Zustand

## License

MIT
