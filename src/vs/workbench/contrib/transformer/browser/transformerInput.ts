import { URI } from '../../../../base/common/uri.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { EditorInput } from '../../../common/editor/editorInput.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { GroupIdentifier, IEditorSerializer, ISaveOptions, IUntypedEditorInput } from '../../../common/editor.js';

export interface TransformerNode {
	id: string;
	type: string;
	label: string;
	inputs: string[];
	outputs: string[];
}

export class TransformerModel {
	private nodes: TransformerNode[] = [];
	private dirty = false;

	constructor(
		private readonly uri: URI,
		@IFileService private fileService: IFileService
	) { }

	getNodes(): TransformerNode[] {
		return this.nodes;
	}

	addNode(node: TransformerNode): void {
		this.nodes.push(node);
		this.dirty = true;
	}

	async load(): Promise<void> {
		const content = await this.fileService.readFile(this.uri);
		this.nodes = JSON.parse(content.value.toString());
		this.dirty = false;
	}

	async save(): Promise<void> {
		await this.fileService.writeFile(this.uri,
			VSBuffer.fromString(JSON.stringify(this.nodes, null, 2)));
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
