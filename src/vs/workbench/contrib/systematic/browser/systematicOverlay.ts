import { Disposable } from '../../../../base/common/lifecycle.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { $, append } from '../../../../base/browser/dom.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { TreeView, } from '../../../browser/parts/views/treeView.js';
import { ITreeItem, TreeItemCollapsibleState } from '../../../common/views.js';
import { localize2, ILocalizedString } from '../../../../nls.js';

export const TREE_VIEW_TITLE: ILocalizedString = localize2('sysematic.tree.title', "Test Tree");

export class SystematicOverlay extends Disposable {
	private static readonly SYSTEMATIC_OVERLAY_ID = 'systematic-overlay';
	static readonly SYSTEMATIC_TREE_ID = 'systematic-tree';
	private container: HTMLElement | null = null;
	private treeView: TreeView | null = null;

	constructor(
		@IWorkbenchLayoutService private readonly layoutService: IWorkbenchLayoutService,
		@IInstantiationService private readonly instantiationService: IInstantiationService
	) {
		super();
	}

	registerViews() {
		this.treeView = this._register(this.instantiationService.createInstance(TreeView, SystematicOverlay.SYSTEMATIC_TREE_ID, 'Systematic'));

		// Set up simple data provider with static data
		this.treeView.dataProvider = {
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
			}
		};
	}

	show(): void {
		if (!this.container) {
			const workbenchContainer = this.layoutService.activeContainer;
			this.container = append(workbenchContainer, $('.systematic-overlay'));
			this.container.id = SystematicOverlay.SYSTEMATIC_OVERLAY_ID;

			// Position the overlay
			this.container.style.position = 'absolute';
			this.container.style.top = '10%';
			this.container.style.left = '10%';
			this.container.style.width = '80%';
			this.container.style.height = '80%';
			this.container.style.backgroundColor = 'var(--vscode-editor-background)';
			this.container.style.zIndex = '1000';
			this.container.style.display = 'flex';
			this.container.style.flexDirection = 'column';

			// Create tree container with explicit dimensions
			const treeContainer = append(this.container, $('.systematic-tree-container'));
			treeContainer.style.flex = '1';
			treeContainer.style.display = 'flex';
			treeContainer.style.height = '100%';  // Important
			treeContainer.style.width = '100%';   // Important
			treeContainer.style.overflow = 'hidden'; // Let the tree handle scrolling

			this.registerViews();

			// Initialize tree view with layout
			this.treeView!.setVisibility(true);
			this.treeView!.show(treeContainer);

			// Important: Initial layout
			const dimension = this.getTreeDimension(treeContainer);
			this.treeView!.layout(dimension.height, dimension.width);

			// Register a layout listener
			this._register(this.layoutService.onDidLayoutActiveContainer(() => {
				const dimension = this.getTreeDimension(treeContainer);
				this.treeView!.layout(dimension.height, dimension.width);
			}));

			this.treeView!.refresh();
			this.container.classList.add('visible');
		}
	}

	private getTreeDimension(container: HTMLElement) {
		const width = container.clientWidth;
		const height = container.clientHeight;
		return { width, height };
	}

	hide(): void {
		if (this.container) {
			this.container.classList.remove('visible');
			// Remove after transition
			setTimeout(() => {
				if (this.container) {
					this.container.remove();
					this.container = null;
					this.treeView?.dispose();
					this.treeView = null;
				}
			}, 200); // Match transition duration
		}
	}

	override dispose(): void {
		this.hide();
		super.dispose();
	}
}

