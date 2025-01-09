# VS Code Actions System

## Core Interfaces & Classes

| Type | Purpose |
|------|---------|
| `IAction` | Core interface defining id, label, enabled state, and run method |
| `Action` | Base implementation with change events and state management |
| `ActionRunner` | Handles action execution with before/after events |
| `Separator` | Special action for visual grouping |
| `SubmenuAction` | Container for nested actions |

## Action Lifecycle

1. Creation: Actions are instantiated with id, label, and run callback
2. State Management: Enabled/disabled, checked/unchecked states with change events
3. Execution: Through ActionRunner with willRun/didRun events
4. Cleanup: Disposable pattern for cleanup

## Key Features

- Event-driven state changes (`onDidChange`)
- Telemetry data support
- Async execution model
- Built-in separation support (`Separator.join()`)
- Type-safe action creation (`toAction` helper)

## Integration Points

- MenuItemAction extends this base
- Workbench menus consume these actions
- Command system maps to actions
- Context menus use actions
- Toolbar system displays actions
