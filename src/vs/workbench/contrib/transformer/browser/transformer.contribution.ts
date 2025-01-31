import { registerAction2 } from '../../../../platform/actions/common/actions.js';
import { RawContextKey, IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IWorkbenchContribution, registerWorkbenchContribution2, WorkbenchPhase } from '../../../common/contributions.js';
import { RegisterHelloWorld } from './tal.js';

export const IS_TRANSFORMER_ENABLED = new RawContextKey<boolean>('isTransformerEnabled', true);
export const IS_LINKING_MODE = new RawContextKey<boolean>('isTransformerLinkingMode', false);

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

		// this.editorResolverService.registerEditor(
		// 	'**/*.trans',
		// 	{
		// 		id: TransformerInput.EditorID,
		// 		label: localize('transformer.editor.label', "Transformer Editor"),
		// 		priority: RegisteredEditorPriority.exclusive
		// 	},
		// 	{
		// 		canSupportResource: uri => uri.scheme === 'trans',
		// 		singlePerResource: true
		// 	},
		// 	{
		// 		createEditorInput: ({ resource }) => {
		// 			return { editor: this.instantiationService.createInstance(TransformerInput, resource) };
		// 		}
		// 	}
		// );

		// Registry.as<IEditorPaneRegistry>(EditorExtensions.EditorPane)
		// 	.registerEditorPane(EditorPaneDescriptor.create(
		// 		TransformerEditor,
		// 		TransformerInput.EditorID,
		// 		localize('transformerEditor', "Transformer Editor")
		// 	), [new SyncDescriptor(TransformerInput)]);

	}

	registerActions(): void {
		registerAction2(RegisterHelloWorld);
	}

}

registerWorkbenchContribution2(TransformerContribution.ID, TransformerContribution, WorkbenchPhase.BlockRestore);
// Registry.as<IEditorFactoryRegistry>(EditorExtensions.EditorFactory).registerEditorSerializer(TransformerInput.EditorID, TransformerSerializer);
