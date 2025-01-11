import { localize2 } from '../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { RawContextKey, IContextKeyService, IContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { ServicesAccessor } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IWorkbenchContribution, registerWorkbenchContribution2, WorkbenchPhase } from '../../../common/contributions.js';

export const IS_SYSTEMATIC_KEY = new RawContextKey<boolean>('isSystematic', true);
export const IS_CONTROL_MODE = new RawContextKey<boolean>('systematicControlMode', false);

export class SystematicControlModeContribution implements IWorkbenchContribution {

	static readonly ID = 'workbench.contrib.systematicControlMode';
	private readonly controlModeKey: IContextKey<boolean>;

	constructor(
		@IContextKeyService contextKeyService: IContextKeyService,
		@ILogService private readonly logService: ILogService
	) {
		contextKeyService.createKey(IS_SYSTEMATIC_KEY.key, true);
		this.controlModeKey = IS_CONTROL_MODE.bindTo(contextKeyService);
		this.logService.info('Systematic Control Mode initialized');
		this.registerActions();
	}

	registerActions(): void {
		const self = this;
		registerAction2(class ToggleControlModeAction extends Action2 {
			constructor() {
				super({
					id: 'systematic.toggleControlMode',
					title: localize2('systematicToggleMode', "Toggle Systematic Control Mode"),
					precondition: IS_SYSTEMATIC_KEY,
					keybinding: {
						primary: 2048 | 32, // Cmd+C
						weight: 100
					},
					menu: {
						id: MenuId.CommandPalette
					}
				});
			}

			run(accessor: ServicesAccessor): void {
				self.toggleControlMode();
			}
		});
	}

	toggleControlMode(): void {
		const currentValue = this.controlModeKey.get();
		this.controlModeKey.set(!currentValue);
		this.logService.info(`Control mode is now: ${!currentValue}`);
	}
}


registerWorkbenchContribution2(SystematicControlModeContribution.ID, SystematicControlModeContribution, WorkbenchPhase.BlockRestore);
