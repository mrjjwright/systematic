import { CancellationToken } from '../../../../base/common/cancellation.js';
import { IEditorOptions } from '../../../../platform/editor/common/editor.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { EditorPane } from '../../../browser/parts/editor/editorPane.js';
import { TreeView } from '../../../browser/parts/views/treeView.js';
import { IEditorOpenContext } from '../../../common/editor.js';
import { ITreeItem, ITreeViewDataProvider, TreeItemCollapsibleState } from '../../../common/views.js';
import { IEditorGroup } from '../../../services/editor/common/editorGroupsService.js';
import { TransformerInput } from './transformerInput.js';

export class TransformerEditor extends EditorPane {
	static readonly ID = 'transformerEditor';

	private treeView: TreeView | undefined;
	private content: HTMLElement | undefined;

	constructor(
		group: IEditorGroup,
		@ITelemetryService telemetryService: ITelemetryService,
		@IThemeService themeService: IThemeService,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IStorageService storageService: IStorageService,
	) {
		super(TransformerEditor.ID, group, telemetryService, themeService, storageService);
	}


	protected createEditor(parent: HTMLElement): void {
		this.content = document.createElement('div');
		this.content.classList.add('transformer-editor');
		parent.appendChild(this.content);

		// Create tree view
		this.createTreeView();
	}

	private createTreeView(): void {
		const dataProvider: ITreeViewDataProvider = {
			getChildren: async (element?: ITreeItem): Promise<ITreeItem[] | undefined> => {
				if (!element) {
					return [
						{
							handle: 'item1',
							label: { label: 'Item 1' },
							collapsibleState: TreeItemCollapsibleState.Expanded
						},
						{
							handle: 'item2',
							label: { label: 'Item 2' },
							collapsibleState: TreeItemCollapsibleState.Collapsed
						}
					];
				}
				if (element.handle === 'item1') {
					return [
						{
							handle: 'item1.1',
							label: { label: 'Item 1.1' },
							collapsibleState: TreeItemCollapsibleState.None
						}
					];
				}
				return undefined;
			},
		};

		this.treeView = this.instantiationService.createInstance(
			TreeView,
			'transformer.treeView',
			'Hello World'
		);

		this.treeView.dataProvider = dataProvider;
	}

	layout(dimension: any): void {
		if (this.treeView) {
			this.treeView.layout(dimension.height, dimension.width);
		}
	}

	override async setInput(
		input: TransformerInput,
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
