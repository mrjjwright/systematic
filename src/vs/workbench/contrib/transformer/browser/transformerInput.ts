import { URI } from '../../../../base/common/uri.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { EditorInput } from '../../../common/editor/editorInput.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { GroupIdentifier, IEditorSerializer, ISaveOptions, IUntypedEditorInput } from '../../../common/editor.js';
import { TreeItemCollapsibleState } from '../../../common/views.js';


export interface TransformerOperation {
	id: string;
	name: string;
	description?: string;
	type: OperationType;
	state: OperationState;
	collapsibleState: TreeItemCollapsibleState;
	children?: TransformerOperation[];
	result?: any;
}

export enum OperationType {
	UI = 'ui',
	AI = 'ai',
	Tool = 'tool',
	Link = 'link'
}

export enum OperationState {
	Pending = 'pending',
	Running = 'running',
	Complete = 'complete',
	Error = 'error'
}

export interface UIOperation extends TransformerOperation {
	type: OperationType.UI;
	uiType: UIElementType;
	storage?: StorageLocation;
}

export enum UIElementType {
	FileUpload = 'fileUpload',
	TextInput = 'textInput',
	Button = 'button'
}

export interface AIOperation extends TransformerOperation {
	type: OperationType.AI;
	promptFile: string;
	inputs: LinkOperation[];
	model?: string;
}

export interface ToolOperation extends TransformerOperation {
	type: OperationType.Tool;
	toolType: string;
	config?: any;
}

export interface LinkOperation extends TransformerOperation {
	type: OperationType.Link;
	target: string; // Can be file path or operation ID
	targetType: LinkTargetType;
}

export enum LinkTargetType {
	File = 'file',
	Operation = 'operation'
}

export interface StorageLocation {
	type: StorageType;
	key: string;
}

export enum StorageType {
	Memento = 'memento',
	Workspace = 'workspace',
	Global = 'global'
}

// Example factory function
export function createOperation(
	type: OperationType,
	name: string,
	options: {}
) {
	return {
		id: generateId(),
		name,
		type,
		state: OperationState.Pending,
		collapsibleState: TreeItemCollapsibleState.Expanded,
		...options
	} satisfies TransformerOperation;
}

function generateId(): string {
	return Math.random().toString(36).substring(2);
}


export class TransformerModel {
	private operations: TransformerOperation[] = [];
	private dirty = false;

	constructor(
		private readonly uri: URI,
		@IFileService private fileService: IFileService
	) { }

	getOperations(): TransformerOperation[] {
		return this.operations;
	}

	addOperation(operation: TransformerOperation): void {
		this.operations.push(operation);
		this.dirty = true;
	}

	async load(): Promise<void> {
		const content = await this.fileService.readFile(this.uri);
		const parsed = JSON.parse(content.value.toString());

		// Validate the loaded content matches our expected types
		if (Array.isArray(parsed)) {
			this.operations = parsed.map(op => this.validateOperation(op));
		} else if (this.isTransformerOperation(parsed)) {
			this.operations = [this.validateOperation(parsed)];
		} else {
			throw new Error('Invalid transformer file format');
		}

		this.dirty = false;
	}

	private isTransformerOperation(obj: any): obj is TransformerOperation {
		return obj && typeof obj.id === 'string' &&
			typeof obj.name === 'string' &&
			Object.values(OperationType).includes(obj.type) &&
			Object.values(OperationState).includes(obj.state);
	}

	private validateOperation(op: any): TransformerOperation {
		if (!this.isTransformerOperation(op)) {
			throw new Error('Invalid operation format');
		}

		// Type-specific validation
		switch (op.type) {
			case OperationType.UI:
				return this.validateUIOperation(op);
			case OperationType.AI:
				return this.validateAIOperation(op);
			case OperationType.Tool:
				return this.validateToolOperation(op);
			case OperationType.Link:
				return this.validateLinkOperation(op);
			default:
				throw new Error(`Unknown operation type: ${op.type}`);
		}
	}

	private validateUIOperation(op: any): UIOperation {
		if (!Object.values(UIElementType).includes(op.uiType)) {
			throw new Error('Invalid UI operation');
		}
		return op as UIOperation;
	}

	private validateAIOperation(op: any): AIOperation {
		if (!op.promptFile || !Array.isArray(op.inputs)) {
			throw new Error('Invalid AI operation');
		}
		return op as AIOperation;
	}

	private validateToolOperation(op: any): ToolOperation {
		if (!op.toolType) {
			throw new Error('Invalid tool operation');
		}
		return op as ToolOperation;
	}

	private validateLinkOperation(op: any): LinkOperation {
		if (!op.target || !Object.values(LinkTargetType).includes(op.targetType)) {
			throw new Error('Invalid link operation');
		}
		return op as LinkOperation;
	}

	async save(): Promise<void> {
		await this.fileService.writeFile(
			this.uri,
			VSBuffer.fromString(JSON.stringify(this.operations, null, 2))
		);
		this.dirty = false;
	}

	isDirty(): boolean {
		return this.dirty;
	}
}

export class TransformerInput extends EditorInput {
	static readonly TypeID: string = 'workbench.input.transformer';
	static readonly EditorID: string = 'workbench.editor.transformer';

	private readonly _model: TransformerModel;

	constructor(
		private readonly uri: URI,
		@IInstantiationService instantiationService: IInstantiationService
	) {
		super();
		this._model = instantiationService.createInstance(TransformerModel, uri);
	}

	get model(): TransformerModel { return this._model; }

	override getName(): string {
		const path = this.uri.path;
		return path.substring(path.lastIndexOf('/') + 1);
	}

	override get editorId(): string {
		return TransformerInput.EditorID;
	}

	override get typeId(): string { return TransformerInput.TypeID; }

	override get resource(): URI { return this.uri; }

	override isDirty(): boolean {
		return this._model.isDirty();
	}

	override async revert(): Promise<void> {
		await this._model.load();
	}

	override async save(group: GroupIdentifier, options?: ISaveOptions): Promise<EditorInput | IUntypedEditorInput | undefined> {
		return this;
	}
}

export class TransformerSerializer implements IEditorSerializer {
	canSerialize(editorInput: TransformerInput): boolean {
		return true;
	}

	serialize(input: TransformerInput): string {
		return '';
	}

	deserialize(instantiationService: IInstantiationService): TransformerInput {
		return instantiationService.createInstance(new SyncDescriptor(TransformerInput, [URI.from({ scheme: 'trans', path: `/transformer.trans` })]));
	}
}
