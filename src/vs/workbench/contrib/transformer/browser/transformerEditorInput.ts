import { Emitter } from '../../../../base/common/event.js';
import { EditorInput } from '../../../common/editor/editorInput.js';
import { IWorkingCopySaveEvent } from '../../../services/workingCopy/common/workingCopy.js';

export interface TransformerNode {
	id: string;
	type: 'concat' | 'ai';
	label: string;
	inputs: TransformerNode[];
	outputs: TransformerNode[];
}

export class TransformerModel {
	private nodes: TransformerNode[] = [];

	constructor(private readonly uri: URI) {
		// Initialize with sample nodes for now
		this.nodes = [
			{
				id: 'concat1',
				type: 'concat',
				label: 'Concatenate Files',
				inputs: [],
				outputs: []
			},
			{
				id: 'ai1',
				type: 'ai',
				label: 'AI Processing',
				inputs: [],
				outputs: []
			}
		];
	}

	getNodes(): TransformerNode[] {
		return this.nodes;
	}

	async serialize(): Promise<any> {
		return {
			nodes: this.nodes
		};
	}
}

export class TransformerEditorInput extends EditorInput {
	static readonly ID = 'transformerEditor';

	private readonly _onDidChangeContent = this._register(new Emitter<void>());
	readonly onDidChangeContent = this._onDidChangeContent.event;

	private readonly _onDidSave = this._register(new Emitter<IWorkingCopySaveEvent>());
	readonly onDidSave = this._onDidSave.event;

	private dirty = false;
	private model: TransformerModel;

	constructor(
		private readonly modelUri: URI,
		private readonly backingUri: URI | undefined,
		@IModelService private readonly modelService: IModelService,
		@ITextFileService private readonly textFileService: ITextFileService,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IWorkingCopyService private readonly workingCopyService: IWorkingCopyService
	) {
		super();

		// Create model
		this.model = instantiationService.createInstance(TransformerModel, modelUri);

		// Register as working copy
		const workingCopyAdapter = new class implements IWorkingCopy {
			readonly typeId = 'transformerEditor';
			readonly resource = modelUri;
			readonly capabilities = WorkingCopyCapabilities.None;
			readonly onDidChangeDirty = input.onDidChangeDirty;
			readonly onDidChangeContent = input.onDidChangeContent;
			isDirty(): boolean { return input.isDirty(); }
			backup(token: CancellationToken): Promise<IWorkingCopyBackup> {
				return input.backup(token);
			}
			save(): Promise<boolean> {
				return input.save(0).then(editor => !!editor);
			}
		};

		this._register(this.workingCopyService.registerWorkingCopy(workingCopyAdapter));
	}

	// Required overrides
	override get typeId(): string { return TransformerEditorInput.ID; }
	override get resource(): URI { return this.backingUri || this.modelUri; }

	// Working copy support
	override isDirty(): boolean { return this.dirty; }

	// Serialization
	private async serializeForDisk(): Promise<string> {
		return JSON.stringify(await this.model.serialize());
	}

	// Save handling
	override async save(group: GroupIdentifier): Promise<EditorInput | undefined> {
		if (this.backingUri) {
			await this.textFileService.write(
				this.backingUri,
				await this.serializeForDisk()
			);
			this.dirty = false;
			this._onDidSave.fire({ reason: SaveReason.EXPLICIT });
			return this;
		}
		return undefined;
	}
}
