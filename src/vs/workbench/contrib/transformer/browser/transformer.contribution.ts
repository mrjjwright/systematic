import { localize, localize2 } from '../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { RawContextKey, IContextKeyService, IContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IWorkbenchContribution, registerWorkbenchContribution2, WorkbenchPhase } from '../../../common/contributions.js';
import { TransformerEditor } from './transformerEditor.js';
import { IQuickInputService, IQuickPickItem } from '../../../../platform/quickinput/common/quickInput.js';
import { EditorExtensions, IEditorFactoryRegistry } from '../../../common/editor.js';
import { TransformerInput, TransformerSerializer } from './transformerInput.js';
import { ServicesAccessor } from '../../../../editor/browser/editorExtensions.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { URI } from '../../../../base/common/uri.js';
import { ActiveEditorContext } from '../../../common/contextkeys.js';
import { IEditorResolverService, RegisteredEditorPriority } from '../../../services/editor/common/editorResolverService.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { EditorPaneDescriptor, IEditorPaneRegistry } from '../../../browser/editor.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { IFileService } from '../../../../platform/files/common/files.js';

export const IS_TRANSFORMER_ENABLED = new RawContextKey<boolean>('isTransformerEnabled', true);
export const IS_LINKING_MODE = new RawContextKey<boolean>('isTransformerLinkingMode', false);

export class TransformerContribution extends Disposable implements IWorkbenchContribution {
	static readonly ID = 'workbench.contrib.transformer';
	private readonly linkingModeKey: IContextKey<boolean>;

	constructor(
		@IContextKeyService contextKeyService: IContextKeyService,
		@ILogService private readonly logService: ILogService,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IEditorResolverService private readonly editorResolverService: IEditorResolverService,
		@IFileService private readonly fileService: IFileService,
	) {
		super();
		contextKeyService.createKey(IS_TRANSFORMER_ENABLED.key, true);
		this.linkingModeKey = IS_LINKING_MODE.bindTo(contextKeyService);
		this.logService.info('Transformer initialized');
		this.registerActions();

		this.editorResolverService.registerEditor(
			'**/*.trans',
			{
				id: TransformerInput.EditorID,
				label: localize('transformer.editor.label', "Transformer Editor"),
				priority: RegisteredEditorPriority.exclusive
			},
			{
				canSupportResource: uri => uri.scheme === 'trans',
				singlePerResource: true
			},
			{
				createEditorInput: ({ resource }) => {
					return { editor: this.instantiationService.createInstance(TransformerInput, resource) };
				}
			}
		);

		Registry.as<IEditorPaneRegistry>(EditorExtensions.EditorPane)
			.registerEditorPane(EditorPaneDescriptor.create(
				TransformerEditor,
				TransformerInput.EditorID,
				localize('transformerEditor', "Transformer Editor")
			), [new SyncDescriptor(TransformerInput)]);

	}

	registerActions(): void {
		const self = this;
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

		registerAction2(class AddTransformationNodeAction extends Action2 {
			constructor() {
				super({
					id: 'transformer.addNode',
					title: localize2('transformerAddNode', "Add Transformation Node"),
					f1: true,
					precondition: ActiveEditorContext.isEqualTo(TransformerInput.EditorID)
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
				// const instantiationService = accessor.get(IInstantiationService);
				//const input = instantiationService.createInstance(TransformerInput, URI.from({ scheme: 'trans', path: `/transformer.trans` }) );
				await editorService.openEditor({ resource: URI.from({ scheme: 'trans', path: `/transformer.trans` }) });
			}
		});

		registerAction2(class ConcatenateFilesAction extends Action2 {
			constructor() {
				super({
					id: 'transformer.concatenateFiles',
					title: localize2('transformerConcatenateFiles', "Transformer Concatenate Files"),
					f1: true,
				});
			}

			async run(accessor: ServicesAccessor): Promise<string> {
				const resources = [
					URI.file('/Users/jjwright/src/systematic/README.md'),
					URI.file('/Users/jjwright/src/systematic/DESIGN.md')
				];
				const result = await self.concatenateFiles(resources);
				console.log(result);
				return result;
			}
		});


	}

	concatenateFiles(resources: URI[]): Promise<string> {

		if (!resources || resources.length < 2) {
			throw new Error('At least two files must be selected for concatenation');
		}

		try {
			const contents = Promise.all(
				resources.map(async (uri) => {
					const content = await this.fileService.readFile(uri);
					return content.value.toString();
				})
			);

			return contents.then((values) => values.join('\n'));
		} catch (error) {
			throw new Error(`Failed to concatenate files: ${error.message}`);
		}
	}

	toggleLinkingMode(): void {
		const currentValue = this.linkingModeKey.get();
		this.linkingModeKey.set(!currentValue);
		this.logService.info(`Linking mode is now: ${!currentValue}`);
	}
}

registerWorkbenchContribution2(TransformerContribution.ID, TransformerContribution, WorkbenchPhase.BlockRestore);
Registry.as<IEditorFactoryRegistry>(EditorExtensions.EditorFactory).registerEditorSerializer(TransformerInput.EditorID, TransformerSerializer);
