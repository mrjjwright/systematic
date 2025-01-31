import { ServicesAccessor } from '../../../../editor/browser/editorExtensions.js';
import { localize, localize2 } from '../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions, IViewContainersRegistry, IViewDescriptorService, IViewsRegistry, ViewContainer, ViewContainerLocation } from '../../../common/views.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { ViewPane } from '../../../browser/parts/views/viewPane.js';
import { ViewPaneContainer } from '../../../browser/parts/views/viewPaneContainer.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';

export class RegisterHelloWorld extends Action2 {
	constructor() {
		super({
			id: 'transformer.register',
			title: localize('transformer.register', 'Transformer register'),
			menu: {
				id: MenuId.CommandPalette
			}
		});
	}

	registerViewlet() {
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
				container.textContent = 'View 1';
			}
		}

		class View2Pane extends ViewPane {
			static readonly ID = 'transformer.view2';



			protected override renderBody(container: HTMLElement): void {
				super.renderBody(container);

				container.textContent = 'View 2';
			}
		}

		class View3Pane extends ViewPane {
			static readonly ID = 'transformer.view3';



			protected override renderBody(container: HTMLElement): void {
				super.renderBody(container);

				container.textContent = 'View 3';
			}
		}

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
				mnemonicTitle: localize({ key: 'miViewTransformer', comment: ['&& denotes a mnemonic'] }, "&&Contrl"),
				order: 0
			},
		}, ViewContainerLocation.Sidebar, { isDefault: true });

		// Register three views that equally share the available vertical space
		viewsRegistry.registerViews([
			{
				id: 'transformer.view1',
				name: localize2('view1', 'View 1'),
				ctorDescriptor: new SyncDescriptor(View1Pane),
				canToggleVisibility: true,
				hideByDefault: false,
				canMoveView: true,
				weight: 100,
			},
			{
				id: 'transformer.view2',
				name: localize2('view2', 'View 2'),
				ctorDescriptor: new SyncDescriptor(View2Pane),
				canToggleVisibility: true,
				hideByDefault: false,
				canMoveView: true,
				weight: 100
			},
			{
				id: 'transformer.view3',
				name: localize2('view3', 'View 3'),
				ctorDescriptor: new SyncDescriptor(View3Pane),
				canToggleVisibility: true,
				hideByDefault: false,
				canMoveView: true,
				weight: 100
			},
		], VIEW_CONTAINER);


	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const MessageContextKey = new RawContextKey<string>('message', 'Hello World', 'Message to display');
		const contextKeyService = accessor.get(IContextKeyService);
		contextKeyService.createKey(MessageContextKey.key, 'Hello World');

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
				const contextKeyService = accessor.get(IContextKeyService);
				const dialogService = accessor.get(IDialogService);
				const message = MessageContextKey.getValue(contextKeyService);
				if (message) {
					await dialogService.info(message);
				}
			}
		}

		registerAction2(HelloWorldAction);
		this.registerViewlet();
	}
}
