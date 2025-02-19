import { ServicesAccessor } from '../../../../../editor/browser/editorExtensions.js';
import { localize2 } from '../../../../../nls.js';
import { Action2, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { IViewsService } from '../../../../services/views/common/viewsService.js';
import { ChatAgentLocation } from '../../common/chatAgents.js';
import { IChatService } from '../../common/chatService.js';
import { ChatViewId } from '../chat.js';
import { ChatViewPane } from '../chatViewPane.js';
import { CHAT_CATEGORY } from './chatActions.js';

export class ShowChatAction extends Action2 {
	constructor() {
		super({
			id: 'workbench.action.chat.show',
			title: localize2('showChat', "Show Chat"),
			category: CHAT_CATEGORY,
			f1: true
		});
	}

	async run(accessor: ServicesAccessor, params: { sessionId: string }) {
		const chatService = accessor.get(IChatService);
		const viewsService = accessor.get(IViewsService);

		if (!chatService.isEnabled(ChatAgentLocation.Panel)) {
			throw new Error('Chat is not available');
		}

		if (!params.sessionId) {
			throw new Error('Session id is required');
		}

		const view = await viewsService.openView(ChatViewId) as ChatViewPane;
		view.loadSession(params.sessionId);
	}
}

export function register_extendChatActions() {
	registerAction2(ShowChatAction);
}
