# Setting up MainThread to ExtHost Protocols in VS Code

This guide explains how to establish communication protocols between VS Code's main thread services and extension host for external package integration, using a proxy-based architecture.

## Overview

The architecture follows two key principles:

1. The extension hosts external package functionality (e.g., SheetJS)
2. The core service acts as a thin proxy, forwarding calls via IPC

## Built-in Extension Setup

First, set up your extension as a built-in component:

1. Create extension in VS Code's `extensions/` directory
2. Add entry to `product.json` to bundle it with VS Code
3. Extension will auto-load at startup

Example `product.json` entry:

```json
{
	"builtInExtensions": [
		{
			"name": "your-extension",
			"version": "1.0.0",
			"repo": "your-repo-url"
		}
	]
}
```

## Protocol Definition

Define the protocol interfaces in a shared file (e.g., `src/vs/workbench/api/common/extHost.protocol.ts`):

```typescript
// Define shapes for both sides of the protocol
export interface MainThreadSheetShape extends IDisposable {
	// Methods that extension host can call on main thread
	// Prefix with $ to indicate cross-boundary calls
	$openWorkbook(uri: UriComponents): Promise<WorkbookData>;
	$getCellValue(
		uri: UriComponents,
		sheet: string,
		cell: string
	): Promise<string>;
}

export interface ExtHostSheetShape {
	// Methods that main thread can call back to extension host
	$onWorkbookOpened(uri: UriComponents): void;
}

// Register unique channel identifiers
export const MainContext = {
	MainThreadSheet: createMainId<MainThreadSheetShape>("MainThreadSheet"),
};

export const ExtHostContext = {
	ExtHostSheet: createExtId<ExtHostSheetShape>("ExtHostSheet"),
};
```

## Core Service Implementation

The core service is implemented as a thin proxy:

```typescript
// 1. Define the service interface
export const ISheetService = createDecorator<ISheetService>("sheetService");
export interface ISheetService {
	_serviceBrand: undefined;
	openWorkbook(uri: URI): Promise<WorkbookData>;
	getCellValue(uri: URI, sheetName: string, cell: string): Promise<string>;
}

// 2. Implement the proxy service
export class ProxySheetService implements ISheetService {
	_serviceBrand: undefined;
	private readonly _proxy: MainThreadSheetShape;

	constructor(mainContext: IMainContext) {
		this._proxy = mainContext.getProxy(MainContext.MainThreadSheet);
	}

	openWorkbook(uri: URI): Promise<WorkbookData> {
		return this._proxy.$openWorkbook(uri);
	}

	getCellValue(uri: URI, sheetName: string, cell: string): Promise<string> {
		return this._proxy.$getCellValue(uri, sheetName, cell);
	}
}

// 3. Register the service
registerSingleton(ISheetService, ProxySheetService, InstantiationType.Delayed);
```

## Extension Host Implementation

In your built-in extension, implement the actual functionality:

```typescript
@extHostCustomer(MainContext.MainThreadSheet)
export class MainThreadSheet implements MainThreadSheetShape {
	async $openWorkbook(uri: UriComponents): Promise<WorkbookData> {
		// Convert URI components back to URI
		const workbookUri = URI.revive(uri);

		// Use external package (e.g., SheetJS) to handle the operation
		const workbookData = SheetJS.readFile(workbookUri.fsPath, {
			cellDates: true,
			cellStyles: true,
		});

		return workbookData;
	}

	async $getCellValue(
		uri: UriComponents,
		sheet: string,
		cell: string
	): Promise<string> {
		const workbookUri = URI.revive(uri);
		const workbook = SheetJS.readFile(workbookUri.fsPath);
		return workbook.Sheets[sheet][cell]?.v;
	}

	dispose(): void {
		// Cleanup resources
	}
}
```

## Sheet Implementation Example

Here's a complete example of implementing a sheet service using this architecture:

### 1. Protocol Definition (in extension)

```typescript
// extensions/transformer-sheet/src/protocol.ts
export interface MainThreadSheetShape {
	$readSheet(uri: string): Promise<any>;
}

export interface ExtHostSheetShape {
	$onSheetRead?(uri: string, data: any): void;
}

export const MainContext = {
	MainThreadSheet: "MainThreadSheet",
};
```

### 2. Main Thread Implementation

```typescript
// src/vs/workbench/api/browser/mainThreadSheet.ts
@extHostNamedCustomer(MainContext.MainThreadSheet)
export class MainThreadSheet
	extends Disposable
	implements MainThreadSheetShape
{
	private readonly _proxy: ExtHostSheetShape;

	constructor(extHostContext: IExtHostContext) {
		super();
		this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostSheet);
	}

	async $readSheet(uri: UriComponents): Promise<any> {
		try {
			return await this._proxy.$provideSheetData(uri);
		} catch (error) {
			throw new Error(`Failed to read sheet: ${error.message}`);
		}
	}
}
```

### 3. Extension Implementation

```typescript
// extensions/transformer-sheet/src/extension.ts
export function activate(context: vscode.ExtensionContext) {
	const sheetService = new SheetService(context);

	// Implement main thread protocol
	const mainThreadSheet: MainThreadSheetShape = {
		async $readSheet(uri) {
			return sheetService.readSheet(vscode.Uri.parse(uri));
		},
	};

	return {
		extHostSheet: mainThreadSheet,
	};
}
```

### 4. Service Implementation

```typescript
// extensions/transformer-sheet/src/sheetService.ts
export class SheetService {
	constructor(private readonly context: vscode.ExtensionContext) {}

	async readSheet(uri: vscode.Uri): Promise<any> {
		try {
			const content = await vscode.workspace.fs.readFile(uri);
			const workbook = XLSX.read(content, {
				type: "array",
				cellDates: true,
				cellStyles: true,
			});

			const firstSheetName = workbook.SheetNames[0];
			const worksheet = workbook.Sheets[firstSheetName];
			return XLSX.utils.sheet_to_json(worksheet);
		} catch (error: any) {
			throw new Error(`Failed to read spreadsheet: ${error?.message}`);
		}
	}
}
```

### 5. Protocol Registration

In `src/vs/workbench/api/common/extHost.protocol.ts`, add:

```typescript
export const MainContext = {
	// ... other contexts
	MainThreadSheet:
		createProxyIdentifier<MainThreadSheetShape>("MainThreadSheet"),
};

export const ExtHostContext = {
	// ... other contexts
	ExtHostSheet: createProxyIdentifier<ExtHostSheetShape>("ExtHostSheet"),
};
```

### 6. Usage Example

The sheet service can then be used from the main thread like this:

```typescript
// In transformer.contribution.ts
this.operationRegistry.registerOperation({
	id: OPERATION_SHEET_READ,
	type: "sheetRead",
	impl: async (
		accessor: ServicesAccessor,
		operation: ITransformerOperation
	) => {
		const mainThreadSheet = accessor.get(IMainThreadSheet);
		const data = await mainThreadSheet.$readSheet(uri);
		// Process the sheet data...
	},
});
```

This implementation:

1. Keeps heavy sheet processing in the extension
2. Uses proxy pattern for communication
3. Maintains clean separation of concerns
4. Follows VS Code's extension patterns

## Separation of Concerns

The architecture follows clear separation of responsibilities:

1. **Extension's Role**

   - Houses external package (e.g., SheetJS)
   - Implements actual functionality
   - Exposes operations via IPC channel
   - Handles heavy lifting of data processing

2. **Core Service's Role**
   - Acts as thin proxy
   - Forwards calls to extension
   - Maintains clean interface for other core components
   - Keeps core lightweight

## Best Practices

1. **Method Naming**

   - Prefix IPC methods with `$`
   - Use clear, descriptive names
   - Follow VS Code's naming conventions

2. **Data Handling**

   - Convert complex objects (e.g., URIs) to components for IPC
   - Use `URI.revive()` on receiving side
   - Handle errors appropriately across boundary

3. **Resource Management**

   - Implement proper cleanup in `dispose()`
   - Handle extension deactivation
   - Clean up any external resources

4. **Type Safety**
   - Use TypeScript interfaces
   - Define clear contracts
   - Maintain proper type information across IPC

## Communication Flow

A typical operation flows as follows:

1. Core component calls `SheetService` method
2. `ProxySheetService` forwards call over IPC
3. Extension receives call via `MainThreadSheet`
4. Extension processes request using external package
5. Result returns over IPC to core
6. Core component receives result

This pattern mirrors VS Code's built-in features like Clipboard and Git integration, ensuring consistent architecture and maintainable code.

## Bidirectional Communication Pattern

VS Code's extension host architecture often requires two-way communication. Here's a more complex example using chat agents:

```typescript
// Protocol definition
export interface MainThreadChatAgentsShape extends IDisposable {
	$registerAgent(handle: number, data: IAgentData): Promise<void>;
	$handleProgress(requestId: string, progress: IChatProgress): void;
}

export interface ExtHostChatAgentsShape {
	$invokeAgent(handle: number, request: IChatRequest): Promise<void>;
	$acceptFeedback(handle: number, feedback: any): void;
}
```

### Handle-Based Registration

Complex features use handles to track instances across boundaries:

```typescript
export class MainThreadChatAgents {
	private readonly _agents = new Map<number, AgentData>();

	async $registerAgent(handle: number, data: IAgentData): Promise<void> {
		this._agents.set(handle, {
			id: data.id,
			dispose: () => this._agents.delete(handle),
		});
	}
}

export class ExtHostChatAgents {
	private static _handlePool = 0;
	private readonly _agents = new Map<number, ExtHostAgent>();

	registerAgent(agent: ChatAgent): void {
		const handle = ExtHostChatAgents._handlePool++;
		this._agents.set(handle, agent);
		this._proxy.$registerAgent(handle, agent.data);
	}
}
```

### State Management

Managing state between processes requires careful coordination:

```typescript
class ChatSession {
	private readonly _pendingRequests = new Map<string, RequestState>();

	// Main thread tracks active requests
	async handleProgress(requestId: string, progress: Progress): Promise<void> {
		const state = this._pendingRequests.get(requestId);
		if (!state) {
			return;
		}
		state.addProgress(progress);
	}

	// Extension host tracks agent state
	async invokeAgent(request: Request): Promise<void> {
		this._proxy.$handleProgress(request.id, {
			kind: "progress",
			content: request.content,
		});
	}
}
```

### Event Handling

Events must be carefully forwarded across the boundary:

```typescript
class MainThreadChats {
	constructor() {
		// Forward core events to extension host
		this._register(
			chatService.onDidReceiveResponse((e) => {
				this._proxy.$acceptResponse(e.requestId, e.response);
			})
		);
	}
}

class ExtHostChats {
	constructor() {
		// Forward extension events to main thread
		this.onDidGenerateResponse((e) => {
			this._proxy.$handleResponse(e.requestId, e.response);
		});
	}
}
```

### Resource Management

Both sides must properly clean up resources:

```typescript
class ChatAgent implements IDisposable {
	private readonly _disposables = new DisposableStore();

	constructor() {
		// Track disposables on both sides
		this._disposables.add(mainThreadRegistration);
		this._disposables.add(extHostRegistration);
	}

	dispose(): void {
		this._disposables.dispose();
	}
}
```

## Advanced Patterns

### Long-Running Operations

For operations that take time:

```typescript
class ChatOperation {
	async execute(): Promise<void> {
		// Start on main thread
		const requestId = await this._proxy.$beginRequest();

		try {
			// Process in extension
			await this.processRequest(requestId);

			// Complete on main thread
			await this._proxy.$completeRequest(requestId);
		} catch (err) {
			await this._proxy.$failRequest(requestId, err);
		}
	}
}
```

### Dynamic Registration

Support runtime registration of capabilities:

```typescript
class DynamicProvider {
	register(provider: Provider): IDisposable {
		const handle = this._nextHandle++;
		this._providers.set(handle, provider);
		this._proxy.$registerProvider(handle, provider.metadata);

		return {
			dispose: () => {
				this._providers.delete(handle);
				this._proxy.$unregisterProvider(handle);
			},
		};
	}
}
```

These patterns enable building complex features while maintaining clean separation between extension and core functionality.
