# VSCode's Disposable System Explained

The disposable system is a core part of VSCode's resource management, ensuring proper cleanup of resources like event listeners, file handles, and UI components. This document explains the key concepts and patterns with examples from the codebase.

## 1. Core Interface: IDisposable

The foundation of the system is the `IDisposable` interface, which defines a contract for cleanup operations:

```typescript
export interface IDisposable {
	dispose(): void;
}
```

Any object that needs cleanup implements this interface. The `dispose()` method is called when the object needs to clean up its resources.

## 2. Base Implementation: Disposable Class

The abstract `Disposable` class provides a base implementation with built-in tracking:

```typescript
export abstract class Disposable implements IDisposable {
	protected readonly _store = new DisposableStore();

	constructor() {
		trackDisposable(this);
		setParentOfDisposable(this._store, this);
	}

	dispose(): void {
		markAsDisposed(this);
		this._store.dispose();
	}
}
```

### Example Usage from VSCode's Editor

```typescript
export class InlineCompletionsView extends Disposable {
	private readonly _ghostTexts = derived(this, (reader) => {
		const model = this._model.read(reader);
		return model?.ghostTexts.read(reader) ?? [];
	});

	constructor(editor: ICodeEditor, model: IObservable<Model>) {
		super();
		// Resources added to _store are automatically cleaned up
		this._store.add(editor.onDidChangeModel(() => this.update()));
	}
}
```

## 3. Resource Collection: DisposableStore

`DisposableStore` manages collections of disposables, ensuring they're all cleaned up properly.

### Key Features

- Tracks multiple disposables
- Ensures proper cleanup order
- Prevents memory leaks
- Supports parent-child relationships

### Example from VSCode's EditorState

```typescript
export class EditorState {
	private readonly _disposables = new DisposableStore();

	constructor(editorService: ICodeEditorService) {
		// Add multiple disposables that will be cleaned up together
		this._disposables.add(
			editorService.onCodeEditorRemove(this._onDidRemoveEditor, this)
		);
		this._disposables.add(
			editorService.onCodeEditorAdd(this._onDidAddEditor, this)
		);
	}

	dispose(): void {
		this._disposables.dispose();
	}
}
```

## 4. Advanced Patterns

### Reference Counting with RefCountedDisposable

For resources shared between multiple consumers:

```typescript
export class RefCountedDisposable {
	private _counter: number = 1;

	constructor(private readonly _disposable: IDisposable) {}

	acquire() {
		this._counter++;
		return this;
	}
	release() {
		if (--this._counter === 0) {
			this._disposable.dispose();
		}
		return this;
	}
}
```

### Mutable Disposables

For disposables that change over time:

```typescript
class MutableDisposable<T extends IDisposable> implements IDisposable {
	private _value?: T;

	set value(value: T | undefined) {
		if (this._value) {
			this._value.dispose();
		}
		this._value = value;
	}
}
```

## 5. Memory Leak Detection

The system includes sophisticated leak detection through `DisposableTracker`:

- Tracks all living disposables
- Records creation stack traces
- Detects objects that aren't properly disposed
- Provides detailed leak reports

### Example Leak Report

```
Leaking disposable MyWidget:
Created at:
  createWidget (widget.ts:45)
  initializeUI (app.ts:123)
Parent chain:
  MainWindow
  Sidebar
  MyWidget
```

## 6. Architectural Patterns & Design Philosophy

The disposable system's architecture reveals several key design principles:

### Parent-Child Relationships

The parent-child tracking isn't just about cleanup order - it serves multiple purposes:

1. **Ownership Tracking**: Clear indication of who owns what resources
2. **Leak Detection**: If a parent is disposed but a child isn't, it's likely a leak
3. **Debugging Support**: Stack traces show the ownership chain
4. **Lifecycle Management**: Children are automatically cleaned up with parents

### Multiple Tracking Strategies

VSCode employs two complementary tracking approaches:

1. **Manual Tracking** (`DisposableTracker`):

   - Maintains explicit parent-child relationships
   - Records creation stack traces
   - Provides detailed leak reports with ownership chains
   - Useful for development and debugging

2. **GC-Based Tracking** (`GCBasedDisposableTracker`):

   ```typescript
   class GCBasedDisposableTracker implements IDisposableTracker {
   	private readonly _registry = new FinalizationRegistry<string>(
   		(heldValue) => {
   			console.warn(`[LEAKED DISPOSABLE] ${heldValue}`);
   		}
   	);

   	trackDisposable(disposable: IDisposable): void {
   		const stack = new Error("CREATED via:").stack!;
   		this._registry.register(disposable, stack, disposable);
   	}
   }
   ```

   - Uses JavaScript's garbage collection
   - Detects objects that are GC'd without being disposed
   - Provides last-resort leak detection
   - Works in production environments

### Design Goals

1. **Debuggability First**: The system prioritizes debugging and development experience
2. **Multiple Safety Nets**: Combines manual tracking, GC tracking, and runtime checks
3. **Clear Ownership**: Every disposable should have a clear owner
4. **Fail-Fast**: Issues are detected and reported as early as possible

## 7. Event Handling Integration

The disposable system integrates deeply with VSCode's event handling system. Here are the key patterns:

### Event Subscription Management

Event subscriptions are treated as disposables:

```typescript
class MyWidget extends Disposable {
	constructor() {
		super();

		// Event subscription is automatically cleaned up
		this._register(
			editor.onKeyDown((e) => {
				this.handleKeyDown(e);
			})
		);
	}
}
```

### Event Emitter Lifecycle

Event emitters are also disposables:

```typescript
class ViewModelEventDispatcher extends Disposable {
	private readonly _onEvent = this._register(new Emitter<ViewModelEvent>());
	public readonly onEvent = this._onEvent.event;
}
```

### Event Handler Registration

Event handlers can be registered and unregistered using the disposable pattern:

```typescript
class EditorMouseEventFactory {
	onMouseDown(
		target: HTMLElement,
		callback: (e: EditorMouseEvent) => void
	): IDisposable {
		const listener = (e: MouseEvent) => callback(this._create(e));
		target.addEventListener("mousedown", listener);
		return toDisposable(() =>
			target.removeEventListener("mousedown", listener)
		);
	}
}
```

### Benefits of This Integration

1. **Automatic Cleanup**: Event listeners are automatically removed when their parent is disposed
2. **Memory Leak Prevention**: No dangling event handlers
3. **Clear Ownership**: Event handlers are tied to their parent's lifecycle
4. **Composability**: Event handling and resource management work together seamlessly

## 8. Advanced Patterns & Specialized Classes

VSCode provides several specialized disposable classes for advanced use cases:

### MutableDisposable

For values that change over time:

```typescript
class MutableDisposable<T extends IDisposable> implements IDisposable {
	private _value?: T;

	set value(value: T | undefined) {
		if (this._isDisposed || value === this._value) {
			return;
		}
		this._value?.dispose();
		if (value) {
			setParentOfDisposable(value, this);
		}
		this._value = value;
	}
}
```

Use cases:

- Managing replaceable components
- Swapping out event listeners
- Updating configuration objects

### RefCountedDisposable

For resources shared between multiple consumers:

```typescript
class RefCountedDisposable {
	private _counter: number = 1;

	acquire() {
		this._counter++;
		return this;
	}

	release() {
		if (--this._counter === 0) {
			this._disposable.dispose();
		}
		return this;
	}
}
```

Use cases:

- Shared resources
- Pooled objects
- Caching systems

### DisposableMap

For managing collections of disposables:

```typescript
class DisposableMap<K, V extends IDisposable> implements IDisposable {
	private readonly _store = new Map<K, V>();

	set(key: K, value: V) {
		this._store.get(key)?.dispose();
		this._store.set(key, value);
	}

	dispose() {
		this._store.forEach((value) => value.dispose());
		this._store.clear();
	}
}
```

Use cases:

- Caching with cleanup
- Managing multiple instances
- Key-value resource management

### SafeDisposable

For breaking circular references:

```typescript
class SafeDisposable implements IDisposable {
	set(fn: Function) {
		this.dispose = () => fn();
		this.unset = () => (this.dispose = () => {});
		this.isSet = () => true;
	}

	unset() {
		this.dispose = () => {};
		this.unset = () => {};
		this.isSet = () => false;
	}
}
```

Use cases:

- Breaking reference cycles
- Conditional cleanup
- Dynamic disposal logic

### Best Practices for Advanced Patterns

1. **Choose the Right Tool**:

   - Use `MutableDisposable` for values that change
   - Use `RefCountedDisposable` for shared resources
   - Use `DisposableMap` for keyed collections
   - Use `SafeDisposable` for circular references

2. **Handle Edge Cases**:

   - Check disposal state before operations
   - Handle race conditions in async code
   - Consider thread safety in worker contexts

3. **Monitor Resource Usage**:
   - Track reference counts
   - Log disposal patterns
   - Watch for memory leaks

## DisposableStore Usage Patterns

A `DisposableStore` is a container for a collection of disposables that should be disposed together. It is particularly useful in scenarios where you need to manage multiple disposables that share the same lifecycle.

### When to Create a DisposableStore

1. **Component Lifecycle Management**

   - When a component needs to track multiple event listeners, subscriptions, or other disposables
   - When all disposables should be cleaned up together when the component is disposed

   ```typescript
   class MyComponent extends Disposable {
   	private readonly _store = new DisposableStore();

   	constructor() {
   		super();
   		// Store will be disposed when component is disposed
   		this._register(this._store);
   	}
   }
   ```

2. **Scoped Operations**

   - When performing operations that create temporary disposables
   - When all disposables should be cleaned up after the operation completes

   ```typescript
   function performOperation() {
   	const store = new DisposableStore();
   	try {
   		// Add disposables to store
   		store.add(someDisposable);
   		// Perform operation
   	} finally {
   		store.dispose();
   	}
   }
   ```

3. **Feature-Specific Resources**

   - When a feature or subsystem manages its own set of disposables
   - When the feature can be enabled/disabled independently

   ```typescript
   class Feature {
   	private readonly _featureDisposables = new DisposableStore();

   	enable() {
   		// Add feature-specific disposables
   		this._featureDisposables.add(/*...*/);
   	}

   	disable() {
   		this._featureDisposables.dispose();
   	}
   }
   ```

4. **Event Handler Groups**

   - When multiple event handlers need to be registered and unregistered together
   - When handlers are temporary and should be cleaned up as a group

   ```typescript
   function setupHandlers(element: HTMLElement) {
   	const handlers = new DisposableStore();
   	handlers.add(addDisposableListener(element, "click" /*...*/));
   	handlers.add(addDisposableListener(element, "mouseover" /*...*/));
   	return handlers; // Caller can dispose all handlers at once
   }
   ```

5. **Overlays and UI Components**
   - When showing temporary UI elements that need cleanup
   - When managing multiple UI-related disposables
   ```typescript
   function showOverlay() {
   	const overlay = new DisposableStore();
   	overlay.add(createOverlayElement());
   	overlay.add(registerKeyBindings());
   	return overlay; // Dispose to clean up overlay
   }
   ```

### Best Practices

1. **Registration Pattern**

   - Always register the store if it belongs to a Disposable class
   - Use `this._register(store)` to ensure proper cleanup

   ```typescript
   class Component extends Disposable {
   	private readonly _store = this._register(new DisposableStore());
   }
   ```

2. **Scoping**

   - Create stores at the appropriate scope level
   - Prefer multiple focused stores over one large store

   ```typescript
   class Component {
   	private readonly _baseDisposables = new DisposableStore();
   	private readonly _featureDisposables = new DisposableStore();
   }
   ```

3. **Cleanup**

   - Always dispose stores in finally blocks or cleanup methods
   - Clear stores when features are disabled/reset

   ```typescript
   try {
   	const store = new DisposableStore();
   	// Use store
   } finally {
   	store.dispose();
   }
   ```

4. **Temporary Resources**
   - Use stores for managing temporary resources
   - Dispose immediately when the resources are no longer needed
   ```typescript
   async function showTemporaryUI() {
   	const store = new DisposableStore();
   	try {
   		// Show UI, register handlers
   		await someOperation();
   	} finally {
   		store.dispose(); // Clean up UI and handlers
   	}
   }
   ```

### Anti-patterns to Avoid

1. **Don't mix lifecycles**

   - Don't put disposables with different lifecycles in the same store
   - Create separate stores for different lifecycle boundaries

2. **Don't leak stores**

   - Don't return stores without ensuring they will be disposed
   - Don't store references to stores that should be temporary

3. **Don't reuse disposed stores**
   - Once disposed, create a new store if needed
   - Don't add disposables to a disposed store

## Best Practices

1. **Always extend Disposable or implement IDisposable** when creating classes that manage resources

2. **Use DisposableStore to manage groups of disposables**:

   ```typescript
   class MyComponent extends Disposable {
   	private readonly _store = new DisposableStore();

   	constructor() {
   		super();
   		this._store.add(someEventListener);
   		this._store.add(anotherResource);
   	}
   }
   ```

3. **Always call dispose()** when you're done with a resource

4. **Use MutableDisposable** for resources that change over time

5. **Consider RefCountedDisposable** for shared resources

6. **Pay attention to leak warnings** in the debug console

## Common Pitfalls to Avoid

1. **Forgetting to call super()** when extending Disposable
2. **Not disposing of event listeners** added to external objects
3. **Creating circular disposal dependencies**
4. **Accessing disposed objects** after they've been cleaned up
5. **Not cleaning up resources** in error cases

## Debugging Tips

1. Enable the disposable tracker in development:

   ```typescript
   // Use manual tracking for detailed reports
   setDisposableTracker(new DisposableTracker());

   // Or use GC-based tracking for leak detection
   setDisposableTracker(new GCBasedDisposableTracker());
   ```

2. Watch for warnings in the console:

   - `[LEAKED DISPOSABLE]` warnings from GC tracker
   - Detailed leak reports from manual tracker

3. Use the `markAsSingleton()` function for objects that intentionally live for the entire session

4. Check the disposal state before accessing potentially disposed objects:

   ```typescript
   if (!this.isDisposed) {
   	// safe to use
   }
   ```

5. Use the debug console to inspect parent-child relationships:
   ```typescript
   // Get all tracked disposables
   const tracker = new DisposableTracker();
   const leaks = tracker.getTrackedDisposables();
   ```

Got it! I’ll conduct deep research into the `Disposable` system inside VS Code, focusing on what a developer forking the project needs to know to work with it efficiently. I'll cover common usage patterns, best practices, and pitfalls, ensuring that both high-level and subtle aspects are considered.

I’ll let you know when the research is ready.

# Understanding the Disposable System in VS Code

Visual Studio Code’s **Disposable** system provides a consistent pattern for managing the lifecycle of resources (event listeners, timers, etc.) that need explicit cleanup. When forking or modifying VS Code’s codebase, understanding this system is crucial to avoid memory leaks and ensure proper resource management. This guide breaks down the key aspects of VS Code’s Disposable pattern and offers best practices, common pitfalls, code examples from the VS Code repository, and comparisons to other frameworks’ lifecycle management.

## Overview of the Disposable System

**What is a Disposable?** In VS Code, a _Disposable_ is an object with a `dispose()` method that releases resources it holds. For example, disposing might unregister an event listener or stop a timer. The VS Code API defines `Disposable` as a class representing “a type which can release resources, such as event listening or a timer” ([src\vs\vscode.d.ts · GitHub](https://gist.github.com/samueleresca/05293edadcb9e9373f97052f5467d060#:~:text=%2F,export%20class%20Disposable)) In the VS Code codebase, `IDisposable` is a simple interface with a `dispose(): void` signature, and many components implement or use this interface to clean up resources.

**The role of `Disposable` in lifecycle management:** VS Code is a long-running application, so simply relying on JavaScript’s garbage collector is not enough for certain resources. The Disposable pattern lets developers deterministically tear down listeners, UI components, and other objects when they are no longer needed. This helps prevent memory leaks and unintended side-effects. For example, when an editor pane is closed, any listeners or timers associated with that editor should be disposed to free memory and avoid callbacks to destroyed objects.

**The `Disposable` base class:** To simplify disposable management, VS Code provides an abstract base class `Disposable` (in `vs/base/common/lifecycle.ts`). This class implements `IDisposable` and internally tracks a collection of disposables. Subclasses can register child disposables via a protected `_register` method. When the parent is disposed, it will automatically dispose all registered children ([vscode/src/vs/base/common/lifecycle.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/base/common/lifecycle.ts#:~:text=,link%20IDisposable%20disposable%7D%20object)) ([vscode/src/vs/base/common/lifecycle.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/base/common/lifecycle.ts#:~:text=,disposables%20managed%20by%20this%20object)) In other words, `Disposable` acts as a container for other disposables, easing the burden of manually disposing each one.

**Common usage patterns:** There are two primary patterns to use the Disposable system in VS Code’s codebase:

- **Inherit from `Disposable`:** Classes that manage multiple disposable resources often extend the `Disposable` base class. In the constructor, they call `super()`, and as they create child disposables (like event emitters, subscriptions, etc.), they add them via `this._register(...)`. For example, VS Code’s `Action` class (for menu/toolbar actions) extends `Disposable` and registers an event emitter for when the action changes ([vscode 源码解析（四） - 事件系统\_vscode 源码-CSDN 博客](https://blog.csdn.net/zhugangsong/article/details/136620524#:~:text=export%20class%20Action%20extends%20Disposable,this._label%20%3D%20value)) Many UI components and services (e.g., editors, views, providers) follow this pattern. Disposing the parent will dispose all `_register`ed children automatically.

- **Use a `DisposableStore`:** For cases where a class cannot easily extend `Disposable` (perhaps it already extends another base class), VS Code provides `DisposableStore` (a disposable collection) to manage a set of disposables. A `DisposableStore` has an `.add()` method to collect disposables and a `.dispose()` method to dispose them all. It’s a utility that can be used compositionally. Under the hood, the `Disposable` base class actually contains a `DisposableStore` (accessible via `this._store`) to implement its functionality ([vscode/src/vs/base/common/lifecycle.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/base/common/lifecycle.ts#:~:text=protected%20readonly%20_store%20%3D%20new,DisposableStore)) ([vscode/src/vs/base/common/lifecycle.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/base/common/lifecycle.ts#:~:text=public%20dispose%28%29%3A%20void%20))

- **Single-use disposables:** Sometimes a function or one-off operation returns a `Disposable` (or `IDisposable`) that cleans up a single resource. For example, event subscription methods often return an `IDisposable` which, when disposed, removes the event listener. VS Code also provides helpers like `Disposable.from(...disposables)` in the API (or `combinedDisposable(...disposables)` internally) to combine multiple disposables into one ([src\vs\vscode.d.ts · GitHub](https://gist.github.com/samueleresca/05293edadcb9e9373f97052f5467d060#:~:text=%2F%2A%2A%20%2A%20Combine%20many%20disposable,dispose%20all%20provided%20disposables)) ([vscode/src/vs/base/common/lifecycle.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/base/common/lifecycle.ts#:~:text=%2F)) and `toDisposable(fn)` to create a `Disposable` from an arbitrary cleanup function ([vscode/src/vs/base/common/lifecycle.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/base/common/lifecycle.ts#:~:text=,once)) ([vscode/src/vs/base/common/lifecycle.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/base/common/lifecycle.ts#:~:text=markAsDisposed)) These are useful for ad-hoc scenarios (e.g., wrapping a DOM event unregistration in a disposable).

**Lifecycle in practice:** The Disposable pattern typically works like this: when a component is created, it registers any resources that need cleanup (event listeners, timers, child objects, etc.) with a Disposable container (either itself via `_register` if it extends `Disposable`, or a `DisposableStore`). When the component is disposed (e.g., the editor or panel is closed, or the extension host shuts down a feature), its `dispose()` method is called, which in turn calls `dispose()` on all registered disposables. Each of those disposables will free their resources, resulting in a clean teardown of the component’s internals. The base class `Disposable.dispose()` implementation takes care of iterating and disposing all children ([vscode/src/vs/base/common/lifecycle.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/base/common/lifecycle.ts#:~:text=public%20dispose%28%29%3A%20void%20)) so subclass implementers usually just call `super.dispose()` unless they have extra steps.

## Best Practices for Working with Disposables

When modifying or extending VS Code’s code, following these best practices will help maintain a healthy lifecycle and avoid leaks:

- **Extend `Disposable` for resource-managing classes:** If your new class will hold onto any disposables (e.g. event subscriptions, timers, child components), have it `extends Disposable`. This gives your class a built-in `_register` method to easily track disposables. For example, VS Code moved many classes to inherit `Disposable` to centralize lifecycle logic ([Review places where we use `IDisposable[]` in the code · Issue #74250 · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/issues/74250#:~:text=The%20repeated%20code%20is%20what,not%20disposing%20of%20objects%20properly)) By doing so, disposing the parent class automatically cleans up its children, which is less error-prone than manual disposal tracking.

- **Use `_register` to manage child disposables:** Rather than storing disposables in an array or manually disposing each one, always use `this._register(childDisposable)`. This adds the child to an internal store. The pattern is illustrated in many places in VS Code’s source. For instance, the `Action` class creates an `_onDidChange` event emitter and registers it in one line: `protected _onDidChange = this._register(new Emitter<IActionChangeEvent>());` ([vscode 源码解析（四） - 事件系统\_vscode 源码-CSDN 博客](https://blog.csdn.net/zhugangsong/article/details/136620524#:~:text=export%20class%20Action%20extends%20Disposable,this._label%20%3D%20value)) Similarly, a UI class that listens to an action’s change event would register the listener: `this._register(action.onDidChange(e => { … }));` ([vscode 源码解析（四） - 事件系统\_vscode 源码-CSDN 博客](https://blog.csdn.net/zhugangsong/article/details/136620524#:~:text=export%20class%20BaseActionViewItem%20extends%20Disposable,)) Using `_register` consistently ensures you don’t forget any disposables – they’ll all be tied to the object’s lifecycle.

- **Leverage `DisposableStore` for composition:** If you can’t use inheritance (perhaps your class already extends another base), use a `DisposableStore`. Create a `this._disposables = new DisposableStore()` property and call `this._disposables.add(...)` for each disposable resource. Then call `this._disposables.dispose()` in your class’s dispose method. The DisposableStore will take care of disposing all registered items. Importantly, `DisposableStore` is designed to be safe in edge cases: once disposed, adding a new disposable will immediately dispose that item and warn you (to help catch logical errors) ([vscode/src/vs/base/common/lifecycle.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/base/common/lifecycle.ts#:~:text=if%20%28%21DisposableStore.DISABLE_DISPOSED_WARNING%29%20)) This behavior prevents the common mistake of “oops, we disposed the container but some async code still tried to add a disposable to it” (more on that pitfall below).

- **Always dispose of what you create:** This might sound obvious, but it’s a fundamental rule. If your code registers an event listener, creates an interval, opens a resource, or instantiates an object that is disposable, make sure it gets disposed when no longer needed. In practice, tying such creation to a parent `Disposable` via `_register` is the easiest way to ensure this. The VS Code team observed many instances of undisposed resources when auditing the codebase, which motivated stricter patterns ([Review places where we use `IDisposable[]` in the code · Issue #74250 · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/issues/74250#:~:text=I%20know%20that%20I%27ve%20written,assumptions%20were%20no%20longer%20true))

- **Call `dispose()` exactly once on each object:** The `dispose()` method is generally designed to be idempotent (calling it multiple times has no effect after the first time). However, it’s best practice to structure your code so that each disposable is disposed once in a controlled manner. If you extend `Disposable`, do not override `dispose()` unless you need to add custom cleanup logic – and if you do, always call `super.dispose()` as part of your override. For example, if a subclass needs to run some custom logic on dispose (say, logging or additional teardown), it might implement `dispose()` like:

  ```ts
  dispose(): void {
      // custom cleanup here
      super.dispose(); // important: cleans up registered disposables
  }
  ```

  This ensures the base class’s disposal of children still occurs ([Make sure that Actions are properly disposed · Issue #74922 · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/issues/74922#:~:text=%2B%20%20%20dispose%28%29%20,)) Forgetting to call `super.dispose()` (or not disposing at all) is a common mistake that leads to leaks.

- **Use `Disposable.None` when needed:** VS Code provides a static no-op disposable (`Disposable.None`) which can be useful as a default value or placeholder when you have to return an `IDisposable` but nothing needs to be done. For instance, if a function conditionally returns a real Disposable or nothing, returning `Disposable.None` is safer than `undefined` because it at least has a `dispose()` (that does nothing) and won’t error if called ([vscode/src/vs/base/common/lifecycle.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/base/common/lifecycle.ts#:~:text=%2F)) ([vscode/src/vs/base/common/lifecycle.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/base/common/lifecycle.ts#:~:text=static%20readonly%20None%20%3D%20Object.freeze,%7D)) It’s a small convenience to keep APIs consistent.

- **Clean up references**: Disposing an object should ideally also release references between objects if those could keep things alive. Often, calling `dispose()` on an VS Code `Emitter` will remove all its listeners (thus breaking reference chains so that listeners and emitter can be garbage-collected). If you manage any caches or arrays of disposables, consider clearing them after disposing (the VS Code `dispose()` utility function returns an empty array for this reason ([vscode/src/vs/base/common/lifecycle.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/base/common/lifecycle.ts#:~:text=if%20%28d%29%20)) ([vscode/src/vs/base/common/lifecycle.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/base/common/lifecycle.ts#:~:text=)) . The base `DisposableStore.clear()` method, for example, empties its internal set after disposing all items ([vscode/src/vs/base/common/lifecycle.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/base/common/lifecycle.ts#:~:text=try%20))

- **Favor consistent patterns across the codebase:** One goal of the VS Code team was to standardize how disposables are handled everywhere ([Review places where we use `IDisposable[]` in the code · Issue #74250 · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/issues/74250#:~:text=The%20repeated%20code%20is%20what,not%20disposing%20of%20objects%20properly)) If adding new code, try to follow existing conventions. In reviews, the team tends to prefer using the `Disposable` base or `DisposableStore` rather than ad-hoc solutions. As one maintainer summarized: _“Bottom line is that everyone agrees that `DisposableStore` and `Disposable` have a clear advantage over the existing `IDisposable[]` pattern.”_ ([Review places where we use `IDisposable[]` in the code · Issue #74250 · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/issues/74250#:~:text=jrieken%20%20%20commented%20,89))

## Common Pitfalls and Subtle Nuances

Working with disposables in a large codebase has its gotchas. Here are some common pitfalls VS Code developers have encountered, and tips to avoid them:

- **Forgetting to dispose (Memory Leaks):** The most obvious pitfall is not disposing of something that should be disposed. This can lead to memory leaks or unexpected behavior (e.g., events firing on destroyed objects). VS Code’s team found many classes where an array of disposables was maintained but never properly cleared, or where disposal was overlooked during refactoring ([Review places where we use `IDisposable[]` in the code · Issue #74250 · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/issues/74250#:~:text=I%20know%20that%20I%27ve%20written,assumptions%20were%20no%20longer%20true)) ([Review places where we use `IDisposable[]` in the code · Issue #74250 · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/issues/74250#:~:text=While%20adding%20,logic%20over%20and%20over%20again)) Always audit new code to ensure every `IDisposable` gets disposed at the right time. If you extend `Disposable` and use `_register`, this becomes much easier, since the base class will handle it. If you add a new event listener, think: who will dispose this listener? If it’s the parent object, register it to the parent’s store.

- **Premature disposal vs. late registration (async timing issues):** One subtle bug can happen if an object is disposed while an asynchronous operation is still in-flight, and that async code later tries to register a new disposable. Consider this simplified (incorrect) pattern that existed in the codebase:

  ```ts
  class Foo {
  	private _disposables: IDisposable[] = [];
  	constructor() {
  		this._disposables.push(someDisposable);
  		this.doSomethingAsync();
  	}
  	dispose() {
  		dispose(this._disposables);
  	}
  	private async doSomethingAsync() {
  		await somePromise;
  		// After the await, we try to register another disposable:
  		this._disposables.push(otherDisposable);
  	}
  }
  ```

  If `Foo.dispose()` is called before `doSomethingAsync()` finishes, `otherDisposable` gets added _after_ the disposal happened, effectively leaking it ([Add DisposableStore for use in VS Code · Issue #74242 · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/issues/74242#:~:text=This%20can%20leak%20a%20disposable,in%20the%20following%20case)) The developer intent was to clean up everything, but the timing bug caused a leak. The fix (and current best practice) is to use `DisposableStore` or the base `Disposable` which guards against this. With `DisposableStore`, once `dispose()` is called, any future `add()` calls will immediately dispose the item and warn in console. In our example, if `_disposables` was a `DisposableStore`, calling `this._disposables.add(otherDisposable)` after the store is disposed would log a warning: “**Trying to add a disposable to a DisposableStore that has already been disposed of. The added object will be leaked!**” ([vscode/src/vs/base/common/lifecycle.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/base/common/lifecycle.ts#:~:text=if%20%28%21DisposableStore.DISABLE_DISPOSED_WARNING%29%20)) This warning (which developers have indeed seen at runtime ([DisposableStore leak in CustomizedMenuWorkbenchToolBar.setActions · Issue #172950 · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/issues/172950#:~:text=Not%20clear%20on%20repro)) flags the logic error so it can be fixed. To avoid this pitfall, ensure that disposables are added in a predictable order relative to disposal, or use the provided patterns that handle late additions safely.

- **Not calling `super.dispose()` in subclass overrides:** As mentioned, if you override a class’s `dispose()` without calling the base class, the base cleanup won’t happen. For classes extending `Disposable`, that means the internal `DisposableStore` (with all your registered children) won’t be disposed – a memory leak. Always include `super.dispose()` in your override (usually at the end of the function, after any subclass-specific work). For instance, in a fix for an Action leak, the `dispose()` override was added to decrement a counter and then call `super.dispose()` to ensure the emitter and other base resources were freed ([Make sure that Actions are properly disposed · Issue #74922 · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/issues/74922#:~:text=%2B%20%20%20dispose%28%29%20,)) Neglecting this will silently skip disposing the registered disposables.

- **Double disposal or using disposed objects:** Generally, disposing an object more than once should do nothing (the `markAsDisposed` utility in VS Code tracks disposed status to prevent duplicate work ([vscode/src/vs/base/common/lifecycle.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/base/common/lifecycle.ts#:~:text=public%20dispose%28%29%3A%20void%20)) ([vscode/src/vs/base/common/lifecycle.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/base/common/lifecycle.ts#:~:text=const%20self%20%3D%20trackDisposable%28)) . However, be cautious not to perform operations on objects after disposing them. If you have logic that might attempt to use an object that could be disposed, you may need checks like `if (this.isDisposed) return;` in your methods or guard by design. The `MutableDisposable` class in VS Code is an example of handling this – it holds a disposable that can be replaced, and if the container is disposed or a new value set, it disposes the old one ([vscode/src/vs/base/common/lifecycle.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/base/common/lifecycle.ts#:~:text=export%20class%20MutableDisposable,implements%20IDisposable)) ([vscode/src/vs/base/common/lifecycle.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/base/common/lifecycle.ts#:~:text=set%20value%28value%3A%20T%20,)) The nuance is to avoid assuming a resource is alive if it may have been disposed. Always consider the lifecycle: once disposed, an object should not be used except to maybe call `dispose()` again (which should be a no-op).

- **Disposing parents vs children (order of cleanup):** If an object A registers itself as a listener in object B, and B is disposed before A, you need to remove A’s listener from B to avoid callbacks to A. In VS Code’s pattern, if B’s event was exposed as an `Event` with a disposable listener, disposing A will dispose that listener (since A likely called `this._register(B.onSomething(...))`). This implies the order: disposing A removes the listener from B, which is good. But if B (the event source) is disposed first, ideally it should notify or automatically remove all listeners. Many VS Code `Event`/`Emitter` implementations handle this by disposing their emitter (removing listeners). The subtlety for developers is: ensure that cross-object relations are cleaned up from at least one side. Either the listener is disposed by the listener owner, or the emitter is disposed by the emitter owner (or both). In practice, if you follow the rule “each object disposes what it created,” this usually works out. Just be mindful of cases where an object’s disposal depends on another’s (the dependency should be clear).

- **Over-engineering disposal where not needed:** Not everything in VS Code is disposable. Sometimes developers may wrap things in disposables unnecessarily. A common subtlety is distinguishing _transient objects_ (which can just be left to GC) from those that hold limited resources or long-lived callbacks. Creating a Disposable for a short-lived object that doesn’t actually hold external resources is overkill. The VS Code team noted that many `Action` instances never had any listeners attached and didn’t truly need disposal ([Make sure that Actions are properly disposed · Issue #74922 · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/issues/74922#:~:text=mjbvz%20%20%20commented%20,75)) ([Make sure that Actions are properly disposed · Issue #74922 · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/issues/74922#:~:text=bpasero%20%20%20commented%20,76)) Their plan was to possibly remove Disposable base from some of these to reduce overhead. The lesson is to use disposables judiciously – focus on real resource management needs. If your class doesn’t hold onto anything that requires explicit teardown, you might not need to implement `dispose()` at all. However, err on the side of caution; if you’re unsure, using the standard pattern does no harm and future-proofs the code if the class later gains disposable resources.

- **Memory leak detection tooling:** As a nuance, VS Code introduced some tooling to catch leaks. The codebase includes functions like `trackDisposable()` and `markAsDisposed()` that keep track of disposables (potentially only in development or debug builds) ([vscode/src/vs/base/common/lifecycle.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/base/common/lifecycle.ts#:~:text=constructor%28%29%20)) ([vscode/src/vs/base/common/lifecycle.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/base/common/lifecycle.ts#:~:text=const%20self%20%3D%20trackDisposable%28)) They even added tests (e.g., `ensureNoDisposablesAreLeakedInTestSuite`) to automatically detect if disposables were not disposed in certain test runs ([Visual Studio Code 1.83.0 Release - GitClear](https://www.gitclear.com/open_repos/Microsoft/vscode/release/1.83.0?page=15#:~:text=Visual%20Studio%20Code%201,192214.%20more)) As a developer, you typically don’t interact with these directly, but you might see warnings or errors in the console if you leak disposables (especially when running tests or in debug mode). Pay attention to those signals – they usually point to a missed `dispose()` call.

## Deep Dive: Disposable Usage in the VS Code Codebase

Let’s look at some concrete examples from the VS Code repository to solidify our understanding of correct and incorrect Disposable usage. These examples illustrate how pervasive the Disposable pattern is and how to apply it properly.

**1. Implementing a disposable class (correct usage):**
Consider the implementation of a terminal process in VS Code’s codebase. In `terminalProcess.ts`, the class `TerminalProcess` extends `Disposable` and manages several events. It uses `_register` to hook up event emitters for data, exit, etc., and exposes those as public events:

````ts
export class TerminalProcess extends Disposable implements ITerminalChildProcess {
    // Registering an event emitter as a disposable
    private readonly _onProcessData = this._register(new Emitter<string>());
    readonly onProcessData = this._onProcessData.event;

    private readonly _onProcessReady = this._register(new Emitter<IProcessReadyEvent>());
    readonly onProcessReady = this._onProcessReady.event;

    // ... (other events similarly registered)
}
``` ([vscode/src/vs/platform/terminal/node/terminalProcess.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/main/src/vs/platform/terminal/node/terminalProcess.ts#:~:text=private%20readonly%20_onProcessData%20%3D%20this,string))
Here, `TerminalProcess` as a parent will automatically clean up all these event emitters when disposed (because it extended `Disposable` and `_register`ed them). The pattern of `private _onX = this._register(new Emitter<T>()); public onX = this._onX.event;` is extremely common in VS Code. It encapsulates event creation and ties the emitter’s lifecycle to the containing object. We see the same structure in countless places (editors, views, services). It’s concise and reliable.

**2. Subscribing to events with disposables:**
On the flip side of event emitters are event listeners. In VS Code, subscribing to an event typically returns an `IDisposable` which unregisters the listener. The correct pattern is to capture that disposable and register it to a parent. For example, the `BaseActionViewItem` (a UI component for actions) subscribes to the `Action.onDidChange` event:
```ts
export class BaseActionViewItem extends Disposable implements IActionViewItem {
    constructor(action: IAction) {
        super();
        // Subscribe to the action's change event, and register the listener for automatic disposal
        this._register(action.onDidChange(event => {
            this.handleActionChangeEvent(event);
        }));
        // ... other initialization ...
    }
    // ...
}
``` ([vscode源码解析（四） - 事件系统_vscode 源码-CSDN博客](https://blog.csdn.net/zhugangsong/article/details/136620524#:~:text=export%20class%20BaseActionViewItem%20extends%20Disposable,))
In this snippet, `action.onDidChange(...)` adds a listener and returns a Disposable. By passing that to `this._register`, the `BaseActionViewItem` ensures the listener will be removed when the view item is disposed (e.g., when the UI element is destroyed). This prevents the listener from trying to update a non-existent UI element later. The code demonstrates two things: (a) how the `Disposable` base class is used to manage listeners, and (b) how the event system and disposable system work hand-in-hand (the event delivers a disposable to the caller, who should cache/dispose it).

**3. The old pattern (incorrect usage) and its refactoring:**
Before the introduction of `Disposable` base and `DisposableStore`, many places in the code used a manual array of disposables. An example (from an older revision) would be:
```ts
class Something {
    private _toDispose: IDisposable[] = [];

    constructor() {
        // ... create some resource ...
        this._toDispose.push(resource);
    }

    dispose(): void {
        this._toDispose = dispose(this._toDispose);
    }
}
``` ([Review places where we use `IDisposable[]` in the code · Issue #74250 · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/issues/74250#:~:text=While%20adding%20,logic%20over%20and%20over%20again))
While this works in simple cases, it’s error-prone. Developers had to remember to call `dispose()` on every object and then empty the array. The function `dispose(array)` returns an empty array as a convenience ([vscode/src/vs/base/common/lifecycle.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/base/common/lifecycle.ts#:~:text=if%20%28d%29%20))  ([vscode/src/vs/base/common/lifecycle.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/base/common/lifecycle.ts#:~:text=))  so the above pattern clears `_toDispose`. However, as discussed in pitfalls, adding to this array after disposal would leak. Also, many classes duplicated this logic. The VS Code maintainers noted *“a large number of classes were re-implementing the same disposable management logic over and over”* ([Review places where we use `IDisposable[]` in the code · Issue #74250 · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/issues/74250#:~:text=While%20adding%20,logic%20over%20and%20over%20again))  making it hard to update and easy to get wrong. In 2019, they did a sweeping refactor: introducing `DisposableStore` and converting those classes to either use a store or extend `Disposable` for consistency ([Review places where we use `IDisposable[]` in the code · Issue #74250 · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/issues/74250#:~:text=The%20repeated%20code%20is%20what,not%20disposing%20of%20objects%20properly))

After refactoring, the above class might become:
```ts
class Something extends Disposable {
    constructor() {
        super();
        // ... create some resource ...
        this._register(resource);
    }
    // no need to override dispose unless additional cleanup; base takes care of registered disposables
}
````

Now, `Something` doesn’t need its own array or custom `dispose` logic. This not only simplifies the class but also fixes the asynchronous-addition issue (the base class’s store handles late additions safely). The outcome of the refactoring was positive: _“everyone agrees that `DisposableStore` and `Disposable` have a clear advantage over ... `IDisposable[]`”_ ([Review places where we use `IDisposable[]` in the code · Issue #74250 · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/issues/74250#:~:text=jrieken%20%20%20commented%20,89)) If you search the VS Code codebase today, you’ll find very few raw `IDisposable[]` usages; nearly all have been replaced by the standardized pattern.

**4. Real-world bug example – adding after dispose:**
The issue [#172950](https://github.com/microsoft/vscode/issues/172950) in the VS Code repository is a concrete example of a disposable misuse that was caught by the system’s warning. The `CustomizedMenuWorkbenchToolBar` used a `DisposableStore` for menu actions. The error log showed:

> “Error: Trying to add a disposable to a DisposableStore that has already been disposed of. The added object will be leaked!
> at DisposableStore.add (lifecycle.ts:270:18)
> at CustomizedMenuWorkbenchToolBar.setActions …” ([DisposableStore leak in CustomizedMenuWorkbenchToolBar.setActions · Issue #172950 · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/issues/172950#:~:text=Not%20clear%20on%20repro))
> This indicates that `setActions` was called on a toolbar that had been disposed earlier, and in `setActions` they attempted to `.add` a new listener or action to a `DisposableStore` that was already disposed. The `DisposableStore` correctly threw a warning. The resolution was to ensure `setActions` is not invoked on disposed toolbars (or to recreate a new store if the toolbar is being re-used). The key insight here is that the Disposable system didn’t silently fail – it surfaced a warning, which allowed developers to trace and fix the leak. As a developer forking VS Code, if you see such warnings, it means the lifecycle assumptions in the code are off. You should re-evaluate when disposal happens relative to new registrations.

**5. Specialized disposable helpers:**
VS Code includes a few specialized classes built on the disposable pattern which might be useful to know about:

- **`MutableDisposable`** – holds at most one disposable at a time. Setting a new value disposes the previous one. It’s great for scenarios where you switch out one resource for another. For example, if you have an optional feature that can be turned on or off, a MutableDisposable can store the active resource and ensure it’s cleaned when replaced or when the holder is disposed ([vscode/src/vs/base/common/lifecycle.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/base/common/lifecycle.ts#:~:text=%2F)) ([vscode/src/vs/base/common/lifecycle.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/base/common/lifecycle.ts#:~:text=export%20class%20MutableDisposable,implements%20IDisposable))
- **`SafeDisposable`** – a utility that starts as an inert disposable and can be “set” with a function to call on dispose. It basically gives you a disposable that you can safely call `dispose()` on multiple times or even if it was never set. This can simplify certain cleanup logic by avoiding checks for undefined functions ([vscode/src/vs/base/common/lifecycle.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/base/common/lifecycle.ts#:~:text=this.dispose%20%3D%20%28%29%20%3D)) ([vscode/src/vs/base/common/lifecycle.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/base/common/lifecycle.ts#:~:text=let%20callback%3A%20Function%20,fn))
- **Reference collections** – not exactly disposables, but in `lifecycle.ts` you’ll find `ReferenceCollection` and `IReference<T>` which implement a reference-counted disposable pattern (acquire/release counting) ([vscode/src/vs/base/common/lifecycle.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/base/common/lifecycle.ts#:~:text=export%20interface%20IReference,)) ([vscode/src/vs/base/common/lifecycle.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/base/common/lifecycle.ts#:~:text=acquire%28key%3A%20string%2C%20...args%3A%20any%5B%5D%29%3A%20IReference,)) These are used for things like shared models where multiple components might be using the same resource; when the last user is done, the resource is disposed.

For most fork developers, you’ll primarily use `Disposable`, `DisposableStore`, and possibly `MutableDisposable`, but it’s good to know these tools exist for specific scenarios.

## Comparison with Other Lifecycle Management Approaches

VS Code’s Disposable system is conceptually similar to resource management patterns in other frameworks and languages, but with some nuances given its TypeScript/JavaScript context:

- **.NET’s `IDisposable`:** The pattern in VS Code is heavily inspired by the .NET `IDisposable` interface. In .NET, objects holding unmanaged resources implement `Dispose()`, and consumers are expected to call it (often via a `using` statement that automatically calls dispose at the end of a block). VS Code’s use of a `dispose()` method on many objects mirrors this. However, JavaScript lacks language support for `using` blocks (at least until recently – see below), so VS Code relies on discipline and patterns (like base classes and stores) to ensure disposal happens. The idea that “if a class owns disposable fields, it should itself be disposable” ([Using objects that implement IDisposable - .NET - Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/standard/garbage-collection/using-objects#:~:text=Learn%20learn,For%20more)) is a guideline followed in VS Code: many classes implement dispose because they manage child disposables, just as in .NET one would implement `IDisposable` if holding `IDisposable` members.

- **RAII / deterministic destruction (C++):** In C++ and other languages with deterministic destruction, resource cleanup is often done in destructors when objects go out of scope. JavaScript is garbage-collected, so you don’t have deterministic destruction by default. VS Code’s disposables are essentially a manual RAII mechanism – you decide when to call `dispose()` (analogous to an object going out of scope) to free resources promptly. It’s a manual step, unlike C++ where leaving scope does it for you. That’s why it’s important in JS to have these patterns; otherwise resources might linger until GC runs (or forever, if something is referencing them).

- **Angular’s OnDestroy and React’s useEffect cleanup:** Front-end frameworks have similar notions. In Angular, components implement `OnDestroy` and the framework calls `ngOnDestroy` when a component is torn down – the developer is expected to clean subscriptions there. This is very much like implementing `dispose()` in a VS Code class. In React (with hooks), a `useEffect` hook can return a cleanup function which React calls when a component unmounts or when the effect re-runs. That cleanup function is essentially disposing of whatever was set up (e.g., removing event listeners). VS Code’s pattern is more general (not tied to UI components only) but serves the same goal: provide a dedicated place to cleanup. Unlike Angular, VS Code doesn’t automatically call `dispose()` for you at a higher level – it’s up to the code (or the object’s owner) to call it at the right time. When forking VS Code, you’ll typically see disposal calls wired into the framework. For example, editors or panels dispose their child components when they themselves are disposed by the workbench. Ensuring your new components fit into this chain (or disposing them in response to the appropriate workbench events) is important.

- **Node.js and EventEmitter removal:** In plain Node.js or browser DOM, you often remove event listeners manually to avoid leaks. VS Code’s `Event` and `Emitter` abstractions basically incorporate that into the Disposable pattern. Subscribing to an event yields a Disposable you dispose to remove the listener. It’s a more structured approach than Node’s `emitter.removeListener` calls, and it encourages uniform handling of unsubscription. So while Node doesn’t have a built-in “Disposable” concept, VS Code built one on top to unify how cleanup is done for events, timers, etc.

- **Upcoming ECMAScript Disposable Protocol:** It’s worth noting that TC39 (the JavaScript standards committee) has been discussing a _Disposable/Finalization_ protocol (with `Symbol.dispose` or similar) to allow JavaScript objects to be used in a `using` block (much like C#) for deterministic disposal. This is a stage-3 proposal as of early 2023, meaning in the future we might write:
  ```js
  using resource = getDisposableResource();
  // use resource
  ```
  and the runtime will call `resource.dispose()` automatically. If this becomes part of the language, it will align with what VS Code is already doing manually. Until then, VS Code’s approach is a custom but effective pattern. The existence of this proposal underlines that many JS/TS projects (not just VS Code) have seen the need for deterministic cleanup of resources.

In summary, VS Code’s Disposable system follows principles seen elsewhere (owning object cleans up its children, ensure one-time cleanup, avoid use-after-free), implemented in a way that fits a large TypeScript codebase. If you’re coming from other frameworks or languages:

- Treat `dispose()` like you would `close()` or `destroy()` calls in other libraries, or like releasing a resource in C#/C++.
- The DisposableStore is akin to a composite that makes group disposal easier – some frameworks might use similar concepts (e.g., composite subscriptions in RxJS).
- Always be mindful of the lifecycle: create -> use -> dispose, just as you would ensure to unsubscribe or free resources elsewhere.

By understanding and following the Disposable pattern in VS Code, you’ll write extensions or modifications that interact safely with VS Code’s lifecycle. You’ll avoid common errors, and your forked codebase will remain maintainable and leak-free. The key takeaways are: **register everything that needs disposal**, **dispose deterministically**, and **use the provided infrastructure (Disposable, stores, etc.) to simplify your work**. With these in mind, you can confidently manage resources in the VS Code codebase just as the core team does.

# Understanding the `Disposable` System in VS Code

Visual Studio Code’s codebase uses a consistent _dispose pattern_ to manage resources and prevent memory leaks. Many objects in VS Code hold resources (event listeners, timers, etc.) that should be released when no longer needed. The `Disposable` system provides interfaces and classes to simplify this cleanup. This guide explains the core concepts of disposables in VS Code, how to use them effectively, common pitfalls to avoid, and best practices for developers working on a VS Code fork.

## Core Concepts: What is `Disposable`?

**IDisposable interface:** At its core, a **disposable** is any object with a `dispose()` method. VS Code defines an `IDisposable` interface to represent this. Disposing an object should free its resources (unsubscribe listeners, clear timers, etc.). By convention, once `dispose()` is called, the object is no longer usable.

**`Disposable` base class:** VS Code provides an abstract base class `Disposable` to help implement the pattern. This class implements `IDisposable` and internally manages a collection of child disposables. Key features of the `Disposable` class include:

- **Disposable Store:** Each `Disposable` instance has a private `DisposableStore` (more on this below) to hold all disposables it registers. In the `Disposable` constructor, the new object is tracked for potential leaks, and its internal store is marked as a child of the object ([vscode/src/vs/base/common/lifecycle.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/base/common/lifecycle.ts#:~:text=protected%20readonly%20_store%20%3D%20new,DisposableStore))
- **`_register()` helper:** Subclasses of `Disposable` can call `this._register(disposable)` to add a child disposable to the internal store. This ensures that when the parent is disposed, all child disposables are automatically disposed. The base class documentation notes that _“Subclasses can `_register` disposables that will be automatically cleaned up when this object is disposed of.”_ ([vscode/src/vs/base/common/lifecycle.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/base/common/lifecycle.ts#:~:text=,link%20IDisposable%20disposable%7D%20object)) The `_register` method also guards against self-registration (registering the object on itself, which is not allowed) ([vscode/src/vs/base/common/lifecycle.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/base/common/lifecycle.ts#:~:text=protected%20_register,T))
- **`dispose()` implementation:** The base class implements `dispose()` by simply disposing its internal store and marking the object as disposed ([vscode/src/vs/base/common/lifecycle.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/base/common/lifecycle.ts#:~:text=public%20dispose%28%29%3A%20void%20)) Subclasses typically do not override `dispose()` (unless they need custom cleanup in addition to registered disposables), since the base logic already disposes of all registered children.

**Disposable.None:** The `Disposable` class provides a static `Disposable.None` constant – a no-op disposable that does nothing on `dispose()` ([vscode/src/vs/base/common/lifecycle.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/base/common/lifecycle.ts#:~:text=%2F)) This is used as a safe default when a disposable is needed but nothing should happen on disposal.

**DisposableStore:** This is a utility class for managing multiple disposables in a group (essentially a collection of `IDisposable`). Internally, `DisposableStore` holds a set of disposables and can dispose of all of them at once. Notable aspects of `DisposableStore`:

- Adding a disposable: Use `store.add(obj)` to add a disposable. If the store is already disposed, adding a new item will trigger a warning that the object will be leaked ([vscode/src/vs/base/common/lifecycle.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/base/common/lifecycle.ts#:~:text=if%20%28this._isDisposed%29%20)) (In other words, once a `DisposableStore` is disposed, any further `add` calls are no-ops that **do not** dispose the added object – it’s up to the developer to avoid using a disposed store.)
- Disposing the store: Calling `store.dispose()` will dispose **all** stored objects and mark the store as disposed ([vscode/src/vs/base/common/lifecycle.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/base/common/lifecycle.ts#:~:text=,mark%20this%20object%20as%20disposed)) ([vscode/src/vs/base/common/lifecycle.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/base/common/lifecycle.ts#:~:text=markAsDisposed)) The store’s `dispose()` uses a try/finally to ensure all child disposables are attempted to be disposed and then clears the internal set ([vscode/src/vs/base/common/lifecycle.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/base/common/lifecycle.ts#:~:text=public%20clear%28%29%3A%20void%20))
- Clearing without disposing: `store.clear()` will dispose all current children and empty the store, but it does **not** mark the store itself as disposed ([vscode/src/vs/base/common/lifecycle.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/base/common/lifecycle.ts#:~:text=,mark%20this%20object%20as%20disposed)) ([vscode/src/vs/base/common/lifecycle.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/base/common/lifecycle.ts#:~:text=try%20)) This allows reusing the store after a cleanup, if needed. In contrast, after a full `dispose()`, the store should not be reused (and will warn on further use).

**Other Disposable Utilities:** VS Code’s `lifecycle.ts` defines additional helpers and variations:

- **`toDisposable(fn)`**: Converts a function into an `IDisposable`. It returns a disposable object that will call your function exactly once when disposed ([vscode/src/vs/base/common/lifecycle.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/base/common/lifecycle.ts#:~:text=,once)) ([vscode/src/vs/base/common/lifecycle.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/base/common/lifecycle.ts#:~:text=export%20function%20toDisposable%28fn%3A%20%28%29%20%3D,IDisposable)) This is useful for integrating custom cleanup logic into the disposable pattern.
- **`combinedDisposable(...disposables)`**: Creates a single disposable that, when disposed, will dispose all the provided disposables ([vscode/src/vs/base/common/lifecycle.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/base/common/lifecycle.ts#:~:text=%2F)) Internally it uses `toDisposable` and the `dispose()` utility to dispose the group.
- **`dispose()` utility function**: A function overload that accepts either a single disposable or an iterable (like an array) of disposables and disposes them. It catches and aggregates errors if any occur during disposal ([vscode/src/vs/base/common/lifecycle.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/base/common/lifecycle.ts#:~:text=if%20%28Iterable.is%28arg%29%29%20)) ([vscode/src/vs/base/common/lifecycle.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/base/common/lifecycle.ts#:~:text=d)) This is used internally by `DisposableStore` and other classes to clean up multiple objects safely.
- **`MutableDisposable`**: A class for managing a single disposable object that may be replaced over time. Assigning a new value to a `MutableDisposable` will dispose the previous value. This is ideal for scenarios where you always want at most one active disposable. As the docs state, _“when the disposable value is changed, the previously held disposable is disposed of”_ ([vscode/src/vs/base/common/lifecycle.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/base/common/lifecycle.ts#:~:text=,value%20that%20may%20be%20changed)) You can also clear it (dispose the current value and set it to undefined) with `mutable.dispose()` or `mutable.clear()`. A `MutableDisposable` can itself be registered in a parent `Disposable` for automatic cleanup.
- **`DisposableMap`**: Similar to a `DisposableStore`, but keyed. It manages a `Map<K, IDisposable>` and can dispose values when they are removed or replaced ([vscode/src/vs/base/common/lifecycle.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/base/common/lifecycle.ts#:~:text=export%20class%20DisposableMap,implements%20IDisposable)) ([vscode/src/vs/base/common/lifecycle.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/base/common/lifecycle.ts#:~:text=set,void)) This is useful when you need to track disposables associated with specific keys (for example, per resource or ID). Inserting a new value for an existing key will dispose the old value by default ([vscode/src/vs/base/common/lifecycle.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/base/common/lifecycle.ts#:~:text=set,void)) ([vscode/src/vs/base/common/lifecycle.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/base/common/lifecycle.ts#:~:text=if%20%28%21skipDisposeOnOverwrite%29%20)) and the entire map can be disposed or cleared at once.

## Usage Patterns: How and When to Use `Disposable`

### Extending the `Disposable` Class (Inheritance)

For most classes in VS Code that hold disposable resources, the recommended pattern is to **extend `Disposable`**. By doing so, your class inherits the `_register` method and the internal `DisposableStore`, making it easy to manage child disposables. **Use this pattern when your class:**

- Owns multiple disposable members (e.g. event emitters, subscriptions, timers, etc.).
- Has a clear lifecycle tied to the application (e.g. a UI component that gets created and later disposed when no longer needed).

**How to use:** In your class constructor, call `super()` to initialize the base `Disposable`. Whenever you create or obtain a disposable resource in the class, immediately register it via `this._register(...)`. For example, in VS Code’s command service, the class extends `Disposable` and registers its event emitters like so:

```ts
export class CommandService extends Disposable implements ICommandService {
    private readonly _onWillExecuteCommand = this._register(new Emitter<ICommandEvent>());
    public readonly onWillExecuteCommand = this._onWillExecuteCommand.event;
    private readonly _onDidExecuteCommand = new Emitter<ICommandEvent>();
    public readonly onDidExecuteCommand = this._onDidExecuteCommand.event;
    …
}
```

Here, `_onWillExecuteCommand` is an `Emitter` that is registered with `this._register(...)`, ensuring it will be disposed automatically ([vscode/src/vs/workbench/services/commands/common/commandService.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/workbench/services/commands/common/commandService.ts#:~:text=private%20readonly%20_onWillExecuteCommand%3A%20Emitter,ICommandEvent)) The second emitter `_onDidExecuteCommand` is **not** registered in this snippet – if it needs disposal, the developer would have to dispose it manually or also register it. This illustrates a best practice: **always register disposable members** unless they are meant to live for the entire life of the process. In most cases, you should register all such members; forgetting to do so is a common source of leaks (more on that in pitfalls).

When the class itself is disposed (someone calls its `dispose()` method), the base class will dispose all registered children. Typically, you do not need to override `dispose()` in such classes; the inherited implementation is sufficient. However, if you do override it (to add custom cleanup logic), **always call `super.dispose()`** at the end of your override to ensure the registered disposables are freed. Failing to call `super.dispose()` would mean the child disposables remain undisposed, causing leaks.

**Composition with `DisposableStore` (Alternative):** Some developers prefer not to use inheritance for disposables and instead use composition – i.e. include a `DisposableStore` field in the class. The pattern would be something like:

```ts
class MyComponent implements IDisposable {
    private _disposables = new DisposableStore();
    …
    public dispose(): void {
        this._disposables.dispose();
    }
}
```

Then use `_disposables.add(obj)` instead of `_register(obj)`. Functionally, this achieves the same result: all added disposables are cleaned up when `dispose()` is called. In fact, `this._register(obj)` is essentially a shorthand for adding to an internal store ([vscode/src/vs/base/common/lifecycle.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/base/common/lifecycle.ts#:~:text=protected%20_register,T)) The VS Code team introduced the base `Disposable` class to reduce the risk of manual mistakes and make the code cleaner ([Review places where we use `IDisposable[]` in the code · Issue #74250 · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/issues/74250#:~:text=,correctly%20handles%20the%20above%20case)) In most of the codebase, you'll see the inheritance pattern, but both are valid. Choose the approach that fits the design:

- Use **`extends Disposable`** for convenience and consistency, especially when you don’t need fine-grained control of child disposal timing (you let them all dispose when the parent disposes).
- Use **an explicit `DisposableStore`** in cases where you might want to dispose subsets of resources earlier or where multiple inheritance is a concern (since TypeScript doesn’t support extending two classes, you may sometimes prefer composition).

### Using `DisposableStore` for Local Scopes or Aggregation

`DisposableStore` is also useful for managing a set of disposables in a **function scope or non-class context**. For example, if you have a function that registers multiple listeners or creates temporary objects, you can use a `DisposableStore` to group them, then dispose all at once when done. A common pattern is to instantiate a `DisposableStore` at the beginning of a block and ensure it’s disposed at the end, using a `finally` block or the provided utility `disposeOnReturn`:

```ts
disposeOnReturn(store => {
    // within this function, use store.add(...) for any disposables
    store.add(obj1);
    store.add(obj2);
    …
}); // store is automatically disposed when the function exits ([vscode/src/vs/base/common/lifecycle.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/base/common/lifecycle.ts#:~:text=export%20function%20disposeOnReturn,void))
```

This pattern guarantees cleanup even if an error occurs mid-function. Alternatively, you can manually call `store.dispose()` in a `finally` clause.

Another use case is when a function or method needs to return a group of disposables to the caller. Instead of returning an array of disposables (which the caller might misuse), you can return a `DisposableStore` or a combined disposable. For example, in VS Code’s drag-and-drop handler, a helper registers multiple event listeners on a DOM element and returns a `DisposableStore` containing them:

```ts
registerTarget(element: HTMLElement, callbacks: ICallbacks): IDisposable {
    const disposableStore = new DisposableStore();
    disposableStore.add(new DragAndDropObserver(element, { … }));
    // ... add other disposables related to this target
    return disposableStore; // caller can dispose this to remove all listeners at once
}
```

This way, the caller gets a single `IDisposable` to manage. The code above demonstrates aggregating multiple disposables into one store for convenience ([vscode/src/vs/workbench/browser/dnd.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/workbench/browser/dnd.ts#:~:text=registerTarget,))

### Other Patterns and Classes

- **Replacing a single disposable (MutableDisposable):** When you have a member that can change (for example, a single active editor or an ongoing operation that gets replaced), use a `MutableDisposable`. Set its `.value` property to the new disposable, and it will automatically dispose the previous one ([vscode/src/vs/base/common/lifecycle.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/base/common/lifecycle.ts#:~:text=set%20value%28value%3A%20T%20,)) ([vscode/src/vs/base/common/lifecycle.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/base/common/lifecycle.ts#:~:text=)) This saves you from manually tracking “old” subscriptions. You should dispose the `MutableDisposable` itself when your object is disposed (by registering it or disposing it directly), which will dispose whatever it holds last.
- **Keyed disposables (DisposableMap):** If you manage resources identified by keys (like a map of ID -> connection where each connection is disposable), `DisposableMap` can be helpful. It ensures that when you set a new value for a key, the old value is disposed ([vscode/src/vs/base/common/lifecycle.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/base/common/lifecycle.ts#:~:text=set,void)) ([vscode/src/vs/base/common/lifecycle.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/base/common/lifecycle.ts#:~:text=if%20%28%21skipDisposeOnOverwrite%29%20)) and you can dispose all entries at once by disposing the map ([vscode/src/vs/base/common/lifecycle.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/base/common/lifecycle.ts#:~:text=dispose%28%29%3A%20void%20)) ([vscode/src/vs/base/common/lifecycle.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/base/common/lifecycle.ts#:~:text=clearAndDisposeAll%28%29%3A%20void%20))
- **Creating disposables on the fly:** Use `toDisposable` for ad-hoc cleanup logic. For example, if you need to schedule a one-time cleanup (like deleting a temp file on dispose), you can do: `this._register(toDisposable(() => fs.unlinkSync(tempPath)))`. This wraps the cleanup in an object that will be disposed with the others.
- **Combining disposables:** If you have multiple unrelated disposables that you want to treat as one (perhaps to return from a function), you can use `combinedDisposable(a, b, c)`. This is effectively sugar for creating a `toDisposable` that calls dispose on `a`, `b`, `c` in one go ([vscode/src/vs/base/common/lifecycle.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/base/common/lifecycle.ts#:~:text=%2F))

## Common Mistakes and Pitfalls

Working with disposables is straightforward, but there are several common pitfalls to watch out for:

- **Forgetting to dispose something:** The simplest mistake is not disposing a resource at all. For instance, if you subscribe to an event but never unsubscribe, your object may stay in memory and keep receiving events. VS Code’s leak detection (when enabled) considers any disposable that isn’t disposed or parented as a leak ([vscode/src/vs/base/common/lifecycle.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/base/common/lifecycle.ts#:~:text=)) Always ensure that every `IDisposable` you create or obtain is either disposed or added to a parent disposable. A good rule of thumb: if you call something like `event.registerListener(...)` and it returns a disposable, immediately `_register` it or otherwise track it for later disposal.

- **Using an array of disposables improperly:** In the past, code often stored multiple disposables in an array and then disposed them. This is error-prone if the array is modified after disposal. Consider this flawed pattern:

  ```ts
  const disposables: IDisposable[] = [];
  disposables.push(new DisposableThing());
  dispose(disposables);
  disposables.push(new DisposableThing2()); // <- Oops, this will be leaked
  ```

  Here, `DisposableThing2` is never disposed because the array was already processed by `dispose()` earlier. This pattern can easily occur in complex or async code and cause leaks ([Review places where we use `IDisposable[]` in the code · Issue #74250 · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/issues/74250#:~:text=Our%20code%20commonly%20uses%20%60IDisposable,Consider)) The solution is to avoid raw arrays for lifecycle management. Instead, use a `DisposableStore` or let your class itself be a `Disposable` (so you use `_register`). The VS Code team explicitly went through and replaced many `IDisposable[]` usages with `DisposableStore` to prevent this mistake ([Review places where we use `IDisposable[]` in the code · Issue #74250 · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/issues/74250#:~:text=Review%20places%20where%20we%20use,all%20cases%2C%20we%20should%20either))

- **Adding to a disposed store:** If you call `store.add(obj)` after the store was disposed, the object will be leaked (the store will log a warning but not dispose the object) ([vscode/src/vs/base/common/lifecycle.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/base/common/lifecycle.ts#:~:text=if%20%28this._isDisposed%29%20)) This typically indicates a logic error – perhaps something is trying to register a callback after the component was already torn down. Be mindful of object lifetimes; once a `DisposableStore` or parent `Disposable` is disposed, do not attempt to use it. A common pattern to avoid this is checking an `isDisposed` flag (the `DisposableStore` has an `isDisposed` property ([vscode/src/vs/base/common/lifecycle.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/base/common/lifecycle.ts#:~:text=%2F)) or guarding with conditions if needed.

- **Not calling `super.dispose()` in subclass:** If you override a class’s `dispose()` method (which is rare in VS Code’s codebase, but possible when a class needs extra cleanup steps), you must call `super.dispose()` to actually dispose the registered children. If you forget, your subclass might clean up its own state but all the event handlers and child objects tracked in the base `Disposable` won’t be freed. This can lead to memory leaks or unexpected behavior (e.g. events still firing). Always end a custom `dispose()` override with `super.dispose()` (or call it first, depending on whether you need the children gone before your additional cleanup – usually you call it last).

- **Double-disposal or use-after-disposal:** Calling `dispose()` on the same object twice should generally be safe (the second call should be a no-op in well-behaved implementations). VS Code’s `DisposableStore.dispose()` checks an `_isDisposed` flag to avoid doing anything on subsequent calls ([vscode/src/vs/base/common/lifecycle.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/base/common/lifecycle.ts#:~:text=if%20%28this._isDisposed%29%20)) However, use-after-disposal (continuing to use an object that’s been disposed) is a logic error. The object may throw errors if you try to use it, or simply not function. For example, if you dispose a text editor model and then try to use it, you’ll likely get errors. To avoid this, once an object is disposed, drop references to it or set flags to prevent further calls on it.

- **Not disposing singletons intentionally**: Some objects are meant to live for the entire application runtime (singleton services, etc.). These typically are **not** disposed at all. This is fine if they truly are needed until exit, but if you create something long-lived by accident, it becomes a leak. VS Code’s leak tracker can mark known singletons to ignore them. As a developer, if you introduce a truly global, never-disposed object, consider using `markAsSingleton(obj)` to inform the tracker ([vscode/src/vs/workbench/browser/dnd.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/workbench/browser/dnd.ts#:~:text=static%20get%20INSTANCE%28%29%3A%20CompositeDragAndDropObserver%20)) For instance, VS Code’s drag-and-drop observer uses a singleton pattern and calls `markAsSingleton` on the single instance ([vscode/src/vs/workbench/browser/dnd.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/workbench/browser/dnd.ts#:~:text=static%20get%20INSTANCE%28%29%3A%20CompositeDragAndDropObserver%20)) **Only use this for objects that are effectively global and harmless to never dispose** (because e.g. they rely on process teardown). Do _not_ use it as an excuse to avoid proper disposal of things that should be cleaned up.

## Proper Cleanup Strategies and Best Practices

To use the `Disposable` system efficiently, keep these best practices in mind:

- **Plan the lifecycle** of your objects. Determine which component will own and dispose of which resource. For example, if you create a view pane that listens to configuration changes, decide when that view will be destroyed and ensure it disposes its listeners at that time. Often, the code that creates an object is also responsible for disposing it when appropriate (unless ownership is transferred).

- **Use `_register` or `DisposableStore.add` immediately** when you obtain a disposable resource. This creates a clear association and prevents “forgotten” disposables. A common pattern is:

  ```ts
  this._register(someService.onDidChange(e => { … }));
  ```

  This one-liner both subscribes to an event and guarantees the subscription will be removed.

- **Dispose in reverse order of creation (when relevant).** While the `DisposableStore` doesn’t strictly guarantee disposal order (it uses insertion-order Set iteration, which in JavaScript does follow insertion order), you generally don’t need to worry about order unless the disposables have dependencies on each other. If they do, be mindful to dispose in an order that won’t cause errors. For finer control, you might avoid grouping such disposables together, or remove one from the store and dispose it separately if needed. Typically, though, each disposable is independent.

- **Guard long-lived disposables.** If your object might accumulate many listeners over time (especially in response to user actions), consider using `dispose()` to remove old ones before adding new ones, or use patterns like `MutableDisposable` to replace the old with the new automatically. This prevents buildup of stale listeners.

- **Test for leaks during development:** VS Code has a disposable tracking mechanism that can help catch leaks. By enabling the `TRACK_DISPOSABLES` flag in the code (set it to `true` in `lifecycle.ts` during a debug build), VS Code will log warnings for potential leaks. It uses `FinalizationRegistry` and timeouts to detect disposables that were never disposed or never parented within a few seconds of creation ([vscode/src/vs/base/common/lifecycle.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/base/common/lifecycle.ts#:~:text=if%20%28TRACK_DISPOSABLES%29%20)) ([vscode/src/vs/base/common/lifecycle.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/base/common/lifecycle.ts#:~:text=setTimeout%28%28%29%20%3D)) There are false positives (not every object needs immediate disposal), but it can highlight missing disposals in your changes. Pay attention to console warnings like “[LEAKED DISPOSABLE]” or the stack traces of where a disposable was created. This tool is mainly for VS Code developers to ensure the dispose patterns are followed.

- **Be careful with async workflows:** If your code is asynchronous, ensure that disposables are handled correctly across awaits and callbacks. For example, if an async operation is canceled, dispose any related resources promptly. If you fire off an async task that creates disposables, and the calling context might be disposed before the task completes, you need to handle that. One approach is to use a `MutableDisposable` for the task’s result, so if the parent is disposed early, you can cancel/dispose the ongoing task. Also, avoid the scenario of disposing a store and then later continuing a task that erroneously tries to add to it (leading to the "object will be leaked" warning ([vscode/src/vs/base/common/lifecycle.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/base/common/lifecycle.ts#:~:text=if%20%28this._isDisposed%29%20)) .

- **Use try/finally or scope guards for non-trivial sequences:** When creating multiple disposables in a sequence of code, if there’s any chance of early exit (error thrown, return, etc.), use `disposeOnReturn` or a `finally` block to ensure partial work gets cleaned up. For example, if you create two disposables and then an error occurs, you don’t want the first one to be left dangling. `disposeOnReturn` is a handy utility for this pattern ([vscode/src/vs/base/common/lifecycle.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/base/common/lifecycle.ts#:~:text=export%20function%20disposeOnReturn,void))

- **Document ownership** in the code: It’s helpful to document which class or layer is responsible for disposing a given object. In complex systems, misunderstandings about ownership can lead to leaks (nobody disposes something) or double-disposal (two different owners both try to dispose). As a rule, if class A creates B and B doesn’t outlive A, then A should dispose B (often via `_register`). If B is handed off elsewhere to live longer, then A shouldn’t dispose it. Clarity in comments or code structure (e.g. passing a disposable to another parent) helps avoid mistakes.

- **Leverage VS Code’s patterns:** Many areas of VS Code already implement disposables correctly. Look at existing code for reference. For instance, UI components like the search panel, editors, tree views, etc., all use `Disposable` to manage event wiring. Services in `platform` and `workbench` (e.g. `CommandService`, `MarkerService`) extend `Disposable` and follow the patterns described. Key areas where disposables are heavily used include:

  - **Event handling** – Every event subscription returns a disposable. The `Emitter` class itself is disposable (to remove all listeners). Always dispose emitters you create (commonly via `_register(new Emitter())` as seen in many services ([vscode/src/vs/workbench/services/commands/common/commandService.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/workbench/services/commands/common/commandService.ts#:~:text=private%20_starActivation%3A%20Promise)) .
  - **UI components and contributions** – Anything that attaches to the DOM or editor (hover providers, code lens, etc.) uses disposables to detach when the feature is turned off or the editor closes.
  - **Resource managers** – e.g., file watchers (`FileSystemWatcher` in the extension API extends Disposable), language feature registries, etc., which register and unregister capabilities.
  - **Timers and intervals** – if using `setTimeout` or `setInterval` manually, wrap them in a disposable (there’s a `DisposableTimer` pattern or just use `toDisposable(() => clearTimeout(handle))`).

- **Mark truly persistent objects as singletons:** As mentioned, if you deliberately have something that should live for the entire VS Code session (and not be disposed), you can use `markAsSingleton` to silence the leak tracker ([vscode/src/vs/workbench/browser/dnd.ts at main · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/blob/master/src/vs/workbench/browser/dnd.ts#:~:text=static%20get%20INSTANCE%28%29%3A%20CompositeDragAndDropObserver%20)) But as a practice, try to limit such cases. Most things can and should be cleaned up to keep VS Code responsive and memory-efficient, especially in long-running sessions.

By adhering to these practices, you’ll maintain the integrity of the VS Code fork’s resource management. The `Disposable` pattern, when used consistently, greatly reduces the risk of memory leaks and makes the lifecycle of components clearer. Always ensure that for every resource acquired, a matching dispose happens at the right time. Using VS Code’s built-in `Disposable` utilities will help you write clean, robust code with proper cleanup. Happy hacking!
