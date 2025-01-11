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


#### Built in contributions

| ID                                             | Description                                                                 |
|------------------------------------------------|-----------------------------------------------------------------------------|
| extensionUrlBootstrapHandler                   | Handles URL bootstrapping for extensions.                                   |
| textInputActionsProvider                       | Provides text input actions like undo, redo, cut, copy, paste, and select all. |
| editorAutoSave                                 | Manages auto-save functionality for editors based on various conditions.    |
| editorStatus                                   | Manages editor status information and context keys.                         |
| untitledTextEditorWorkingCopyEditorHandler     | Handles untitled text editor working copies.                               |
| dynamicEditorConfigurations                    | Dynamically updates editor configurations based on registered editors.      |
| textMateTokenizationInstantiator               | Instantiates TextMate tokenization service.                                |
| treeSitterTokenizationInstantiator             | Instantiates TreeSitter tokenization service.                              |
| notebookChatContribution                       | Manages chat interactions within notebooks.                                |
| notebookClipboard                              | Provides clipboard functionalities for notebooks.                          |
| notebookMultiCursorUndoRedo                    | Manages multi-cursor undo/redo operations in notebooks.                     |
| markerListProvider                             | Provides marker list functionalities.                                      |
| notebookUndoRedo                               | Manages undo/redo operations in notebooks.                                  |
| notebookEditorManager                          | Manages notebook editors and handles conflicts.                            |
| notebookLanguageSelectorScoreRefine            | Refines notebook language selector scores.                                 |
| simpleNotebookWorkingCopyEditorHandler         | Handles simple notebook working copies.                                    |
| toolsExtensionPointHandler                     | Manages tool extension points for language model services.                 |
| chat.commandCenterRendering                    | Renders chat commands in the command center.                               |
| chat.autoSaveDisabler                          | Disables auto-save for chat editors.                                       |
| chat.setup                                     | Sets up chat features and configurations.                                  |
| interactiveDocument                            | Manages interactive documents and their editors.                           |
| replWorkingCopyEditorHandler                   | Handles REPL (Read-Eval-Print Loop) working copies.                        |
| replDocument                                   | Manages REPL document contributions.                                       |
| fileEditorWorkingCopyEditorHandler             | Handles file editor working copies.                                        |
| bulkEditPreview                                | Provides preview functionality for bulk edits.                             |
| searchEditorWorkingCopyEditorHandler           | Handles search editor working copies.                                      |
| comments.input.contentProvider                 | Provides content for comment inputs.                                       |
| trustedDomainsFileSystemProvider               | Manages trusted domains file system provider.                              |
| externalUriResolver                            | Resolves external URIs.                                                    |
| showPortCandidate                              | Shows port candidates for tunnels.                                         |
| tunnelFactory                                  | Manages tunnel creation and privacy options.                               |
| editorFeaturesInstantiator                     | Instantiates editor features when needed.                                  |
| startupPageEditorResolver                      | Resolves startup page editor inputs.                                       |
| userDataProfiles                               | Manages user data profiles and related actions.                            |
| localHistoryTimeline                           | Manages local history timeline for files.                                  |
| workspaceTrustRequestHandler                   | Handles workspace trust requests and prompts.                              |
| accessibilityStatus                            | Manages accessibility status and notifications.                            |
| extensionAccessibilityHelpDialogContribution   | Provides accessibility help dialogs for extensions.                       |
| updateExperimentalSettingsDefaults             | Updates experimental settings defaults based on experiments.               |
| nativeRemoteConnectionFailureNotification      | Notifies users of remote connection failures.                              |
| remoteTelemetryEnablementUpdater               | Updates telemetry enablement for remote environments.                      |
| remoteEmptyWorkbenchPresentation               | Manages presentation of an empty workbench in remote environments.         |
