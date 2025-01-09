# VS Code Toolbar System

## Core Components

| Component | Purpose |
|-----------|----------|
| `WorkbenchToolBar` | Base toolbar with hiding, keybindings, telemetry |
| `MenuWorkbenchToolBar` | Menu-driven toolbar with dynamic updates |
| Actions | Commands that can be executed |

## How It Works

The toolbar system is like a switchboard that:
1. Collects actions from menus
2. Organizes them into primary/secondary groups
3. Handles visibility/overflow
4. Manages keybindings
5. Provides context menus

## Key Features

- **Smart Overflow**: Items can flow into secondary menu
- **Visibility Control**: Actions can be hidden/shown
- **Menu Integration**: Direct connection to VS Code's menu system
- **Telemetry**: Built-in usage tracking
- **Context Menus**: Configure keybindings and visibility

## Connection Points

- Integrates with Command system
- Works with Menu service
- Uses Context Keys for dynamic behavior
- Connects to Keybinding service
