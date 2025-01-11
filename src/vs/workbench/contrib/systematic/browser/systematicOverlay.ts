import { Disposable } from '../../../../base/common/lifecycle.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { $, append } from '../../../../base/browser/dom.js';

export class SystematicOverlay extends Disposable {
	private static readonly OVERLAY_ID = 'systematic-overlay';
	private container: HTMLElement | null = null;

	constructor(
		@IWorkbenchLayoutService private readonly layoutService: IWorkbenchLayoutService
	) {
		super();
	}

	show(): void {
		if (!this.container) {
			const workbenchContainer = this.layoutService.activeContainer;
			this.container = append(workbenchContainer, $('.systematic-overlay'));
			this.container.id = SystematicOverlay.OVERLAY_ID;

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

			// Add visible class after a frame to trigger transition
			setTimeout(() => this.container?.classList.add('visible'), 0);
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
				}
			}, 200); // Match transition duration
		}
	}

	override dispose(): void {
		this.hide();
		super.dispose();
	}
}
