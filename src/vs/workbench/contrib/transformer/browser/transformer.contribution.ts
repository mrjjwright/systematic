import { RawContextKey, IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { Disposable, IDisposable } from '../../../../base/common/lifecycle.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IWorkbenchContribution, registerWorkbenchContribution2, WorkbenchPhase } from '../../../common/contributions.js';
import { ViewPane } from '../../../browser/parts/views/viewPane.js';
import { ViewPaneContainer } from '../../../browser/parts/views/viewPaneContainer.js';
import { IWorkbenchLayoutService, } from '../../../services/layout/browser/layoutService.js';
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
import { TestIdPathParts } from '../../testing/common/testId.js';


const transformerViewIcon = registerIcon('transformer-view-icon', Codicon.rocket, localize('transformerViewIcon', 'View icon of the transformer view.'));


export const enum TransformerLinkType {
	ContextKey = 'contextKey',
	Operation = 'operation'
}

export interface IOpLinkBase {
	type: TransformerLinkType;
	paramName: string;
}

// Specific link type for context keys
export interface IContextKeyLink extends IOpLinkBase {
	type: TransformerLinkType.ContextKey;
	contextKey: string;
}

// Specific link type for operation jumps
export interface IOpLink extends IOpLinkBase {
	type: TransformerLinkType.Operation;
	targetOperationId: string;
}

// Operation parameter that can be linked
export interface IOpParam {
	name: string;
	value?: any;
	link?: IContextKeyLink | IOpLink;
}

// Operation types for the transformer
export interface IOpCall {
	callId: string;
	opDefId: string;
	description: string;
	params: IOpParam[];
	type: string; // Type of operation
}

export interface ITransformerRunRequest extends ICallProfileRunHandler {
	runId: string;
}

export type IOpImpl = (accessor: ServicesAccessor, operation: IOpCall, params: IOpParam[]) => Promise<void>;

// Add new interfaces for operation registry
export interface IOpDef {
	id: string;
	description: string;
	parameterSchema: {
		type: 'string' | 'boolean' | 'number';
		name: string;
		description: string;
		required: boolean;
		defaultValue?: any;
	}[];
	impl: IOpImpl;
	validateParams?: (params: IOpParam[]) => string | undefined;
}

export class OpRegistry {
	private readonly _opDefs = new Map<string, IOpDef>();

	registerOpDef(def: IOpDef): void {
		if (this._opDefs.has(def.id)) {
			throw new Error(`Operation ${def.id} already registered`);
		}

		for (const param of def.parameterSchema) {
			if (!param.name || !param.type) {
				throw new Error(`Invalid parameter schema in operation ${def.id}`);
			}
		}

		this._opDefs.set(def.id, def);
	}

	getOp(id: string): IOpDef | undefined {
		return this._opDefs.get(id);
	}

	validateOpCall(opCall: IOpCall): string | undefined {
		const def = this._opDefs.get(opCall.opDefId);
		if (!def) { return `Unknown operation type: ${opCall.opDefId}`; }

		for (const paramDef of def.parameterSchema) {
			if (paramDef.required) {
				const param = opCall.params.find(p => p.name === paramDef.name);
				if (!param) {
					return `Missing required parameter: ${paramDef.name}`;
				}
			}
		}

		return def.validateParams?.(opCall.params);
	}
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
	private readonly operationRegistry = new OpRegistry();
	// Store operations for lookup
	private readonly operations = new Map<string, IOpCall>();

	constructor(
		@IContextKeyService contextKeyService: IContextKeyService,
		@ILogService private readonly logService: ILogService,
		@ITestService private readonly testService: ITestService,
		@ITestProfileService private readonly testProfileService: ITestProfileService,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
	) {
		super();
		contextKeyService.createKey(IS_TRANSFORMER_ENABLED.key, true);
		this.logService.info('Transformer initialized');

		this.registerViewlet();
		this.registerTestController();
		this.registerOperations();
	}

	getOperation(operationId: string): IOpCall | undefined {
		return this.operations.get(operationId);
	}

	static TRANSFORMER_CONTROLLER_ID = 'workbench.transformer.testController';


	private registerTestController(): void {
		const that = this;

		const myController: IMainThreadTestController = {
			id: TransformerContribution.ID,
			label: testControllerLabel,
			capabilities: testControllerCapabilities,

			async syncTests(token: CancellationToken) {

				// First create root node
				const rootNode: ITestItem = {
					extId: TransformerContribution.ID,
					label: 'Hello World Program',
					tags: [],
					busy: false,
					range: null,
					uri: undefined,
					description: 'A simple hello world demo program',
					error: null,
					sortText: null
				};

				// Add root first
				const rootDiff: TestsDiff = [{
					op: TestDiffOpType.Add,
					item: {
						controllerId: TransformerContribution.ID,
						expand: TestItemExpandState.Expanded,
						item: rootNode
					}
				}];

				that.testService.publishDiff(TransformerContribution.ID, rootDiff);

			},

			async refreshTests(token: CancellationToken) {
				return this.syncTests(token);
			},

			async runTests(request: IStartControllerTests[], token: CancellationToken): Promise<IStartControllerTestsResult[]> {
				for (const req of request) {
					for (const testIdString of req.testIds) {
						const operation = that.getOperation(testIdString);
						if (operation) {
							that.instantiationService.invokeFunction(accessor => runOperation(accessor, that.operationRegistry, operation));
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

		// Add a run profile for the controller
		that.testProfileService.addProfile(myController, {
			controllerId: TransformerContribution.ID,
			profileId: 1,
			label: 'Run Transformer Operations',
			group: TestRunProfileBitset.Run,
			hasConfigurationHandler: false,
			isDefault: true,
			supportsContinuousRun: false,
			tag: null
		});


		this.testControllerRegistration = this.testService.registerTestController(TransformerContribution.ID, myController);
		const ct = CancellationToken.None;
		myController.syncTests(ct);
		this._register(this.testControllerRegistration);
	}

	private registerViewlet(): void {
		const viewContainerRegistry = Registry.as<IViewContainersRegistry>(Extensions.ViewContainersRegistry);
		const viewsRegistry = Registry.as<IViewsRegistry>(Extensions.ViewsRegistry);

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


	private registerOperations(): void {
		// Register set context operation
		this.operationRegistry.registerOpDef({
			id: formExtOperationId(TransformerContribution.TRANSFORMER_CONTROLLER_ID, OPERATION_SET_CONTEXT),
			description: 'Sets a context key value',
			parameterSchema: [{
				type: 'string',
				name: 'key',
				description: 'Context key to set',
				required: true
			}, {
				type: 'string',
				name: 'value',
				description: 'Value to set',
				required: true
			}],
			impl: async (accessor: ServicesAccessor, _: IOpCall, params: IOpParam[]): Promise<void> => {
				const contextKeyService = accessor.get(IContextKeyService);
				const key = params.find(p => p.name === 'key')?.value;
				const value = params.find(p => p.name === 'value')?.value;

				if (key && value !== undefined) {
					contextKeyService.createKey(key, value);
				}
			}
		});

		// Register show dialog operation
		this.operationRegistry.registerOpDef({
			id: formExtOperationId(TransformerContribution.TRANSFORMER_CONTROLLER_ID, OPERATION_SHOW_DIALOG),
			description: 'Shows a dialog with the specified text',
			parameterSchema: [{
				type: 'string',
				name: 'text',
				description: 'Text to show in the dialog',
				required: true
			}, {
				type: 'string',
				name: 'level',
				description: 'Dialog level (Info, Warning, Error)',
				required: false,
				defaultValue: 'Info'
			}],
			impl: async (accessor: ServicesAccessor, _: IOpCall, params: IOpParam[]): Promise<void> => {
				const dialogService = accessor.get(IDialogService);
				const text = params.find(p => p.name === 'text')?.value;

				if (text) {


					await dialogService.info(text);
				}
			}
		});


		// Store operations for lookup
		const helloWorldProgram = createHelloWorldProgram(TransformerContribution.TRANSFORMER_CONTROLLER_ID);
		for (const operation of helloWorldProgram) {
			this.operations.set(operation.callId, operation);
		}
	}
}

registerWorkbenchContribution2(TransformerContribution.ID, TransformerContribution, WorkbenchPhase.BlockRestore);


// operation ids
export const OPERATION_SET_CONTEXT = 'setContext';
export const OPERATION_SHOW_DIALOG = 'showDialog';
export const OPERATION_START_CHAT = 'startChat';
export const OPERATION_READ_SHEET = 'readSheet';



/**
 * Resolves parameters for an operation by evaluating any linked context keys
 * @param operation The operation definition containing type and parameters
 * @returns An array of resolved parameters with linked values populated
 */
export function resolveParams(accessor: ServicesAccessor, operation: IOpCall) {
	const contextKeyService = accessor.get(IContextKeyService);

	return operation.params.map(param => {
		if (param.link?.type === TransformerLinkType.ContextKey) {
			return {
				...param,
				value: contextKeyService.getContextKeyValue(param.link.contextKey)
			};
		}
		return param;
	});
}

/**
 * Runs an operation after resolving parameters
 * @param accessor The services accessor
 * @param registry The operation registry
 * @param operation The operation definition
 * @returns A promise that resolves to the operation result
 */
export async function runOperation(
	accessor: ServicesAccessor,
	registry: OpRegistry,
	operation: IOpCall
) {
	const def = registry.getOp(operation.opDefId);
	if (!def) {
		throw new Error(`Unknown operation type: ${operation.opDefId}`);
	}

	const error = registry.validateOpCall(operation);
	if (error) {
		throw new Error(`Invalid operation: ${error}`);
	}

	const resolvedParams = resolveParams(accessor, operation);
	return def.impl(accessor, operation, resolvedParams);
}

export function operationToTestItem(operation: IOpCall): ITestItem {
	return {
		extId: operation.callId,
		label: operation.type,
		tags: [],
		busy: false,
		range: null,
		uri: undefined,
		description: operation.description,
		error: null,
		sortText: null
	};
}

export function formExtOperationId(controllerId: string, operationId: string) {
	return `${controllerId}${TestIdPathParts.Delimiter}${operationId}`;
}

export function createHelloWorldProgram(controllerId: string) {
	const helloWorldProgram: IOpCall[] = [
		{
			callId: formExtOperationId(TransformerContribution.TRANSFORMER_CONTROLLER_ID, 'setContext'),
			description: 'Sets a welcome message in context',
			opDefId: formExtOperationId(TransformerContribution.TRANSFORMER_CONTROLLER_ID, OPERATION_SET_CONTEXT),
			type: 'setContext',
			params: [{
				name: 'key',
				value: 'message'
			}, {
				name: 'value',
				value: 'Hello from Transformer!'
			}]
		},
		{
			callId: formExtOperationId(TransformerContribution.TRANSFORMER_CONTROLLER_ID, 'showDialog'),
			description: 'Shows the welcome message in a dialog',
			opDefId: formExtOperationId(TransformerContribution.TRANSFORMER_CONTROLLER_ID, OPERATION_SHOW_DIALOG),
			type: 'showDialog',
			params: [{
				name: 'text',
				link: {
					type: TransformerLinkType.ContextKey,
					paramName: 'text',
					contextKey: 'message'
				}
			}, {
				name: 'level',
				value: 'Info'
			}]
		},
		// {
		// 	extId: formExtOperationId(TransformerContribution.TRANSFORMER_CONTROLLER_ID, 'startChat'),
		// 	description: 'Opens chat and requests a poem',
		// 	type: 'startChat',
		// 	params: [] // Using default 'write a poem' prompt
		// },
		// {
		// 	extId: formExtOperationId(TransformerContribution.TRANSFORMER_CONTROLLER_ID, 'readSheet'),
		// 	description: 'Reads a cell from a spreadsheet and shows the result in a dialog',
		// 	type: 'readSheet',
		// 	params: []
		// }
	];

	return helloWorldProgram;
}
