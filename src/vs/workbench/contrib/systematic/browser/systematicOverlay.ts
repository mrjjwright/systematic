import { Disposable } from '../../../../base/common/lifecycle.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { $, append } from '../../../../base/browser/dom.js';
import { GridView } from '../../../../base/browser/ui/grid/gridview.js';

export class SystematicOverlay extends Disposable {
	private static readonly SYSTEMATIC_OVERLAY_ID = 'systematic-overlay';
	private container: HTMLElement | null = null;
	private gridView: GridView | null = null;

	constructor(
		@IWorkbenchLayoutService private readonly layoutService: IWorkbenchLayoutService,
	) {
		super();
	}

	createGridView(inContainer: HTMLElement): GridView {
		this.gridView = this._register(new GridView());

		// Set up simple data provider with static data
		const view1 = {
			element: document.createElement('div'),
			minimumWidth: 100,
			maximumWidth: Number.POSITIVE_INFINITY,
			minimumHeight: 100,
			maximumHeight: Number.POSITIVE_INFINITY,
			onDidChange: () => { return { dispose: () => { } }; },
			layout: (width: number, height: number) => {
				this.gridView!.layout(width, height);
			}
		};

		const view2 = {
			element: document.createElement('div'),
			minimumWidth: 100,
			maximumWidth: Number.POSITIVE_INFINITY,
			minimumHeight: 100,
			maximumHeight: Number.POSITIVE_INFINITY,
			onDidChange: () => { return { dispose: () => { } }; },
			layout: (width: number, height: number) => {
				this.gridView!.layout(width, height);
			}
		};

		this.gridView.addView(view1, 200, [0]);
		this.gridView.addView(view2, 200, [1]);

		inContainer.appendChild(this.gridView.element);
		return this.gridView;
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

			// Create grid container with explicit dimensions
			const gridContainer = append(this.container, $('.systematic-grid-container'));
			gridContainer.style.flex = '1';
			gridContainer.style.display = 'flex';
			gridContainer.style.height = '100%';  // Important
			gridContainer.style.width = '100%';   // Important
			gridContainer.style.overflow = 'hidden'; // Let the grid handle scrolling

			this.createGridView(gridContainer);

			// Initialize grid view with layout
			this.gridView!.layout(gridContainer.clientWidth, gridContainer.clientHeight);

			// Register a layout listener
			this._register(this.layoutService.onDidLayoutActiveContainer(() => {
				this.gridView!.layout(gridContainer.clientWidth, gridContainer.clientHeight);
			}));

			this.container.classList.add('visible');
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
					this.gridView?.dispose();
					this.gridView = null;
				}
			}, 200); // Match transition duration
		}
	}

	override dispose(): void {
		this.hide();
		super.dispose();
	}
}
