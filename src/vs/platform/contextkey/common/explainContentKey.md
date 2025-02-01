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
