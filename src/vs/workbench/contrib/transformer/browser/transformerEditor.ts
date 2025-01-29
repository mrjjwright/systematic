import { EditorPane } from '../../../browser/parts/editor/editorPane.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { TreeView } from '../../../browser/parts/views/treeView.js';
import { ITreeViewDataProvider } from '../../../common/views.js';
import { TransformerEditorInput, TransformerNode } from './transformerEditorInput.js';

export class TransformerEditor extends EditorPane {
	static readonly ID = 'transformerEditor';

	private treeView: TreeView | undefined;
	private content: HTMLElement | undefined;

	constructor(
		@ITelemetryService telemetryService: ITelemetryService,
		@IThemeService themeService: IThemeService,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IStorageService storageService: IStorageService,
		@IWorkbenchLayoutService layoutService: IWorkbenchLayoutService
	) {
		super(TransformerEditor.ID, telemetryService, themeService, storageService);
	}

	protected createEditor(parent: HTMLElement): void {
		this.content = document.createElement('div');
		this.content.classList.add('transformer-editor');
		parent.appendChild(this.content);

		// Create tree view
		this.createTreeView();
	}

	private createTreeView(): void {
		const dataProvider: ITreeViewDataProvider<TransformerNode> = {
			getChildren: (element?: TransformerNode) => {
				if (!element) {
					return (this.input as TransformerEditorInput).model.getNodes();
				}
				return [...element.inputs, ...element.outputs];
			},
			getTreeItem: (element: TransformerNode) => ({
				id: element.id,
				label: element.label,
				collapsibleState: element.inputs.length || element.outputs.length ? 1 : 0
			})
		};

		this.treeView = this.instantiationService.createInstance(
			TreeView,
			'transformer.treeView',
			this.content!
		);

		this.treeView.dataProvider = dataProvider;
	}

	layout(dimension: any): void {
		if (this.treeView) {
			this.treeView.layout(dimension.height, dimension.width);
		}
	}

	override async setInput(
		input: TransformerEditorInput,
		options: IEditorOptions | undefined,
		context: IEditorOpenContext,
		token: CancellationToken
	): Promise<void> {
		await super.setInput(input, options, context, token);
		if (this.treeView) {
			this.treeView.refresh();
		}
	}
}
