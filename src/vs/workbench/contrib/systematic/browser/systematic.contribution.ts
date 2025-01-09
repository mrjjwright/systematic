import { Codicon } from '../../../../base/common/codicons.js';
import { localize2 } from '../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ContextKeyExpr, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { ServicesAccessor } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';

export const IS_SYSTEMATIC_KEY = new RawContextKey<boolean>('isSystematic', true);

export class FirstAction extends Action2 {
	constructor() {
		super({
			id: 'systematic.firstAction',
			title: localize2("systematicFirstAction", "Hello from Systematic"),
			icon: Codicon.move,
			precondition: ContextKeyExpr.true(),
			menu: {
				id: MenuId.CommandPalette,
				group: '',
				when: ContextKeyExpr.true()
			}
		});
	}

	run(accessor: ServicesAccessor, ...args: unknown[]): void {
		const logService = accessor.get(ILogService);
		logService.info('Hello from Systematic');
	}
}

registerAction2(FirstAction);


