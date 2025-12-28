# Plan: Terminal UI Improvements

## Requirements
1. Remove "Run" text from terminal section header
2. Auto-create new terminal when user exits and no terminals remain
3. Plus icon should add new terminal session

## Files to Modify

### 1. `packages/web/src/components/Layout/Sidebar.tsx`
- Remove "Run" text from terminal header
- Import and use `useTerminalStore`
- Add onClick to plus icon → call `addTerminal()`

### 2. `packages/web/src/components/Terminal/TerminalPanel.tsx`
- Accept `terminalId` as prop instead of creating internally
- Detect `exit` command and call `onExit` callback

### 3. `packages/web/src/stores/terminalStore.ts`
- Modify `removeTerminal` to auto-create terminal if list becomes empty

## Implementation Steps

1. Update Sidebar.tsx - remove "Run", wire plus icon
2. Update TerminalPanel.tsx - accept terminalId prop, handle exit
3. Update terminalStore.ts - ensure at least one terminal exists
