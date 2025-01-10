# VSCode Contribution Patterns

## Two Approaches to Contributions

| Aspect | Module Import | Class Registration |
|--------|--------------|-------------------|
| Style | `import './feature.contribution'` | `registerWorkbenchContribution(Class)` |
| Loading | Eager, at startup | Controlled by lifecycle phase |
| Dependencies | Module-level | Constructor injection |
| Granularity | Coarse (whole module) | Fine (single class) |
| Typical Use | Core features | Optional/conditional features |

## Connection to Action System

Contributions often register:
- Commands (`ICommandAction`)
- Menu items
- Keybindings
- Views

## Dependency Injection Pattern

```typescript
class MyContribution implements IWorkbenchContribution {
    constructor(
        @IActionService private actions: IActionService,
        // ... other services
    ) {
        // Register actions, commands, etc.
    }
}
```

## What Can Contributions Do?

### UI Components
| Area | Examples |
|------|----------|
| Shell | Status bar items, Activity bar entries, Panel views |
| Editor | Custom editors, Webviews, Decorations, Hover providers |
| Workbench | Welcome page content, Views, Tree providers |

### Features
| Area | Examples |
|------|----------|
| Languages | Syntax highlighting, Completions, Formatting |
| Debug/Run | Debug adapters, Task providers, Launch configs |
| Source Control | SCM providers, Change decorations |
| Search | Search providers, Quick pick contributions |

### System Integration
| Area | Examples |
|------|----------|
| Authentication | Auth providers, Token handling |
| File System | File system providers, Virtual workspaces |
| Settings | Configuration, User/workspace settings |
| Theming | Color themes, Icon themes, Product icons |

## Why Use Contributions?

1. **Modularity**: Each feature is self-contained
2. **Lifecycle Control**: Load features when needed
3. **Service Access**: Type-safe dependency injection
4. **Extension Model**: Same pattern used by extensions
