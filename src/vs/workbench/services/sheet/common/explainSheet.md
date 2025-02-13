# VS Code Sheet Service

The Sheet Service is a system that enables VS Code to interact with spreadsheet-like data through a provider-based architecture. This document explains the architecture, components, and intended usage of the Sheet Service system.

## Architecture Overview

The Sheet Service follows VS Code's extension architecture pattern with three main layers:

1. Core Service (SheetService)
2. Main Thread Bridge (MainThreadSheets)
3. Extension Host Bridge (ExtHostSheets)

### Core Types

The system is built around these fundamental types:

```typescript
interface SheetCell {
	row: number;
	col: number;
	value: any;
}

interface ISheetProvider {
	readonly extId: string;
	readCell(uri: URI, row: number, col: number): Promise<SheetCell>;
	writeCell(uri: URI, cell: SheetCell): Promise<void>;
	dispose(): void;
}
```

## Component Details

### 1. Sheet Service (Core)

The `SheetService` is the central service that manages sheet providers and coordinates read/write operations:

- Implemented as a VS Code service with `@createDecorator`
- Maintains a set of registered providers
- Handles provider registration and disposal
- Delegates read/write operations to appropriate providers
- Implements fallback behavior if a provider fails

Key methods:

```typescript
interface ISheetService {
	registerProvider(provider: ISheetProvider): IDisposable;
	readCell(uri: URI, row: number, col: number): Promise<SheetCell>;
	writeCell(uri: URI, cell: SheetCell): Promise<void>;
}
```

### 2. Main Thread Bridge (MainThreadSheets)

The `MainThreadSheets` class bridges between the core service and extension host:

- Implements the `MainThreadSheetShape` protocol
- Creates providers that delegate to the extension host
- Manages provider lifecycle and registration
- Handles extension-to-core communication

### 3. Extension Host Bridge (ExtHostSheets)

The `ExtHostSheets` class enables extensions to provide sheet functionality:

- Implements the `ExtHostSheetShape` protocol
- Manages extension-provided sheet data providers
- Handles provider registration and disposal
- Transforms URIs between extension and core contexts

## Provider Registration Flow

1. Extension registers a provider through the API
2. ExtHostSheets assigns a handle and registers with MainThreadSheets
3. MainThreadSheets creates a bridge provider
4. Bridge provider is registered with SheetService
5. SheetService can now delegate operations to the extension

## Usage Example

From an extension:

```typescript
class MySheetProvider implements vscode.SheetMutator {
	async readCell(
		uri: vscode.Uri,
		row: number,
		col: number
	): Promise<SheetCell> {
		// Implement cell reading logic
	}

	async writeCell(uri: vscode.Uri, cell: SheetCell): Promise<void> {
		// Implement cell writing logic
	}
}

// Register the provider
vscode.sheets.registerSheetMutator(myProvider);
```

## Error Handling

The service implements robust error handling:

1. Provider-level errors are caught and logged
2. Service attempts multiple providers if available
3. Clear error messages for common failure cases
4. Proper cleanup on provider disposal

## Best Practices

1. Providers should implement efficient caching
2. Handle URI schemes appropriately
3. Implement proper cleanup in dispose()
4. Use meaningful extension IDs
5. Handle concurrent read/write operations gracefully

## Extension API Surface

The Sheet Service exposes a clean API surface to extensions:

```typescript
namespace vscode {
	export interface SheetMutator {
		readCell(uri: Uri, row: number, col: number): Promise<SheetCell>;
		writeCell(uri: Uri, cell: SheetCell): Promise<void>;
	}

	export namespace sheets {
		export function registerSheetMutator(provider: SheetMutator): Disposable;
	}
}
```

## Common Use Cases

1. Spreadsheet file format support
2. Database table viewers
3. CSV file editors
4. Data grid implementations
5. Custom data visualization tools

## Implementation Notes

- All operations are asynchronous
- URIs are used to identify sheet resources
- Providers can be registered and unregistered dynamically
- Multiple providers can coexist
- Service implements provider fallback
