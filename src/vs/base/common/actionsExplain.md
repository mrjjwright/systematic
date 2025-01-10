# VS Code Action System

## Core Concept

Think of Actions as a pipeline:
1. Action (core behavior)
2. Menu (presentation)
3. Command (binding)

## Action Types

| Type | Purpose | Example |
|------|---------|---------|
| `IAction` | Basic action interface | `SaveFileAction` |
| `Action2` | Modern action with DI | `QuickOpenAction` |
| `MenuItemAction` | Menu-bound action | Context menu items |
| `SubmenuAction` | Nested menu structure | "New File..." submenu |

## Registration Flow

```typescript
// 1. Define the action
class MyAction extends Action2 {
    static readonly ID = 'myAction';
    constructor() {
        super({
            id: MyAction.ID,
            title: 'My Action',
            menu: {
                id: MenuId.CommandPalette
            }
        });
    }
    run(): void { /* ... */ }
}

// 2. Register via contribution
class MyContribution implements IWorkbenchContribution {
    constructor() {
        registerAction2(MyAction);
    }
}

// Complete workflow example
class EditorContribution implements IWorkbenchContribution {
    constructor(
        @IMenuService private readonly menuService: IMenuService,
        @ICommandService private readonly commandService: ICommandService
    ) {
        // 1. Register action
        registerAction2(class extends Action2 {
            static readonly ID = 'editor.action.example';

            constructor() {
                super({
                    id: 'editor.action.example',
                    title: 'Example Action',
                    menu: {
                        id: MenuId.EditorContext,
                        when: EditorContextKeys.focus
                    },
                    keybinding: {
                        primary: KeyCode.F10
                    }
                });
            }

            run(accessor: ServicesAccessor): void {
                // Action implementation
            }
        });
    }
}
