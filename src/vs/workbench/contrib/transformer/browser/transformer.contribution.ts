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
import { IInstantiationService, ServicesAccessor } from '../../../../platform/instantiation/common/instantiation.js';
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
import { ITestProfileService } from '../../../../workbench/contrib/testing/common/testProfileService.js';
import { TestId } from '../../../../workbench/contrib/testing/common/testId.js';

export const enum TransformerLinkType {
	ContextKey = 'contextKey',
	Operation = 'operation'
}

export interface ITransformerLink {
	type: TransformerLinkType;
	sourceParamName: string;
}

// Specific link type for context keys
export interface IContextKeyLink extends ITransformerLink {
	type: TransformerLinkType.ContextKey;
	targetContextKey: string;
}

// Specific link type for operation jumps
export interface IOperationLink extends ITransformerLink {
	type: TransformerLinkType.Operation;
	targetOperationId: string;
}

// Operation parameter that can be linked
export interface ITransformerParam {
	name: string;
	value?: any;
	link?: IContextKeyLink | IOperationLink;
}

// Operation types for the transformer
export interface ITransformerOperation {
	id: string;
	type: 'setContext'
	| 'showDialog'
	| 'uiClear'
	| 'uiButton'
	| 'uiText';
	params: ITransformerParam[];
}

export interface ITransformerRunRequest extends ICallProfileRunHandler {
	runId: string;
}

export type IOperationImpl = (accessor: ServicesAccessor, operation: ITransformerOperation, params: ITransformerParam[]) => Promise<void>;


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

class ViewOperationPane extends ViewPane {
	static readonly ID = 'transformer.operation';
	protected override renderBody(container: HTMLElement): void {
		super.renderBody(container);
		container.textContent = 'Operation';
	}
}

export class TransformerContribution extends Disposable implements IWorkbenchContribution {
	static readonly ID = 'workbench.contrib.transformer';
	private testControllerRegistration: IDisposable | undefined;
	private readonly contextKeyService: IContextKeyService;
	private operations: Map<string, ITransformerOperation> = new Map();

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

				// Create and store the operations
				const setContextOp: ITransformerOperation = {
					id: `${controllerId}\0setContext`,
					type: 'setContext',
					params: [{
						name: 'key',
						value: 'message'
					}, {
						name: 'value',
						value: 'Hello from Transformer!'
					}]
				};

				const showDialogOp: ITransformerOperation = {
					id: `${controllerId}\0showDialog`,
					type: 'showDialog',
					params: [{
						name: 'message',
						link: {
							type: TransformerLinkType.ContextKey,
							sourceParamName: 'message',
							targetContextKey: 'message'
						}
					}]
				};

				// Store the operations
				that.addOperation(setContextOp);
				that.addOperation(showDialogOp);

				// Then add operations as children using TestId to join paths
				const operations: TestsDiff = [
					// Add our Hello World operations first
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
								description: 'Shows a message dialog using linked message',
								error: null,
								sortText: null
							}
						}
					},
					// Existing UI operations
					{
						op: TestDiffOpType.Add,
						item: {
							controllerId,
							expand: TestItemExpandState.NotExpandable,
							item: {
								extId: `${controllerId}\0uiClear`,
								label: 'UI Clear',
								tags: [],
								busy: false,
								range: null,
								uri: undefined,
								description: 'Clears the UI pane',
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
								extId: `${controllerId}\0uiText`,
								label: 'UI Text',
								tags: [],
								busy: false,
								range: null,
								uri: undefined,
								description: 'Adds text to the UI pane',
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
								extId: `${controllerId}\0uiButton`,
								label: 'UI Button',
								tags: [],
								busy: false,
								range: null,
								uri: undefined,
								description: 'Adds a button to the UI pane',
								error: null,
								sortText: null
							}
						}
					}
				];

				// Publish operations
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
						const localId = TestId.localId(testIdString);
						const operation = that.getOperation(testIdString);

						switch (localId) {
							case 'setContext': {
								// Show input dialog and update context key with result
								const result = await that.dialogService.input({
									title: 'Set Message',
									message: 'Enter a message to store in context',
									inputs: [{
										type: 'text',
										value: 'Hello from Transformer!'
									}]
								});

								if (result.confirmed && result.values?.[0]) {
									that.contextKeyService.createKey('message', result.values[0]);
								}
								break;
							}

							case 'showDialog': {
								// Check for links in the operation
								const messageParam = operation?.params.find(p => p.name === 'message');
								const messageLink = messageParam?.link as IContextKeyLink;

								let message: string | undefined;
								if (messageLink) {
									// Get value from linked context key
									message = that.contextKeyService.getContextKeyValue<string>(messageLink.targetContextKey);
								}

								if (message) {
									that.dialogService.info('Message', message);
								}
								break;
							}

							case 'uiClear':
								that.logService.info('UI cleared (placeholder)');
								break;

							case 'uiText':
								that.logService.info('UI text added (placeholder)');
								break;

							case 'uiButton':
								that.logService.info('UI button added (placeholder)');
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
				id: 'transformer.program',
				name: localize2('transformer.program', 'Program'),
				ctorDescriptor: new SyncDescriptor(View2Pane),
				canToggleVisibility: true,
				hideByDefault: false,
				canMoveView: true,
				weight: 100
			},
			{
				id: 'transformer.operation',
				name: localize2('transformer.operation', 'Operation'),
				ctorDescriptor: new SyncDescriptor(ViewOperationPane),
				canToggleVisibility: true,
				hideByDefault: false,
				canMoveView: true,
				weight: 99
			},
			{
				id: 'transformer.context',
				name: localize2('transformer.context', 'Context'),
				ctorDescriptor: new SyncDescriptor(View1Pane),
				canToggleVisibility: true,
				hideByDefault: false,
				canMoveView: true,
				weight: 98,
			},
			{
				id: 'transformer.ui',
				name: localize2('transformer.ui', 'UI'),
				ctorDescriptor: new SyncDescriptor(View3Pane),
				canToggleVisibility: true,
				hideByDefault: false,
				canMoveView: true,
				weight: 97
			},
		], VIEW_CONTAINER);
	}

	// Helper to get operation details
	private getOperation(testId: string): ITransformerOperation | undefined {
		return this.operations.get(testId);
	}

	// Add helper to store operations
	private addOperation(operation: ITransformerOperation): void {
		this.operations.set(operation.id, operation);
	}

}

registerWorkbenchContribution2(TransformerContribution.ID, TransformerContribution, WorkbenchPhase.BlockRestore);


// operation ids
export const OPERATION_SET_CONTEXT = 'setContext';
export const OPERATION_SHOW_DIALOG = 'showDialog';

// operation implementations

const someOperationImpls: Map<string, IOperationImpl> = new Map();

const showDialogImpl: IOperationImpl = async (accessor: ServicesAccessor, _: ITransformerOperation, params: ITransformerParam[]) => {
	const dialogService = accessor.get(IDialogService);
	const text = params.find(p => p.name === 'text')?.value;
	const level = params.find(p => p.name === 'level')?.value ?? 'Info';

	if (!text) { throw new Error('Missing text parameter'); }
	return dialogService.info(level, text);
};


const setContextImpl: IOperationImpl = async (accessor: ServicesAccessor, _: ITransformerOperation, params: ITransformerParam[]) => {
	const contextKeyService = accessor.get(IContextKeyService);
	const key = params.find(p => p.name === 'key')?.value;
	const value = params.find(p => p.name === 'value')?.value;

	if (!key) { throw new Error('Missing key parameter'); }
	contextKeyService.createKey(key, value);
};

someOperationImpls.set(OPERATION_SET_CONTEXT, setContextImpl);
someOperationImpls.set(OPERATION_SHOW_DIALOG, showDialogImpl);

/**
 * Resolves parameters for an operation by evaluating any linked context keys
 * @param operation The operation definition containing type and parameters
 * @returns An array of resolved parameters with linked values populated
 */
export function resolveParams(accessor: ServicesAccessor, operation: ITransformerOperation) {
	const contextKeyService = accessor.get(IContextKeyService);

	return operation.params.map(param => {
		if (param.link?.type === TransformerLinkType.ContextKey) {
			return {
				...param,
				value: contextKeyService.getContextKeyValue(param.link.targetContextKey)
			};
		}
		return param;
	});
}

export async function runOperation(accessor: ServicesAccessor, operation: ITransformerOperation) {
	const resolvedParams = resolveParams(accessor, operation);

	const impl = someOperationImpls.get(operation.type);
	if (!impl) { throw new Error(`Unknown operation type: ${operation.type}`); }
	return impl(accessor, operation, resolvedParams);
}


// a little hello world program
export const helloWorldProgram: ITransformerOperation[] = [
	{
		id: 'setContext',
		type: OPERATION_SET_CONTEXT,
		params: [{
			name: 'key',
			value: 'message'
		}, {
			name: 'value',
			value: 'Hello from Transformer!'
		}]
	},
	{
		id: 'showDialog',
		type: OPERATION_SHOW_DIALOG,
		params: [{
			name: 'text',
			link: {
				type: TransformerLinkType.ContextKey,
				sourceParamName: 'text',
				targetContextKey: 'message'
			}
		}, {
			name: 'level',
			value: 'Info'
		}]
	}
];
