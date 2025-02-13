/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable, IDisposable } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { InstantiationType, registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { ISheetMutator, SheetCell } from '../common/sheet.js';



export interface ISheetService {
	readonly _serviceBrand: undefined;
	registerMutator(mutator: ISheetMutator): IDisposable;
	readCell(uri: URI, row: number, col: number): Promise<SheetCell>;
	writeCell(uri: URI, cell: SheetCell): Promise<void>;
}

export const ISheetService = createDecorator<ISheetService>('sheetService');


export class SheetService extends Disposable implements ISheetService {
	declare readonly _serviceBrand: undefined;

	private readonly mutators = new Set<ISheetMutator>();

	constructor(
		@ILogService private readonly logService: ILogService
	) {
		super();
	}

	registerMutator(mutator: ISheetMutator) {
		this.mutators.add(mutator);
		this.logService.trace(`[SheetService] Registered sheet mutator from extension: ${mutator.extId}`);

		return {
			dispose: () => {
				this.mutators.delete(mutator);
				mutator.dispose();
				this.logService.trace(`[SheetService] Unregistered mutator from extension: ${mutator.extId}`);
			}
		};
	}

	async readCell(uri: URI, row: number, col: number): Promise<SheetCell> {
		if (this.mutators.size === 0) {
			throw new Error('No extensions for sheets are registered');
		}

		for (const mutator of this.mutators) {
			try {
				const cell = await mutator.readCell(uri, row, col);
				if (cell) {
					return cell;
				}
			} catch (error) {
				this.logService.trace(`[SheetService] Mutator failed to read cell: ${error}`);
				continue; // Try next mutator
			}
		}
		throw new Error(`No mutator could read cell at row ${row}, col ${col}`);
	}

	async writeCell(uri: URI, cell: SheetCell): Promise<void> {
		for (const mutator of this.mutators) {
			try {
				await mutator.writeCell(uri, cell);
				return; // Successfully wrote cell
			} catch (error) {
				this.logService.trace(`[SheetService] Mutator failed to write cell: ${error}`);
				continue; // Try next mutator
			}
		}
		throw new Error(`No mutator could write cell at row ${cell.row}, col ${cell.col}`);
	}

	override dispose(): void {
		super.dispose();
		for (const mutator of this.mutators) {
			mutator.dispose();
		}
		this.mutators.clear();
	}
}


registerSingleton(ISheetService, SheetService, InstantiationType.Delayed);
