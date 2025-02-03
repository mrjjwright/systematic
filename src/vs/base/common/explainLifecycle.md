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

    acquire() { this._counter++; return this; }
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
       private readonly _registry = new FinalizationRegistry<string>(heldValue => {
           console.warn(`[LEAKED DISPOSABLE] ${heldValue}`);
       });

       trackDisposable(disposable: IDisposable): void {
           const stack = new Error('CREATED via:').stack!;
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
        this._register(editor.onKeyDown(e => {
            this.handleKeyDown(e);
        }));
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
    onMouseDown(target: HTMLElement, callback: (e: EditorMouseEvent) => void): IDisposable {
        const listener = (e: MouseEvent) => callback(this._create(e));
        target.addEventListener('mousedown', listener);
        return toDisposable(() => target.removeEventListener('mousedown', listener));
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
        this._store.forEach(value => value.dispose());
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
        this.unset = () => this.dispose = () => { };
        this.isSet = () => true;
    }
    
    unset() {
        this.dispose = () => { };
        this.unset = () => { };
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
       handlers.add(addDisposableListener(element, 'click', /*...*/));
       handlers.add(addDisposableListener(element, 'mouseover', /*...*/));
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
