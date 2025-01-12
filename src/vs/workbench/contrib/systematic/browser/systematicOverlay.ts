import { Disposable } from '../../../../base/common/lifecycle.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { $, append } from '../../../../base/browser/dom.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { TreeView, TreeViewPane } from '../../../browser/parts/views/treeView.js';
import { Extensions, ITreeItem, ITreeViewDescriptor, IViewContainersRegistry, IViewsRegistry, TreeItemCollapsibleState, ViewContainerLocation } from '../../../common/views.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { localize2, ILocalizedString } from '../../../../nls.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { ViewPaneContainer } from '../../../browser/parts/views/viewPaneContainer.js';

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
		this.registerViews();
	}

	registerViews() {
		this.treeView = this._register(this.instantiationService.createInstance(TreeView, SystematicOverlay.SYSTEMATIC_TREE_ID, 'Systematic'));

		const ViewContainerRegistry = Registry.as<IViewContainersRegistry>(Extensions.ViewContainersRegistry);

		const viewContainer = ViewContainerRegistry.registerViewContainer({ id: 'test', title: localize2('test', 'test'), ctorDescriptor: new SyncDescriptor(ViewPaneContainer, ['workbench.view.systematic']) }, ViewContainerLocation.Sidebar);

		const viewDescriptor: ITreeViewDescriptor = {
			id: SystematicOverlay.SYSTEMATIC_TREE_ID,
			name: TREE_VIEW_TITLE,
			ctorDescriptor: new SyncDescriptor(TreeViewPane),
			canToggleVisibility: true,
			canMoveView: false,
			treeView: this.treeView,
			collapsed: false,
			order: 100,
			hideByDefault: true,
		};

		Registry.as<IViewsRegistry>(Extensions.ViewsRegistry).registerViews([viewDescriptor], viewContainer);

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

			// Style the overlay to cover 80% of the workbench
			this.container.style.position = 'absolute';
			this.container.style.top = '10%';
			this.container.style.left = '10%';
			this.container.style.width = '80%';
			this.container.style.height = '80%';
			this.container.style.backgroundColor = 'var(--vscode-editor-background)';
			this.container.style.zIndex = '1000';
			this.container.style.boxShadow = '0 0 8px var(--vscode-widget-shadow)';
			this.container.style.borderRadius = '6px';
			this.container.style.padding = '20px';
			this.container.style.display = 'flex';
			this.container.style.flexDirection = 'column';

			// Create tree view container
			const treeContainer = append(this.container, $('.systematic-tree-container'));
			treeContainer.style.flex = '1';
			treeContainer.style.overflow = 'auto';

			// Initialize tree view
			this.treeView!.setVisibility(true);
			this.treeView!.show(treeContainer);
			this.treeView!.refresh();
			this.container?.classList.add('visible');
		}
	}

	hide(): void {
		if (this.container) {
			this.container.classList.remove('visible');
			// Remove after transition
			setTimeout(() => {
				if (this.container) {
					this.container.remove();
					this.container = null;
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
