import { RawContextKey, IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { Disposable, IDisposable } from '../../../../base/common/lifecycle.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IWorkbenchContribution, registerWorkbenchContribution2, WorkbenchPhase } from '../../../common/contributions.js';
import { ViewPane } from '../../../browser/parts/views/viewPane.js';
import { ViewPaneContainer } from '../../../browser/parts/views/viewPaneContainer.js';
import { IWorkbenchLayoutService, Parts } from '../../../services/layout/browser/layoutService.js';
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
import { IChatFollowup, IChatProgress, IChatService } from '../../../contrib/chat/common/chatService.js';
import {
	IChatAgentService,
	IChatAgent,
	ChatAgentLocation,
	IChatWelcomeMessageContent,
	IChatAgentResult,
	IChatAgentRequest,
	IChatAgentHistoryEntry
} from '../../../contrib/chat/common/chatAgents.js';
import { Event, Emitter } from '../../../../base/common/event.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { ExtensionIdentifier } from '../../../../platform/extensions/common/extensions.js';

const transformerViewIcon = registerIcon('transformer-view-icon', Codicon.rocket, localize('transformerViewIcon', 'View icon of the transformer view.'));
const transformerAiIcon = registerIcon('transformer-ai-icon', Codicon.sparkle, localize('transformerAIIcon', 'AI icon of the transformer view.'));


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
	extId: string;
	description: string;
	type: 'setContext'
	| 'showDialog'
	| 'uiClear'
	| 'uiButton'
	| 'uiText'
	| 'startChat';  // Add this new type
	params: ITransformerParam[];
}

export interface ITransformerRunRequest extends ICallProfileRunHandler {
	runId: string;
}

export type IOperationImpl = (accessor: ServicesAccessor, operation: ITransformerOperation, params: ITransformerParam[]) => Promise<void>;

// Add new interfaces for operation registry
export interface IOperationDefinition {
	id: string;
	description: string;
	type: string;
	parameterSchema: {
		type: 'string' | 'boolean' | 'number';
		name: string;
		description: string;
		required: boolean;
		defaultValue?: any;
	}[];
	impl: IOperationImpl;
	validateParams?: (params: ITransformerParam[]) => string | undefined;
}

export class OperationRegistry {
	private readonly _operations = new Map<string, IOperationDefinition>();

	registerOperation(def: IOperationDefinition): void {
		if (this._operations.has(def.id)) {
			throw new Error(`Operation ${def.id} already registered`);
		}

		for (const param of def.parameterSchema) {
			if (!param.name || !param.type) {
				throw new Error(`Invalid parameter schema in operation ${def.id}`);
			}
		}

		this._operations.set(def.id, def);
	}

	getOperation(id: string): IOperationDefinition | undefined {
		return this._operations.get(id);
	}

	validateOperation(op: ITransformerOperation): string | undefined {
		const def = this._operations.get(op.type);
		if (!def) { return `Unknown operation type: ${op.type}`; }

		for (const paramDef of def.parameterSchema) {
			if (paramDef.required) {
				const param = op.params.find(p => p.name === paramDef.name);
				if (!param) {
					return `Missing required parameter: ${paramDef.name}`;
				}
			}
		}

		return def.validateParams?.(op.params);
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

class TransformerChatAgent implements IChatAgent {
	static ID = 'transformer.chat';
	readonly id = TransformerChatAgent.ID;
	readonly extensionId = new ExtensionIdentifier('transformer.builtin');
	readonly extensionPublisherId = 'transformer';
	readonly extensionDisplayName = 'Transformer';
	readonly name = 'Transformer';
	readonly locations = [ChatAgentLocation.Panel, ChatAgentLocation.Editor, ChatAgentLocation.EditingSession];
	readonly displayName = 'Transformer Chat';
	readonly metadata = {};
	readonly slashCommands = [];
	readonly disambiguation = [{
		category: 'general',
		description: 'Transformer built-in chat agent',
		examples: ['write a poem', 'hello']
	}];

	private readonly _onDidChangeStatus = new Emitter<void>();
	readonly onDidChangeStatus: Event<void> = this._onDidChangeStatus.event;

	private readonly mockResponses = new Map([
		['write a poem', `Here's a poem about coding:

\`\`\`
In lines of code, we build our dreams,
Functions flow like gentle streams.
Objects dance in memory's space,
Each bug we fix with gentle grace.

Through loops and logic, day by day,
We craft our worlds in our own way.
In TypeScript's embrace we find
New patterns of the coding kind.
\`\`\`

Would you like me to explain any part of the poem?`],
		['hello', localize('chatWelcome', "Hello! I am Transformer, your coding assistant. How can I help you today?")]
	]);

	constructor() { }

	async invoke(request: IChatAgentRequest, progress: (part: IChatProgress) => void, history: IChatAgentHistoryEntry[], token: CancellationToken): Promise<IChatAgentResult> {
		// Simulate some thinking time
		await new Promise(resolve => setTimeout(resolve, 500));

		const response = this.mockResponses.get(request.message.toLowerCase()) ||
			`I understood your request: "${request.message}"\nI'm a simple demo agent that only knows how to write poems and say hello.`;

		progress({
			content: new MarkdownString(response),
			kind: 'markdownContent'
		});

		return {
			errorDetails: undefined,
			timings: { totalElapsed: 500, firstProgress: 500 }
		};
	}

	async provideWelcomeMessage(token: CancellationToken): Promise<IChatWelcomeMessageContent | undefined> {
		return {
			icon: transformerAiIcon,
			title: 'Transformer Chat',
			message: new MarkdownString('Welcome to Transformer Chat! Try asking me to `write a poem` or just say `hello`.')
		};
	}

	async provideSampleQuestions(location: ChatAgentLocation, token: CancellationToken): Promise<IChatFollowup[] | undefined> {
		return [{
			kind: 'reply',
			agentId: TransformerChatAgent.ID,
			message: 'write a poem',
			title: 'Write a poem about coding'
		}, {
			kind: 'reply',
			agentId: TransformerChatAgent.ID,
			message: 'hello',
			title: 'Say hello'
		}];
	}
}

export class TransformerContribution extends Disposable implements IWorkbenchContribution {
	static readonly ID = 'workbench.contrib.transformer';
	private testControllerRegistration: IDisposable | undefined;
	private operations: Map<string, ITransformerOperation> = new Map();
	private readonly operationRegistry = new OperationRegistry();

	constructor(
		@IContextKeyService contextKeyService: IContextKeyService,
		@ILogService private readonly logService: ILogService,
		@ITestService private readonly testService: ITestService,
		@ITestProfileService private readonly testProfileService: ITestProfileService,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IChatAgentService private readonly chatAgentService: IChatAgentService,
	) {
		super();
		contextKeyService.createKey(IS_TRANSFORMER_ENABLED.key, true);
		this.logService.info('Transformer initialized');

		// Register our chat agent first
		this.registerChatAgent();

		// Then continue with other registrations
		this.registerActions();
		this.registerViewlet();
		this.registerTestController();
		this.registerOperations();
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
						controllerId,
						expand: TestItemExpandState.Expanded,
						item: rootNode
					}
				}];

				that.testService.publishDiff(controllerId, rootDiff);

				const helloWorldProgram = createHelloWorldProgram(controllerId);

				// Store the operations from hello world program
				for (const operation of helloWorldProgram) {
					that.addOperation(operation);
				}

				// Convert operations to test items and add them
				const operations: TestsDiff = helloWorldProgram.map(operation => ({
					op: TestDiffOpType.Add,
					item: {
						controllerId,
						expand: TestItemExpandState.NotExpandable,
						item: operationToTestItem(operation)
					}
				}));

				// Publish operations
				that.testService.publishDiff(controllerId, operations);

				// Add a run profile for the controller
				that.testProfileService.addProfile(myController, {
					controllerId,
					profileId: 1,
					label: 'Run Transformer Operations',
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

		this.testControllerRegistration = this.testService.registerTestController(controllerId, myController);
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

	// Helper to get operation details
	private getOperation(testId: string): ITransformerOperation | undefined {
		return this.operations.get(testId);
	}

	// Add helper to store operations
	private addOperation(operation: ITransformerOperation): void {
		this.operations.set(operation.extId, operation);
	}

	private registerOperations(): void {
		// Register show dialog operation
		this.operationRegistry.registerOperation({
			id: OPERATION_SHOW_DIALOG,
			type: 'showDialog',
			description: 'Shows a dialog to the user',
			parameterSchema: [{
				type: 'string',
				name: 'text',
				description: 'Message to show',
				required: true
			}, {
				type: 'string',
				name: 'level',
				description: 'Dialog level',
				required: false,
				defaultValue: 'Info'
			}],
			impl: async (accessor: ServicesAccessor, _: ITransformerOperation, params: ITransformerParam[]) => {
				const dialogService = accessor.get(IDialogService);
				const text = params.find(p => p.name === 'text')?.value;
				const level = params.find(p => p.name === 'level')?.value ?? 'Info';

				if (!text) { throw new Error('Missing text parameter'); }
				return dialogService.info(level, text);
			}
		});

		// Register set context operation
		this.operationRegistry.registerOperation({
			id: OPERATION_SET_CONTEXT,
			type: 'setContext',
			description: 'Sets a context key value',
			parameterSchema: [{
				type: 'string',
				name: 'key',
				description: 'Context key name',
				required: true
			}, {
				type: 'string',
				name: 'value',
				description: 'Context key value',
				required: true
			}],
			impl: async (accessor: ServicesAccessor, _: ITransformerOperation, params: ITransformerParam[]) => {
				const contextKeyService = accessor.get(IContextKeyService);
				const key = params.find(p => p.name === 'key')?.value;
				const value = params.find(p => p.name === 'value')?.value;

				if (!key) { throw new Error('Missing key parameter'); }
				contextKeyService.createKey(key, value);
			}
		});

		// Register chat operation
		this.operationRegistry.registerOperation({
			id: OPERATION_START_CHAT,
			type: 'startChat',
			description: 'Starts a chat session with a specific prompt',
			parameterSchema: [{
				type: 'string',
				name: 'prompt',
				description: 'Message to send to chat',
				required: false,
				defaultValue: 'write a poem'
			}],
			impl: async (accessor: ServicesAccessor, _: ITransformerOperation, params: ITransformerParam[]) => {
				const chatService = accessor.get(IChatService);
				const layoutService = accessor.get(IWorkbenchLayoutService);
				// Show the chat view panel first
				await layoutService.setPartHidden(false, Parts.AUXILIARYBAR_PART);

				if (!chatService.isEnabled(ChatAgentLocation.Editor)) {
					throw new Error('Chat is not available');
				}

				// Create session and wait for initialization
				const session = chatService.startSession(ChatAgentLocation.Panel, CancellationToken.None);
				await session.waitForInitialization();


				// Get prompt and prepare request
				const prompt = params.find(p => p.name === 'prompt')?.value ?? 'write a poem';

				// Explicitly specify our transformer agent ID and wait for response
				const response = await chatService.sendRequest(session.sessionId, prompt, {
					agentId: TransformerChatAgent.ID // Explicitly use our agent
				});

				if (!response) {
					throw new Error('Failed to send chat request');
				}

				// Wait for both creation and completion
				await Promise.all([
					response.responseCreatedPromise,
					response.responseCompletePromise
				]);

				// Validate response was added
				const requests = session.getRequests();
				if (!requests.length || !requests[0].response) {
					throw new Error('Request was not properly added to chat history');
				}
			}
		});
	}

	private registerChatAgent(): void {
		const transformerAgent = new TransformerChatAgent();

		// First register the agent with its metadata
		this._register(this.chatAgentService.registerAgent(transformerAgent.id, {
			id: transformerAgent.id,
			name: transformerAgent.name,
			extensionId: transformerAgent.extensionId,
			extensionDisplayName: transformerAgent.extensionDisplayName,
			extensionPublisherId: transformerAgent.extensionPublisherId,
			publisherDisplayName: transformerAgent.extensionPublisherId,
			fullName: transformerAgent.displayName,
			description: 'Transformer built-in chat agent',
			locations: transformerAgent.locations,
			metadata: transformerAgent.metadata,
			slashCommands: transformerAgent.slashCommands,
			disambiguation: transformerAgent.disambiguation,
			isDefault: true
		}));

		// Then register the implementation
		this._register(this.chatAgentService.registerAgentImplementation(transformerAgent.id, transformerAgent));
	}

}

registerWorkbenchContribution2(TransformerContribution.ID, TransformerContribution, WorkbenchPhase.BlockRestore);


// operation ids
export const OPERATION_SET_CONTEXT = 'setContext';
export const OPERATION_SHOW_DIALOG = 'showDialog';
export const OPERATION_START_CHAT = 'startChat';



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

/**
 * Runs an operation after resolving parameters
 * @param accessor The services accessor
 * @param registry The operation registry
 * @param operation The operation definition
 * @returns A promise that resolves to the operation result
 */
export async function runOperation(
	accessor: ServicesAccessor,
	registry: OperationRegistry,
	operation: ITransformerOperation
) {
	const def = registry.getOperation(operation.type);
	if (!def) {
		throw new Error(`Unknown operation type: ${operation.type}`);
	}

	const error = registry.validateOperation(operation);
	if (error) {
		throw new Error(`Invalid operation: ${error}`);
	}

	const resolvedParams = resolveParams(accessor, operation);
	return def.impl(accessor, operation, resolvedParams);
}

export function operationToTestItem(operation: ITransformerOperation): ITestItem {
	return {
		extId: operation.extId,
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

export function createHelloWorldProgram(controllerId: string) {
	const helloWorldProgram: ITransformerOperation[] = [
		{
			extId: `${controllerId}${TestIdPathParts.Delimiter}setContext`,
			description: 'Sets a welcome message in context',
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
			extId: `${controllerId}${TestIdPathParts.Delimiter}showDialog`,
			description: 'Shows the welcome message in a dialog',
			type: 'showDialog',
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
		},
		{
			extId: `${controllerId}${TestIdPathParts.Delimiter}startChat`,
			description: 'Opens chat and requests a poem',
			type: 'startChat',
			params: [] // Using default 'write a poem' prompt
		}
	];

	return helloWorldProgram;
}
