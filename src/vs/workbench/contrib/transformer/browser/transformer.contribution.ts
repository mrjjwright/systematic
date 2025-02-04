import { RawContextKey, IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { Disposable, IDisposable } from '../../../../base/common/lifecycle.js';
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
import { ITestService, IMainThreadTestController } from '../../../../workbench/contrib/testing/common/testService.js';
import { TestDiffOpType, TestsDiff, ITestItem, TestControllerCapability, TestItemExpandState, ICallProfileRunHandler, IStartControllerTests, IStartControllerTestsResult, TestRunProfileBitset } from '../../../../workbench/contrib/testing/common/testTypes.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { IObservable, observableValue } from '../../../../base/common/observable.js';
import { URI } from '../../../../base/common/uri.js';
import { ITestProfileService } from '../../../../workbench/contrib/testing/common/testProfileService.js';
import { TestId } from '../../../../workbench/contrib/testing/common/testId.js';

// Operation types for the transformer
export interface ITransformerOperation {
	id: string;
	type: 'setContext' | 'showDialog';
	params: {
		key?: string;
		value?: any;
		message?: string;
	};
}

export interface ITransformerRunRequest extends ICallProfileRunHandler {
	runId: string;
}

export const IS_TRANSFORMER_ENABLED = new RawContextKey<boolean>('isTransformerEnabled', true);
export const IS_LINKING_MODE = new RawContextKey<boolean>('isTransformerLinkingMode', false);

const testControllerLabel: IObservable<string> = observableValue('transformer.controller.label', 'Transformer Tests');
const testControllerCapabilities: IObservable<TestControllerCapability> = observableValue('transformer.controller.capabilities', TestControllerCapability.CodeRelatedToTest);

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
		super(
			TransformerViewPaneContainer.ID,
			{ mergeViewWithContainerWhenSingleView: true },
			instantiationService,
			configurationService,
			layoutService,
			contextMenuService,
			telemetryService,
			extensionService,
			themeService,
			storageService,
			contextService,
			viewDescriptorService,
			logService
		);
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
	private testControllerRegistration: IDisposable | undefined;
	private readonly contextKeyService: IContextKeyService;

	constructor(
		@IContextKeyService contextKeyService: IContextKeyService,
		@ILogService private readonly logService: ILogService,
		@ITestService private readonly testService: ITestService,
		@IDialogService private readonly dialogService: IDialogService,
		@ITestProfileService private readonly testProfileService: ITestProfileService,
	) {
		super();
		this.contextKeyService = contextKeyService;
		contextKeyService.createKey(IS_TRANSFORMER_ENABLED.key, true);
		this.logService.info('Transformer initialized');
		this.registerActions();
		this.registerViewlet();
		this.registerTestController();
	}

	private registerActions(): void {

	}

	private registerTestController(): void {
		const controllerId = 'workbench.transformer.testController';
		const that = this;

		const myController: IMainThreadTestController = {
			id: controllerId,
			label: testControllerLabel,
			capabilities: testControllerCapabilities,

			async syncTests(token: CancellationToken) {

				// First create root node
				const rootNode: ITestItem = {
					extId: controllerId,
					label: 'Hello World',
					tags: [],
					busy: false,
					range: null,
					uri: undefined,
					description: null,
					error: null,
					sortText: null
				};

				// Add root first
				const rootDiff: TestsDiff = [{
					op: TestDiffOpType.Add,
					item: {
						controllerId,
						expand: TestItemExpandState.Expanded,
						item: rootNode
					}
				}];

				that.testService.publishDiff(controllerId, rootDiff);

				// Then add operations as children using TestId to join paths
				const operations: TestsDiff = [
					{
						op: TestDiffOpType.Add,
						item: {
							controllerId,
							expand: TestItemExpandState.NotExpandable,
							item: {
								extId: `${controllerId}\0setContext`,
								label: 'Set Message Context',
								tags: [],
								busy: false,
								range: null,
								uri: undefined,
								description: 'Sets the message context key',
								error: null,
								sortText: null
							}
						}
					},
					{
						op: TestDiffOpType.Add,
						item: {
							controllerId,
							expand: TestItemExpandState.NotExpandable,
							item: {
								extId: `${controllerId}\0showDialog`,
								label: 'Show Message Dialog',
								tags: [],
								busy: false,
								range: null,
								uri: undefined,
								description: 'Shows a message dialog',
								error: null,
								sortText: null
							}
						}
					}
				];

				// Add children
				that.testService.publishDiff(controllerId, operations);

				// Add a run profile for the controller
				that.testProfileService.addProfile(myController, {
					controllerId,
					profileId: 1,
					label: 'Run Transformer Tests',
					group: TestRunProfileBitset.Run,
					hasConfigurationHandler: false,
					isDefault: true,
					supportsContinuousRun: false,
					tag: null
				});
			},
			async refreshTests(token: CancellationToken) {
				return this.syncTests(token);
			},

			async runTests(request: IStartControllerTests[], token: CancellationToken): Promise<IStartControllerTestsResult[]> {

				for (const req of request) {
					for (const testIdString of req.testIds) {
						// Get the local ID (part after the delimiter) to check which operation to run
						const localId = TestId.localId(testIdString);
						const message = that.contextKeyService.getContextKeyValue<string>('message');

						switch (localId) {
							case 'setContext':
								that.contextKeyService.createKey('message', 'Hello from Transformer!');
								break;

							case 'showDialog':
								if (message) {
									that.dialogService.info('Message', message);
								}
								break;
						}
					}
				}
				return [];
			},

			async expandTest(id: string, levels: number): Promise<void> {
				// Operations are not expandable
			},

			configureRunProfile(profileId: number): void {
				// No profiles needed for now
			},

			async getRelatedCode(testId: string, token: CancellationToken) {
				return [];
			},

			async startContinuousRun(request: IStartControllerTests[], token: CancellationToken): Promise<IStartControllerTestsResult[]> {
				return this.runTests(request, token);
			}
		};

		this.testControllerRegistration = this.testService.registerTestController(controllerId, myController);
		const ct = CancellationToken.None;
		myController.syncTests(ct);
		this._register(this.testControllerRegistration);
	}

	private registerViewlet(): void {
		const viewContainerRegistry = Registry.as<IViewContainersRegistry>(Extensions.ViewContainersRegistry);
		const viewsRegistry = Registry.as<IViewsRegistry>(Extensions.ViewsRegistry);
		const transformerViewIcon = registerIcon('transformer-view-icon', Codicon.rocket, localize('transformerViewIcon', 'View icon of the transformer view.'));

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
