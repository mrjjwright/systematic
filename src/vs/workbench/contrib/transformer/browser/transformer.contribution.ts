import { localize2 } from '../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { RawContextKey, IContextKeyService, IContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IWorkbenchContribution, registerWorkbenchContribution2, WorkbenchPhase } from '../../../common/contributions.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { EditorPaneDescriptor, IEditorPaneRegistry } from '../../../browser/editor.js';
import { TransformerEditor } from './transformerEditor.js';
import { IQuickInputService, IQuickPickItem } from '../../../../platform/quickinput/common/quickInput.js';
import { EditorExtensions } from '../../../common/editor.js';

// Context keys for transformer states
export const IS_TRANSFORMER_ENABLED = new RawContextKey<boolean>('isTransformerEnabled', true);
export const IS_LINKING_MODE = new RawContextKey<boolean>('isTransformerLinkingMode', false);

// Register the custom editor for .trans files
Registry.as<IEditorPaneRegistry>(EditorExtensions.EditorPane)
	.registerEditorPane(EditorPaneDescriptor.create(
		TransformerEditor,
		TransformerEditor.ID,
		localize2('transformerEditor', "Transformer Editor")
	), [{
		name: localize2('transformer', "Transformer"),
		extensions: ['trans']
	}]);

// Register editor
Registry.as<IEditorPaneRegistry>(EditorExtensions.EditorPane)
	.registerEditorPane(EditorPaneDescriptor.create(
		TransformerEditor,
		TransformerEditor.ID,
		localize2('transformerEditor', "Transformer Editor")
	), [{
		name: localize2('transformer', "Transformer"),
		extensions: ['transform']
	}]);

export class TransformerContribution extends Disposable implements IWorkbenchContribution {
	static readonly ID = 'workbench.contrib.transformer';
	private readonly linkingModeKey: IContextKey<boolean>;

	constructor(
		@IContextKeyService contextKeyService: IContextKeyService,
		@ILogService private readonly logService: ILogService,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IQuickInputService private readonly quickInputService: IQuickInputService
	) {
		super();
		contextKeyService.createKey(IS_TRANSFORMER_ENABLED.key, true);
		this.linkingModeKey = IS_LINKING_MODE.bindTo(contextKeyService);
		this.logService.info('Transformer initialized');
		this.registerActions();
	}

	registerActions(): void {
		const self = this;
		// Register action to toggle linking mode
		registerAction2(class ToggleLinkingModeAction extends Action2 {
			constructor() {
				super({
					id: 'transformer.toggleLinkingMode',
					title: localize2('transformerToggleLinking', "Toggle Transformer Linking Mode"),
					precondition: IS_TRANSFORMER_ENABLED,
					keybinding: {
						primary: 2048 | 1024 | 34, // Cmd+Shift+L
						weight: 100
					},
					menu: {
						id: MenuId.CommandPalette
					}
				});
			}

			run(): void {
				self.toggleLinkingMode();
			}
		});

		// Register action to add a new transformation node
		registerAction2(class AddTransformationNodeAction extends Action2 {
			constructor() {
				super({
					id: 'transformer.addNode',
					title: localize2('transformerAddNode', "Add Transformation Node"),
					f1: true,
					precondition: IActiveEditorContext.isEqualTo(TransformerEditor.ID)
				});
			}

			async run(accessor: any): Promise<void> {
				const quickInputService = accessor.get(IQuickInputService);

				const items: IQuickPickItem[] = [
					{
						label: 'Combine Text',
						description: 'Combine multiple text files into one',
						detail: 'Concatenates text files with optional separators'
					},
					// Add more transformation types here
				];

				const selection = await quickInputService.pick(items, {
					placeHolder: 'Select transformation type'
				});

				if (selection) {
					// TODO: Add node to the active editor
					// This will be handled by the TransformerEditor
				}
			}
		});

		// Register commands
		registerAction2(class CreateTransformerAction extends Action2 {
			constructor() {
				super({
					id: 'transformer.create',
					title: localize2('createTransformer', "Create New Transformer"),
					f1: true
				});
			}

			async run(accessor: ServicesAccessor): Promise<void> {
				const editorService = accessor.get(IEditorService);
				const instantiationService = accessor.get(IInstantiationService);

				const input = instantiationService.createInstance(
					TransformerEditorInput,
					URI.from({ scheme: 'transformer', path: `/transformer-${Date.now()}.transform` }),
					undefined
				);

				await editorService.openEditor(input);
			}
		});
	}

	toggleLinkingMode(): void {
		const currentValue = this.linkingModeKey.get();
		this.linkingModeKey.set(!currentValue);
		this.logService.info(`Linking mode is now: ${!currentValue}`);
	}
}

registerWorkbenchContribution2(TransformerContribution.ID, TransformerContribution, WorkbenchPhase.BlockRestore);
