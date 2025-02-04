# Context Keys in VS Code

Context keys are a powerful system in VS Code that enables context-aware behavior throughout the application. They provide a way to track state and control feature availability based on various conditions.

## Overview

Context keys are key-value pairs that can be evaluated through expressions to enable or disable features based on the current state of the application. The system consists of several key components:

1. **Context Values**: Simple key-value pairs representing state
2. **Context Expressions**: Rules for evaluating context keys
3. **Context Service**: System for managing and evaluating context
4. **Overlay System**: Mechanism for temporary context modifications

## Core Interfaces and Types

### IContextKeyService

The main service interface that manages context keys. Key capabilities:

- Create and manage context keys
- Evaluate context expressions
- Create scoped and overlay contexts

### IContext

The basic interface for accessing context values:

- `getValue<T>(key: string): T | undefined`

### RawContextKey

Used to define new context keys with metadata:

- Specifies key name and default value
- Can include type information and description
- Supports binding to context key service

### ContextKeyExpression

Represents a evaluatable condition using context keys. Types include:

- Simple: True, False, Defined
- Comparisons: Equals, NotEquals, Greater, Smaller
- Logical: And, Or, Not
- Pattern Matching: Regex, In, NotIn

## RawContextKeys

RawContextKeys serve as a bridge between VS Code's expression system and runtime context management. They provide a way to define context keys that can be used both in static expressions and for dynamic state management.

### Core Concept

A RawContextKey serves two primary purposes:

1. Provides a type-safe reference for building context expressions
2. Creates bindable keys for runtime state management

```typescript
// Define the key - usable in expressions
const hasRenameProvider = new RawContextKey<boolean>(
	"editorHasRenameProvider",
	false,
	"Whether the editor has a rename provider"
);

// Use in expressions
const canRename = ContextKeyExpr.and(
	ContextKeyExpr.has(hasRenameProvider.key),
	ContextKeyExpr.equals("editorFocus", true)
);

// Bind for runtime state management
const boundKey = hasRenameProvider.bindTo(contextKeyService);
boundKey.set(true);
```

This dual-purpose design ensures:

- Type safety across both systems
- Consistent key naming between expressions and runtime
- Clear contract between declarative rules and actual state

### Structure and Usage

RawContextKeys declare the key name, type, default value, and description:

```typescript
// Basic declaration
const editorFocus = new RawContextKey<boolean>("editorFocus", false);

// With description
const languageId = new RawContextKey<string>(
	"editorLangId",
	"",
	"The language identifier of the editor"
);

// For feature flags
const hasCompletionProvider = new RawContextKey<boolean>(
	"editorHasCompletionItemProvider",
	false,
	"Whether the editor has a completion item provider"
);
```

A RawContextKey must be bound to a context key service to be used at runtime:

```typescript
// Binding a raw context key
const boundKey = editorFocus.bindTo(contextKeyService);

// Update the value
boundKey.set(true);

// Reset to default
boundKey.reset();
```

Common patterns for RawContextKeys:

1. Feature state tracking:

```typescript
const isFeatureEnabled = new RawContextKey<boolean>("myFeature.enabled", false);
```

2. Component visibility:

```typescript
const isPanelVisible = new RawContextKey<boolean>("panel.visible", false);
```

3. Provider capability flags:

```typescript
const hasRenameProvider = new RawContextKey<boolean>(
	"editorHasRenameProvider",
	false
);
```

## Binding Keys

Context keys must be bound to a context key service to become active. There are two main approaches to binding keys:

1. Direct creation through the service:

```typescript
// Basic binding with initial value
const editorKey = contextKeyService.createKey("editorIsOpen", false);

// Binding with undefined initial value
const resourceKey = contextKeyService.createKey("resource", undefined);

// Binding with specific type
const countKey = contextKeyService.createKey<number>("itemCount", 0);
```

2. Binding a RawContextKey:

```typescript
// Define the raw key
const viewEnabledKey = new RawContextKey<boolean>("viewEnabled", false);

// Bind to service
const boundKey = viewEnabledKey.bindTo(contextKeyService);

// Update value
boundKey.set(true);
```

Common binding patterns include:

1. Scoped bindings for components:

```typescript
// Create scoped service
const scopedContext = contextKeyService.createScoped(element);

// Create scoped keys
scopedContext.createKey("viewContainer", containerId);
scopedContext.createKey("viewLocation", location);
```

2. Feature flags:

```typescript
// Create and update feature state
const featureKey = contextKeyService.createKey("myFeature.enabled", false);
featureKey.set(true);

// With type safety
const countKey = contextKeyService.createKey<number>("myFeature.count", 0);
countKey.set(5);
```

Best practices:

- Bind keys as close as possible to where they're used
- Use strong typing when available
- Clean up bindings when no longer needed
- Keep scoped contexts focused and minimal

## Overlays

Context key overlays provide a powerful way to temporarily extend or modify the context key environment. They are commonly used to enhance menus, track component state, and manage feature capabilities.

### Overview

The `createOverlay()` method creates a new context key service that inherits all keys from its parent while adding or overriding specific keys:

```typescript
createOverlay(overlay: Iterable<[string, any]>): IContextKeyService;
```

### Common Usage Patterns

#### 1. Menu Context Enhancement

Used to provide additional context for menu actions:

```typescript
const contextKeyService = this.contextKeyService.createOverlay([
	["view", viewId],
	["contextKey", contextValue],
]);

const menu = this.menuService.getMenuActions(menuId, contextKeyService);
```

#### 2. Component-Specific State

Tracks state specific to UI components:

```typescript
const contextKeyService = parentContext.createOverlay([
	["scmProvider", provider.contextValue],
	["scmProviderRootUri", provider.rootUri?.toString()],
	["scmProviderHasRootUri", !!provider.rootUri],
]);
```

#### 3. Dynamic Action Enabling

Controls availability of actions based on state:

```typescript
const contextKeyService = this.contextKeyService.createOverlay([
	["extensionHasColorThemes", hasThemes],
	["canSetLanguage", canSetLanguage],
	["isActiveLanguagePackExtension", isActiveLanguagePack],
]);
```

#### 4. Resource State Tracking

Manages state related to resources:

```typescript
const contextKeyService = baseService.createOverlay([
	["originalResourceScheme", resource.scheme],
	["resourceExtname", extname],
	["resourceFilename", filename],
]);
```

#### 5. Feature Capability Flags

Indicates available features and capabilities:

```typescript
const contextService = this.contextKeyService.createOverlay([
	[
		"hasRunnableTests",
		profiles.some((p) => p.group & TestRunProfileBitset.Run),
	],
	[
		"hasDebuggableTests",
		profiles.some((p) => p.group & TestRunProfileBitset.Debug),
	],
]);
```

### Implementation Details

Overlays are implemented efficiently:

- They maintain a reference to their parent service
- Only the overlay keys are stored in memory
- Key lookups check the overlay first, then fall back to the parent
- Changes to parent keys are automatically reflected in overlays

### Best Practices

1. Keep overlays focused and minimal
2. Use clear, namespaced key names
3. Clean up overlays when no longer needed
4. Prefer boolean values for simple flags
5. Use consistent key naming conventions

### Common Pitfalls

1. Creating deeply nested overlays
2. Not disposing overlays properly
3. Using overly generic key names
4. Storing large amounts of data in context keys

## Expression Evaluation

Context key expressions can be combined and evaluated in various ways:

```typescript
// Simple key check
contextKeyService.contextMatchesRules(ContextKeyExpr.has("editorFocus"));

// Complex condition
contextKeyService.contextMatchesRules(
	ContextKeyExpr.and(
		ContextKeyExpr.equals("language", "typescript"),
		ContextKeyExpr.not("isReadonly")
	)
);
```

### Matching Rules

Matching rules evaluate context key expressions against the current state. The `contextMatchesRules` method on the context key service performs this evaluation.

Basic rule matching:

```typescript
// Simple presence check
contextKeyService.contextMatchesRules(ContextKeyExpr.has("editorFocus"));

// Value equality
contextKeyService.contextMatchesRules(
	ContextKeyExpr.equals("languageId", "typescript")
);
```

Complex conditions use logical operators:

```typescript
// AND condition
contextKeyService.contextMatchesRules(
	ContextKeyExpr.and(
		ContextKeyExpr.has("editorFocus"),
		ContextKeyExpr.equals("languageId", "typescript"),
		ContextKeyExpr.not("isReadonly")
	)
);

// OR condition
contextKeyService.contextMatchesRules(
	ContextKeyExpr.or(
		ContextKeyExpr.equals("languageId", "typescript"),
		ContextKeyExpr.equals("languageId", "javascript")
	)
);
```

Common use cases for matching rules:

1. Command enablement:

```typescript
const canRefactor = contextKeyService.contextMatchesRules(
	ContextKeyExpr.and(
		ContextKeyExpr.has("editorFocus"),
		ContextKeyExpr.not("isReadonly")
	)
);
```

2. Menu item visibility:

```typescript
const shouldShowMenuItem = contextKeyService.contextMatchesRules(
	ContextKeyExpr.and(
		ContextKeyExpr.has("resourcePath"),
		ContextKeyExpr.equals("resourceScheme", "file")
	)
);
```

3. Feature availability checks:

```typescript
const canFormat = contextKeyService.contextMatchesRules(
	ContextKeyExpr.and(
		ContextKeyExpr.has("editorHasFormattingProvider"),
		ContextKeyExpr.not("inDiffEditor")
	)
);
```

## Common Use Cases

1. **Feature Flags**

```typescript
const isFeatureEnabled = new RawContextKey<boolean>("myFeature.enabled", false);
```

2. **UI State**

```typescript
const isPanelVisible = new RawContextKey<boolean>("panel.visible", false);
```

3. **Conditional Commands**

```typescript
const canRefactor = ContextKeyExpr.and(
	ContextKeyExpr.has("editorFocus"),
	ContextKeyExpr.equals("language", "typescript")
);
```

## Best Practices

1. Use descriptive key names with proper namespacing
2. Document context keys with clear descriptions
3. Use overlays for temporary modifications
4. Keep expressions simple and composable
5. Clean up context when no longer needed

I'll research the internal implementation of the VSCode Context Key Service, including its architecture, core components, and how it interacts with other parts of the VSCode codebase. I'll provide insights on its role in managing UI states and contextual expressions within the editor. I'll get back to you with a detailed analysis.

# VS Code Context Key Service Implementation

## Architecture and Design of the Context Key Service

The Context Key Service in VS Code provides a global **contextual state** mechanism, allowing UI elements, commands, and extensions to enable/disable functionality based on certain keys (conditions). Internally, it is built as a hierarchical service with **nested contexts**. A _context_ is essentially a set of key–value pairs (context keys and their boolean/string/etc. values) that can inherit from a parent context. The core `ContextKeyService` (the root service) maintains a map of context IDs to `Context` objects (containers of key–value data) ([vscode/src/vs/platform/contextkey/browser/contextKeyService.ts at main · microsoft/vscode · GitHub](https://github.com/Microsoft/vscode/blob/master/src/vs/platform/contextkey/browser/contextKeyService.ts#:~:text=private%20_lastContextId%3A%20number%3B)) The root context (ID `0`) is created at startup, and child contexts are created as needed for UI scopes (each gets a unique numeric ID). The **parent–child relationship** means if a key is not found in a child context, the service will consult its parent context. This allows keys to “fall back” to broader scopes ([vscode/src/vs/platform/contextkey/browser/contextKeyService.ts at main · microsoft/vscode · GitHub](https://github.com/Microsoft/vscode/blob/master/src/vs/platform/contextkey/browser/contextKeyService.ts#:~:text=public%20getValue,undefined)) For example, an editor widget may have its own context (with keys like `editorFocus`) that inherits the global context; if a key isn't set in the editor's context, the global value (if any) is used.

Each context is identified by an ID which is attached to DOM elements. When a scoped context is created for a UI element, the service sets a data attribute (e.g. `data-keybinding-context`) on the DOM node with the context ID ([vscode/src/vs/platform/contextkey/browser/contextKeyService.ts at main · microsoft/vscode · GitHub](https://github.com/Microsoft/vscode/blob/master/src/vs/platform/contextkey/browser/contextKeyService.ts#:~:text=if%20%28this._domNode.hasAttribute%28KEYBINDING_CONTEXT_ATTR%29%29%20)) This attribute allows VS Code to **find the right context** when events occur (like evaluating a menu or keybinding in that UI region). The `ScopedContextKeyService` is used for these DOM-specific contexts; it creates a new child context in the parent service and links it to the DOM node ([vscode/src/vs/platform/contextkey/browser/contextKeyService.ts at main · microsoft/vscode · GitHub](https://github.com/Microsoft/vscode/blob/master/src/vs/platform/contextkey/browser/contextKeyService.ts#:~:text=constructor%28parent%3A%20AbstractContextKeyService%2C%20domNode%3A%20IContextKeyServiceTarget%29%20)) ([vscode/src/vs/platform/contextkey/browser/contextKeyService.ts at main · microsoft/vscode · GitHub](https://github.com/Microsoft/vscode/blob/master/src/vs/platform/contextkey/browser/contextKeyService.ts#:~:text=if%20%28this._domNode.hasAttribute%28KEYBINDING_CONTEXT_ATTR%29%29%20)) All contexts ultimately chain up to the root `ContextKeyService`. There is also an `OverlayContextKeyService` for creating **overlay contexts** – ephemeral contexts layered on top of another to override certain keys (used internally for scenarios like temporary context modifications) ([vscode/src/vs/platform/contextkey/browser/contextKeyService.ts at main · microsoft/vscode · GitHub](https://github.com/Microsoft/vscode/blob/master/src/vs/platform/contextkey/browser/contextKeyService.ts#:~:text=declare%20_serviceBrand%3A%20undefined%3B)) ([vscode/src/vs/platform/contextkey/browser/contextKeyService.ts at main · microsoft/vscode · GitHub](https://github.com/Microsoft/vscode/blob/master/src/vs/platform/contextkey/browser/contextKeyService.ts#:~:text=contextMatchesRules%28rules%3A%20ContextKeyExpression%20,))

The design ensures that context key evaluations are efficient and localized. Each `Context` object stores its own key-values and a pointer to its parent ([vscode/src/vs/platform/contextkey/browser/contextKeyService.ts at main · microsoft/vscode · GitHub](https://github.com/Microsoft/vscode/blob/master/src/vs/platform/contextkey/browser/contextKeyService.ts#:~:text=public%20getValue,undefined)) When the context service evaluates an expression, it picks the appropriate `Context` (based on a target element or the current service scope) and queries keys through that context. Because of inheritance, **UI focus changes** can effectively switch the active context by changing which context ID is associated with the focused element. For example, focusing an editor causes that editor’s context to be used for evaluating `when` clauses, thereby making keys like `editorFocus` true in that scope and updating menus or keybindings accordingly.

## Key Classes and Modules Involved

**Service and Context Classes:** The Context Key Service is defined through the `IContextKeyService` interface ([vscode/contextkey.ts at dfb934c319e1392c1db1101a4774e3e6172efaea - vscode - Lance's Gitea - Raspberry Pi Instance](https://git.lance1416.com/Microsoft/vscode/src/commit/dfb934c319e1392c1db1101a4774e3e6172efaea/src/vs/platform/contextkey/common/contextkey.ts#:~:text=%60export%20interface%20IContextKeyService%20,target%3F%3A%20IContextKeyServiceTarget%29%3A%20IContextKeyService%3B)) which provides methods like `createKey`, `contextMatchesRules`, `getContext`, etc. The main implementation is the `ContextKeyService` class (in `vs/platform/contextkey/browser/contextKeyService.ts`), which extends an abstract base `AbstractContextKeyService` ([vscode/src/vs/platform/contextkey/browser/contextKeyService.ts at main · microsoft/vscode · GitHub](https://github.com/Microsoft/vscode/blob/master/src/vs/platform/contextkey/browser/contextKeyService.ts#:~:text=export%20class%20ContextKeyService%20extends%20AbstractContextKeyService,implements%20IContextKeyService)) The root service holds a map of all active `Context` instances, keyed by their context IDs ([vscode/src/vs/platform/contextkey/browser/contextKeyService.ts at main · microsoft/vscode · GitHub](https://github.com/Microsoft/vscode/blob/master/src/vs/platform/contextkey/browser/contextKeyService.ts#:~:text=private%20_lastContextId%3A%20number%3B)) The `Context` class (implementing `IContext`) represents a collection of key–value pairs with an optional parent link ([vscode/src/vs/platform/contextkey/browser/contextKeyService.ts at main · microsoft/vscode · GitHub](https://github.com/Microsoft/vscode/blob/master/src/vs/platform/contextkey/browser/contextKeyService.ts#:~:text=public%20getValue,undefined)) It provides methods to `setValue`, `removeValue`, and `getValue` for a key. Notably, `Context.getValue(key)` will recurse to the parent context if the key isn’t found, enabling the inheritance mechanism ([vscode/src/vs/platform/contextkey/browser/contextKeyService.ts at main · microsoft/vscode · GitHub](https://github.com/Microsoft/vscode/blob/master/src/vs/platform/contextkey/browser/contextKeyService.ts#:~:text=const%20ret%20%3D%20this._value)) A special `NullContext` is used as a safe no-op context when the service is disposed or a context is missing ([vscode/src/vs/platform/contextkey/browser/contextKeyService.ts at main · microsoft/vscode · GitHub](https://github.com/Microsoft/vscode/blob/master/src/vs/platform/contextkey/browser/contextKeyService.ts#:~:text=class%20NullContext%20extends%20Context%20)) ([vscode/src/vs/platform/contextkey/browser/contextKeyService.ts at main · microsoft/vscode · GitHub](https://github.com/Microsoft/vscode/blob/master/src/vs/platform/contextkey/browser/contextKeyService.ts#:~:text=))

The **scoped and overlay services** are variations of the context key service:

- `ScopedContextKeyService` represents a child context tied to a specific DOM scope. It holds a reference to its parent service and the DOM node. In its constructor, it asks the parent to create a new child context ID and then attaches that ID to the DOM element via the `data-keybinding-context` attribute ([vscode/src/vs/platform/contextkey/browser/contextKeyService.ts at main · microsoft/vscode · GitHub](https://github.com/Microsoft/vscode/blob/master/src/vs/platform/contextkey/browser/contextKeyService.ts#:~:text=constructor%28parent%3A%20AbstractContextKeyService%2C%20domNode%3A%20IContextKeyServiceTarget%29%20)) ([vscode/src/vs/platform/contextkey/browser/contextKeyService.ts at main · microsoft/vscode · GitHub](https://github.com/Microsoft/vscode/blob/master/src/vs/platform/contextkey/browser/contextKeyService.ts#:~:text=if%20%28this._domNode.hasAttribute%28KEYBINDING_CONTEXT_ATTR%29%29%20)) This class overrides methods like `getContextValuesContainer` to delegate lookups to the parent’s context map ([vscode/src/vs/platform/contextkey/browser/contextKeyService.ts at main · microsoft/vscode · GitHub](https://github.com/Microsoft/vscode/blob/master/src/vs/platform/contextkey/browser/contextKeyService.ts#:~:text=public%20getContextValuesContainer%28contextId%3A%20number%29%3A%20Context%20)) It also listens to parent context change events to re-fire them if relevant to the child (ensuring that if a parent key changes and affects the child’s context, listeners on the child service get notified) ([vscode/src/vs/platform/contextkey/browser/contextKeyService.ts at main · microsoft/vscode · GitHub](https://github.com/Microsoft/vscode/blob/master/src/vs/platform/contextkey/browser/contextKeyService.ts#:~:text=%2F%2F%20Forward%20parent%20events%20to,Parent%20will%20change)) ([vscode/src/vs/platform/contextkey/browser/contextKeyService.ts at main · microsoft/vscode · GitHub](https://github.com/Microsoft/vscode/blob/master/src/vs/platform/contextkey/browser/contextKeyService.ts#:~:text=if%20%28%21allEventKeysInContext%28e%2C%20thisContextValues%29%29%20)) When disposed, it removes the DOM attribute and deletes its context from the parent service ([vscode/src/vs/platform/contextkey/browser/contextKeyService.ts at main · microsoft/vscode · GitHub](https://github.com/Microsoft/vscode/blob/master/src/vs/platform/contextkey/browser/contextKeyService.ts#:~:text=this))
- `OverlayContextKeyService` allows layering an additional set of key overrides on top of an existing service. It wraps another service and holds a map of overlay key-values. Its `getContext` and `getContextValuesContainer` methods return a special overlay context that first checks the overlay map, then falls back to the underlying context ([vscode/src/vs/platform/contextkey/browser/contextKeyService.ts at main · microsoft/vscode · GitHub](https://github.com/Microsoft/vscode/blob/master/src/vs/platform/contextkey/browser/contextKeyService.ts#:~:text=getContext%28target%3A%20IContextKeyServiceTarget%20,)) ([vscode/src/vs/platform/contextkey/browser/contextKeyService.ts at main · microsoft/vscode · GitHub](https://github.com/Microsoft/vscode/blob/master/src/vs/platform/contextkey/browser/contextKeyService.ts#:~:text=getContextKeyValue,)) This is used internally when VS Code needs to evaluate context expressions with certain keys temporarily overridden (for example, evaluating conditions in a specific transient state).

**Context Key Handles:** When code (VS Code core or extensions) wants to work with a context key, it typically uses an `IContextKey<T>` handle. The `ContextKey<T>` class implements `IContextKey` and is a small wrapper around the service for a specific key ([vscode/src/vs/platform/contextkey/browser/contextKeyService.ts at main · microsoft/vscode · GitHub](https://github.com/Microsoft/vscode/blob/master/src/vs/platform/contextkey/browser/contextKeyService.ts#:~:text=class%20ContextKey,T%3E)) It stores the key name and default value, and provides methods: `.set(value)` to set the key’s value in the service, `.reset()` to revert to the default (or remove it if no default), and `.get()` to read the current value ([vscode/src/vs/platform/contextkey/browser/contextKeyService.ts at main · microsoft/vscode · GitHub](https://github.com/Microsoft/vscode/blob/master/src/vs/platform/contextkey/browser/contextKeyService.ts#:~:text=public%20set%28value%3A%20T%29%3A%20void%20)) ([vscode/src/vs/platform/contextkey/browser/contextKeyService.ts at main · microsoft/vscode · GitHub](https://github.com/Microsoft/vscode/blob/master/src/vs/platform/contextkey/browser/contextKeyService.ts#:~:text=public%20get%28%29%3A%20T%20,)) Internally, these just call into `IContextKeyService.setContext`, `removeContext`, or `getContextKeyValue` for that key ([vscode/src/vs/platform/contextkey/browser/contextKeyService.ts at main · microsoft/vscode · GitHub](https://github.com/Microsoft/vscode/blob/master/src/vs/platform/contextkey/browser/contextKeyService.ts#:~:text=public%20set%28value%3A%20T%29%3A%20void%20)) ([vscode/src/vs/platform/contextkey/browser/contextKeyService.ts at main · microsoft/vscode · GitHub](https://github.com/Microsoft/vscode/blob/master/src/vs/platform/contextkey/browser/contextKeyService.ts#:~:text=public%20get%28%29%3A%20T%20,)) Using `IContextKey` handles simplifies managing context keys in VS Code’s codebase (for instance, setting a bunch of related keys and disposing of them with the component).

**Declaring and Registering Keys:** VS Code defines most of its known context keys using the `RawContextKey<T>` helper. `RawContextKey` is a class extending the base context key expression type that represents a simple “key is defined” condition. It carries a default value and an optional description for the key. For example, the editor contributes keys like `editorFocus` and `textInputFocus` as `RawContextKey<boolean>` with default `false` ([vscode/src/vs/editor/common/editorContextKeys.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/editor/common/editorContextKeys.ts#:~:text=export%20const%20focus%20%3D%20new,is%20in%20the%20find%20widget)) ([vscode/src/vs/editor/common/editorContextKeys.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/editor/common/editorContextKeys.ts#:~:text=export%20const%20textInputFocus%20%3D%20new,cursor%20is%20blinking)) A `RawContextKey` can be **bound** to a service at runtime: calling `myKey = SomeRawContextKey.bindTo(contextKeyService)` creates an actual `IContextKey` handle and inserts the key with its default value into the service ([vscode/contextkey.ts at dfb934c319e1392c1db1101a4774e3e6172efaea - vscode - Lance's Gitea - Raspberry Pi Instance](https://git.lance1416.com/Microsoft/vscode/src/commit/dfb934c319e1392c1db1101a4774e3e6172efaea/src/vs/platform/contextkey/common/contextkey.ts#:~:text=%60%20public%20bindTo%28target%3A%20IContextKeyService%29%3A%20IContextKey,)) (Internally, `bindTo` calls `contextKeyService.createKey(name, defaultValue)` ([vscode/contextkey.ts at dfb934c319e1392c1db1101a4774e3e6172efaea - vscode - Lance's Gitea - Raspberry Pi Instance](https://git.lance1416.com/Microsoft/vscode/src/commit/dfb934c319e1392c1db1101a4774e3e6172efaea/src/vs/platform/contextkey/common/contextkey.ts#:~:text=%60%20public%20bindTo%28target%3A%20IContextKeyService%29%3A%20IContextKey,)) ) The VS Code codebase uses this pattern extensively. For example, in the **debug service**, keys like `debugState` and `inDebugMode` are defined as `RawContextKey`s and then bound to the global or workbench context key service on startup, so they can be updated as the debug state changes ([vscode/src/vs/workbench/contrib/debug/browser/debugService.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/contrib/debug/browser/debugService.ts#:~:text=this)) This approach also registers the keys in a global registry (`RawContextKey.all()` collects all such keys), which is used for features like the _"Inspect Context Keys"_ developer tool and Intellisense for `when` clause conditions.

**Context Key Expressions:** The logic that powers `when` clauses and context-based enablement is represented by **context key expression** objects. In the code, the abstract class `ContextKeyExpr` (sometimes referred via the alias `ContextKeyExpression`) defines the interface for these expressions. It includes static factory methods to create expressions, e.g. `ContextKeyExpr.has('key')`, `.equals('key', value)`, `.notEquals(...)`, `.and(expr1, expr2)`, `.or(...)]`, etc., which produce specific subclasses. Under the hood, there are subclasses like `ContextKeyDefinedExpr` (for “has key”/defined), `ContextKeyEqualsExpr`, `ContextKeyNotExpr`, `ContextKeyAndExpr`, `ContextKeyOrExpr`, and `ContextKeyRegexExpr` for regex matching on strings. Each expression object can be evaluated against an `IContext`. For example, `ContextKeyEqualsExpr` holds a key and a value, and its `evaluate(context)` will retrieve the key’s value from the given context and compare it to the stored value. The `ContextKeyExpr` classes also implement methods like `serialize()` (to turn back into a when-clause string) and `keys()` (to collect all key names used in the expression) for tooling purposes. These classes live in the `vs/platform/contextkey/common/contextkey.ts` module. For instance, the static method for equality is defined as: `ContextKeyExpr.equals(key, value)` which constructs a new `ContextKeyEqualsExpr` ([vscode/contextkey.ts at dfb934c319e1392c1db1101a4774e3e6172efaea - vscode - Lance's Gitea - Raspberry Pi Instance](https://git.lance1416.com/Microsoft/vscode/src/commit/dfb934c319e1392c1db1101a4774e3e6172efaea/src/vs/platform/contextkey/common/contextkey.ts#:~:text=%60%20,)) Similarly, `ContextKeyExpr.not(key)` creates a negation, and complex expressions are built via `ContextKeyExpr.and(...)` and `.or(...)` which combine other expressions. This design allows VS Code to parse string expressions from extension manifests into an expression tree once, then evaluate efficiently many times.

## Managing and Evaluating Context Keys

The Context Key Service manages context keys by providing an API to create and update them, and by automatically tracking changes. When a key’s value is set or changed, the service fires a change event so that any listeners (e.g. UI updates or menu refresh logic) can respond. For example, `IContextKeyService.setContext(key, value)` will set the key in the current context and fire an event if the value actually changed ([vscode/src/vs/platform/contextkey/browser/contextKeyService.ts at main · microsoft/vscode · GitHub](https://github.com/Microsoft/vscode/blob/master/src/vs/platform/contextkey/browser/contextKeyService.ts#:~:text=)) ([vscode/src/vs/platform/contextkey/browser/contextKeyService.ts at main · microsoft/vscode · GitHub](https://github.com/Microsoft/vscode/blob/master/src/vs/platform/contextkey/browser/contextKeyService.ts#:~:text=if%20%28myContext.setValue%28key%2C%20value%29%29%20)) Internally, setting or removing a key delegates to the `Context` object’s `setValue`/`removeValue` methods, and these return a boolean indicating if a value changed ([vscode/src/vs/platform/contextkey/browser/contextKeyService.ts at main · microsoft/vscode · GitHub](https://github.com/Microsoft/vscode/blob/master/src/vs/platform/contextkey/browser/contextKeyService.ts#:~:text=public%20setValue,boolean)) ([vscode/src/vs/platform/contextkey/browser/contextKeyService.ts at main · microsoft/vscode · GitHub](https://github.com/Microsoft/vscode/blob/master/src/vs/platform/contextkey/browser/contextKeyService.ts#:~:text=public%20removeValue%28key%3A%20string%29%3A%20boolean%20)) The service wraps multiple key updates in `bufferChangeEvents` to batch notifications when needed (to avoid intermediate events) ([vscode/src/vs/platform/contextkey/browser/contextKeyService.ts at main · microsoft/vscode · GitHub](https://github.com/Microsoft/vscode/blob/master/src/vs/platform/contextkey/browser/contextKeyService.ts#:~:text=bufferChangeEvents%28callback%3A%20Function%29%3A%20void%20)) ([vscode/src/vs/platform/contextkey/browser/contextKeyService.ts at main · microsoft/vscode · GitHub](https://github.com/Microsoft/vscode/blob/master/src/vs/platform/contextkey/browser/contextKeyService.ts#:~:text=this))

**Context Evaluation:** To determine if a context expression (when-clause) is satisfied, the service evaluates it against a specific context. The method `contextMatchesRules(rules)` is used for this. It first fetches the appropriate `Context` (by default, the service’s own context or a specific context ID) and then calls the expression’s `evaluate` method ([vscode/src/vs/platform/contextkey/browser/contextKeyService.ts at main · microsoft/vscode · GitHub](https://github.com/Microsoft/vscode/blob/master/src/vs/platform/contextkey/browser/contextKeyService.ts#:~:text=)) If no rules are given, it defaults to true (meaning no condition always passes). The expression’s `evaluate` will recursively evaluate sub-expressions and ultimately check the needed keys via `context.getValue(key)`. Since `context.getValue` will resolve through parent contexts if necessary, the expression inherently accounts for inheritance. For example, an expression `editorFocus && resourceLangId == python` will cause the service to get the current context (perhaps an editor’s context) and evaluate each part: the `editorFocus` key might be found in the editor’s own context, and `resourceLangId` (the language of the file) might be set in a parent or the same context; both must be truthy for the result to be true.

The context key expressions also support a **keys listing** function. Each expression can reveal which context keys it depends on. This is used to optimize event handling: when a context key changes, the service can quickly determine which cached menu or keybinding conditions might be affected by checking if the changed key is in the set of keys an expression cares about. For instance, VS Code’s menu service collects all context keys used by menu items’ `when` clauses so it knows which events should trigger a re-evaluation of menu visibility ([vscode/src/vs/platform/actions/common/menuService.ts at main · microsoft/vscode · GitHub](https://github.com/Microsoft/vscode/blob/master/src/vs/platform/actions/common/menuService.ts#:~:text=private%20static%20_fillInKbExprKeys%28exp%3A%20ContextKeyExpression%20,string%3E%29%3A%20void)) The expression system can also normalize and prune expressions (e.g., remove redundant clauses or combine constants) to improve performance of frequent checks.

## Interaction with Commands, Menus, and UI Components

The Context Key Service is deeply integrated with VS Code’s command and menu frameworks and overall UI state management. **Commands and Keybindings:** Many commands in VS Code have an associated **precondition** (a context key expression that must be true for the command to be enabled or active). Similarly, keybindings often include a `when` clause which is a context expression. When you press a key, the keybinding resolution logic checks the `when` clause against the current context. This is done by calling `contextKeyService.contextMatchesRules(whenExpr)` for each candidate keybinding, and only those with expressions that evaluate to true are considered active. For example, the <kbd>Ctrl+S</kbd> “Save” keybinding might have no special context (always active), whereas <kbd>F9</kbd> for “Toggle Breakpoint” might require `editorTextFocus && inDebugMode` to be true. The context service provides the current UI context, so the keybinding service can evaluate these conditions on the fly. If the active editor or focus changes, the context keys (like `editorTextFocus`) update, and keybinding enablement shifts accordingly.

**Menus and UI Visibility:** VS Code’s menus (like the editor context menu, the top menu bar, view title menus, etc.) and view components use context keys to show or hide UI elements. The menu registry associates each menu item with a `when` expression. When the menu is rendered, VS Code evaluates each item’s expression against the relevant context. For instance, when you right-click in a text editor, the editor’s `ScopedContextKeyService` is passed to the menu so that context-specific keys (e.g. `editorLangId` for the language, or `textSelected`) influence which menu items appear. In the menu creation code, we see that it iterates over all items and includes an item only if `contextKeyService.contextMatchesRules(item.when)` returns true ([vscode/src/vs/platform/actions/common/menuService.ts at main · microsoft/vscode · GitHub](https://github.com/Microsoft/vscode/blob/master/src/vs/platform/actions/common/menuService.ts#:~:text=for%20,)) Submenus propagate the context as well. This is how, for example, the _Source Control_ view’s context menu can have commands that only show when a single file is selected (`scmResourceSelected` context) or multiple files are selected (`scmResourceMultipleSelected`), etc. The moment the selection changes, those context keys are updated and the menu will respond (if it's open, it can update dynamically; if reopened, the new context is applied).

Various UI components update context keys to reflect their state. When an editor gains focus, the editor’s implementation will set `editorFocus` and `textInputFocus` keys to `true` for that editor’s context, and likely ensure the global `textInputFocus` is true as well (since _some_ editor/input is focused) while other contexts might set their `editorFocus` to false. Similarly, when you switch active editor, VS Code might update a `activeEditorIsDirty` context key or `editorLangId` to match the new file’s language. These keys are declared via `RawContextKey` in their respective modules (e.g., `EditorContextKeys` for editor-related contexts ([vscode/src/vs/editor/common/editorContextKeys.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/editor/common/editorContextKeys.ts#:~:text=export%20const%20focus%20%3D%20new,is%20in%20the%20find%20widget)) ([vscode/src/vs/editor/common/editorContextKeys.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/editor/common/editorContextKeys.ts#:~:text=export%20const%20textInputFocus%20%3D%20new,cursor%20is%20blinking)) and are toggled in code. For instance, the Explorer (file tree) view sets keys like `explorerResourceIsFolder` or `explorerResourceCut` depending on the selected item and cut/copy state; the Debug view sets `inDebugMode`, `debugState` (with values like `running` or `stopped`), etc., as the debug session starts/stops ([vscode/src/vs/workbench/contrib/debug/browser/debugService.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/contrib/debug/browser/debugService.ts#:~:text=this)) All these changes feed back into the Context Key Service, which then fires events. Listeners in the menu and command system (and extension listeners, if any) can react, enabling or disabling UI elements accordingly.

Even **UI styling or behavior** can hinge on context keys. A notable example is the **Zen Mode** or **Full Screen** toggles which set context keys that hide certain UI elements. Also, the **“inline suggestion”** feature might set a context key when an inline completion is showing, so that keybindings like “Accept Inline Suggestion” only work when relevant. Essentially, any VS Code component that needs to expose a state to the rest of the system (to conditionally display commands, keybindings, etc.) will use the context key service – defining a RawContextKey, binding it, and updating it on state changes.

Finally, the Context Key Service provides introspection utilities. The Developer command **“Inspect Context Keys”** uses the service to retrieve all current key values at the point in the UI you click, which is done by obtaining the context (`contextKeyService.getContext(domElement)`) and then reading all values (there’s even a helper to collect all values from a context including parents) ([vscode/src/vs/platform/contextkey/browser/contextKeyService.ts at main · microsoft/vscode · GitHub](https://github.com/Microsoft/vscode/blob/master/src/vs/platform/contextkey/browser/contextKeyService.ts#:~:text=public%20collectAllValues%28%29%3A%20Record)) Additionally, there’s an internal command `'getContextKeyInfo'` which returns metadata about all known context keys (leveraging the `RawContextKey.all()` registry) ([vscode/src/vs/platform/contextkey/browser/contextKeyService.ts at main · microsoft/vscode · GitHub](https://github.com/Microsoft/vscode/blob/master/src/vs/platform/contextkey/browser/contextKeyService.ts#:~:text=CommandsRegistry.registerCommand%28)) – this is used to power suggestions in the keybindings editor and documentation generation for context keys.

## Extension Interaction and Modification of Context Keys

Extensions can both **use** and **alter** context keys, albeit in controlled ways. They primarily interact with the Context Key Service through the VS Code API in two forms:

- **Contributing `when` Expressions:** In their `package.json` extension manifests, extensions can specify context conditions for where their contributions appear. For example, an extension can contribute a command to a menu with a `"when": "editorLangId == python"` to show it only for Python files. These strings are parsed by VS Code into `ContextKeyExpr` objects and integrated with the same system described above. Extensions don’t directly create those objects in code – VS Code’s internals handle that during activation. But effectively, when an extension uses a context key in a `when` clause, it is tapping into the context key service’s state. If the extension references a key that VS Code itself doesn’t set, that key will simply be absent (treated as false/undefined) unless the extension sets it programmatically.

- **Setting Context Keys:** Extensions can programmatically set their own context keys or existing ones using the `vscode.commands.executeCommand('setContext', key, value)` API. This invokes an internal command that calls the context key service’s `setContext` under the hood. In the VS Code source, the `'setContext'` command is registered to a handler that does `contextKeyService.createKey(String(key), value)` ([vscode/src/vs/platform/contextkey/browser/contextKeyService.ts at main · microsoft/vscode · GitHub](https://github.com/Microsoft/vscode/blob/master/src/vs/platform/contextkey/browser/contextKeyService.ts#:~:text=export%20function%20setContext,)) This either initializes a new key or updates the existing key’s value in the **global context** (the extension host can only affect the global/workbench-level context). For example, an extension might call `setContext('myExtension.hasData', true)` – this will create a context key `myExtension.hasData` and set it to true globally, which can then be used in any `when` clause (extension’s own menus or even user keybindings). Extensions commonly use this to indicate modes or states (e.g., an extension sets `hasActiveSession=true` when it’s connected to a remote service, so that its commands are enabled only in that state).

It’s important to note that extensions do not get direct access to read context key values (there is no official `getContext` API for extensions). They are expected to design their features such that they track the state in their own code and reflect it via context keys for VS Code to use in UI logic. The separation ensures that context keys remain a write-mostly reactive mechanism for extensions. However, for debugging or advanced scenarios, an extension can call the `'getContextKeyInfo'` command (or use the Inspect Context Keys UI) to list known keys and their states, which is more for development insight than routine logic.

Extensions **cannot override VS Code’s internal context key service** or create entirely new scoped services – they work within the bounds provided. The keys they set via `setContext` go into the global context of the workbench (accessible anywhere unless overridden by a more specific context in focus). If an extension contributes a UI element that has its own DOM and context (like a webview or a custom tree view), VS Code might give that component a scoped context key service (for instance, tree views get a context key service to manage selection keys like `viewItem` contexts). The extension itself would use the extension API (like the TreeView API) to indirectly specify context values for selection. Those APIs internally call into the context key service on behalf of the extension.

In summary, extensions leverage the Context Key Service by defining new keys (via `setContext`) and using context expressions in their contributions, but they do not directly manipulate the service beyond setting keys. The Context Key Service acts as the broker – it evaluates all these conditions (both extension and built-in) uniformly. Thanks to the references of context keys defined throughout the VS Code codebase (via `RawContextKey` and others), extension authors can often tie into existing context keys (for example, using `resourceLangId` or `isFolder` in their `when` clauses) or define their own for custom behaviors. All these become part of the context data that VS Code manages and uses to provide a dynamic, context-aware experience ([vscode/src/vs/platform/contextkey/browser/contextKeyService.ts at main · microsoft/vscode · GitHub](https://github.com/Microsoft/vscode/blob/master/src/vs/platform/contextkey/browser/contextKeyService.ts#:~:text=export%20function%20setContext,))

**References:** The implementation details are based on the VS Code source, primarily the context key service module ([vscode/src/vs/platform/contextkey/browser/contextKeyService.ts at main · microsoft/vscode · GitHub](https://github.com/Microsoft/vscode/blob/master/src/vs/platform/contextkey/browser/contextKeyService.ts#:~:text=)) ([vscode/src/vs/platform/contextkey/browser/contextKeyService.ts at main · microsoft/vscode · GitHub](https://github.com/Microsoft/vscode/blob/master/src/vs/platform/contextkey/browser/contextKeyService.ts#:~:text=)) menu service integration ([vscode/src/vs/platform/actions/common/menuService.ts at main · microsoft/vscode · GitHub](https://github.com/Microsoft/vscode/blob/master/src/vs/platform/actions/common/menuService.ts#:~:text=for%20,)) and context key definitions in the codebase ([vscode/src/vs/editor/common/editorContextKeys.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/editor/common/editorContextKeys.ts#:~:text=export%20const%20focus%20%3D%20new,is%20in%20the%20find%20widget)) as well as how the `'setContext'` command connects extensions to this service ([vscode/src/vs/platform/contextkey/browser/contextKeyService.ts at main · microsoft/vscode · GitHub](https://github.com/Microsoft/vscode/blob/master/src/vs/platform/contextkey/browser/contextKeyService.ts#:~:text=export%20function%20setContext,)) These show how context keys are created, evaluated, and leveraged across VS Code’s subsystems.
