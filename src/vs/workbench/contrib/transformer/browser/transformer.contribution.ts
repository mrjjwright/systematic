import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { RawContextKey, IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IWorkbenchContribution, registerWorkbenchContribution2, WorkbenchPhase } from '../../../common/contributions.js';
import { ViewPane } from '../../../browser/parts/views/viewPane.js';
import { ViewPaneContainer } from '../../../browser/parts/views/viewPaneContainer.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { Extensions, IViewContainersRegistry, IViewDescriptorService, IViewsRegistry, ViewContainer, ViewContainerLocation } from '../../../common/views.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { localize, localize2 } from '../../../../nls.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { ServicesAccessor } from '../../../../editor/browser/editorExtensions.js';

export const IS_TRANSFORMER_ENABLED = new RawContextKey<boolean>('isTransformerEnabled', true);
export const IS_LINKING_MODE = new RawContextKey<boolean>('isTransformerLinkingMode', false);

class HelloWorldAction extends Action2 {
	constructor() {
		super({
			id: 'transformer.helloWorld',
			title: localize('transformer.helloWorld', 'Hello World'),
			menu: {
				id: MenuId.CommandPalette
			}
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const dialogService = accessor.get(IDialogService);
		const message = 'Hello World';
		await dialogService.info(message);
	}
}

class TransformerViewPaneContainer extends ViewPaneContainer {
	static ID: string = 'transformer.control.viewlet';

	constructor(
		@IWorkbenchLayoutService layoutService: IWorkbenchLayoutService,
		@ITelemetryService telemetryService: ITelemetryService,
		@IWorkspaceContextService contextService: IWorkspaceContextService,
		@IStorageService storageService: IStorageService,
		@IConfigurationService configurationService: IConfigurationService,
		@IInstantiationService instantiationService: IInstantiationService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IThemeService themeService: IThemeService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IExtensionService extensionService: IExtensionService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@ILogService logService: ILogService,
	) {
		super(TransformerViewPaneContainer.ID, { mergeViewWithContainerWhenSingleView: true }, instantiationService, configurationService, layoutService, contextMenuService, telemetryService, extensionService, themeService, storageService, contextService, viewDescriptorService, logService);
	}

	override create(parent: HTMLElement): void {
		super.create(parent);
		parent.classList.add('scm-viewlet');
	}
}

class View1Pane extends ViewPane {
	static readonly ID = 'transformer.view1';

	protected override renderBody(container: HTMLElement): void {
		super.renderBody(container);
		container.textContent = 'Context';
	}
}

class View2Pane extends ViewPane {
	static readonly ID = 'transformer.view2';

	protected override renderBody(container: HTMLElement): void {
		super.renderBody(container);
		container.textContent = 'Actions';
	}
}

class View3Pane extends ViewPane {
	static readonly ID = 'transformer.view3';

	protected override renderBody(container: HTMLElement): void {
		super.renderBody(container);
		container.textContent = 'UI';
	}
}

export class TransformerContribution extends Disposable implements IWorkbenchContribution {
	static readonly ID = 'workbench.contrib.transformer';

	constructor(
		@IContextKeyService contextKeyService: IContextKeyService,
		@ILogService private readonly logService: ILogService,
	) {
		super();
		contextKeyService.createKey(IS_TRANSFORMER_ENABLED.key, true);
		this.logService.info('Transformer initialized');
		this.registerActions();
		this.registerViewlet();
	}

	registerActions(): void {
		registerAction2(HelloWorldAction);
	}

	private registerViewlet(): void {
		const viewContainerRegistry = Registry.as<IViewContainersRegistry>(Extensions.ViewContainersRegistry);
		const viewsRegistry = Registry.as<IViewsRegistry>(Extensions.ViewsRegistry);
		const transformerViewIcon = registerIcon('transformer-view-icon', Codicon.rocket, localize('transformerViewIcon', 'View icon of the transformer view.'));

		// Register the viewlet (view container)
		const VIEWLET_ID = 'transformer.control.viewlet';
		const VIEW_CONTAINER: ViewContainer = viewContainerRegistry.registerViewContainer({
			id: VIEWLET_ID,
			title: localize2('transformer.control.viewlet', "Control"),
			ctorDescriptor: new SyncDescriptor(TransformerViewPaneContainer),
			icon: transformerViewIcon,
			alwaysUseContainerInfo: true,
			hideIfEmpty: true,
			order: 0,
			openCommandActionDescriptor: {
				id: VIEWLET_ID,
				title: localize2('transformer', "Transformer"),
				mnemonicTitle: localize('miViewTransformer', "&&Control"),
				order: 0
			},
		}, ViewContainerLocation.Sidebar, { isDefault: true });

		// Register three views that equally share the available vertical space
		viewsRegistry.registerViews([
			{
				id: 'transformer.context',
				name: localize2('transformer.context', 'Context'),
				ctorDescriptor: new SyncDescriptor(View1Pane),
				canToggleVisibility: true,
				hideByDefault: false,
				canMoveView: true,
				weight: 100,
			},
			{
				id: 'transformer.actions',
				name: localize2('transformer.actions', 'Actions'),
				ctorDescriptor: new SyncDescriptor(View2Pane),
				canToggleVisibility: true,
				hideByDefault: false,
				canMoveView: true,
				weight: 100
			},
			{
				id: 'transformer.ui',
				name: localize2('transformer.ui', 'UI'),
				ctorDescriptor: new SyncDescriptor(View3Pane),
				canToggleVisibility: true,
				hideByDefault: false,
				canMoveView: true,
				weight: 100
			},
		], VIEW_CONTAINER);
	}
}

registerWorkbenchContribution2(TransformerContribution.ID, TransformerContribution, WorkbenchPhase.BlockRestore);
