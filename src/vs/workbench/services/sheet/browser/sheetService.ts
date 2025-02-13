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
	registerProvider(provider: ISheetMutator): IDisposable;
	readCell(uri: URI, row: number, col: number): Promise<SheetCell>;
	writeCell(uri: URI, cell: SheetCell): Promise<void>;
}

export const ISheetService = createDecorator<ISheetService>('sheetService');


export class SheetService extends Disposable implements ISheetService {
	declare readonly _serviceBrand: undefined;

	private readonly providers = new Set<ISheetMutator>();

	constructor(
		@ILogService private readonly logService: ILogService
	) {
		super();
	}

	registerProvider(provider: ISheetMutator) {
		this.providers.add(provider);
		this.logService.trace(`[SheetService] Registered sheet provider from extension: ${provider.extId}`);

		return {
			dispose: () => {
				this.providers.delete(provider);
				provider.dispose();
				this.logService.trace(`[SheetService] Unregistered provider from extension: ${provider.extId}`);
			}
		};
	}

	async readCell(uri: URI, row: number, col: number): Promise<SheetCell> {
		for (const provider of this.providers) {
			try {
				const cell = await provider.readCell(uri, row, col);
				if (cell) {
					return cell;
				}
			} catch (error) {
				this.logService.trace(`[SheetService] Provider failed to read cell: ${error}`);
				continue; // Try next provider
			}
		}
		throw new Error(`No provider could read cell at row ${row}, col ${col}`);
	}

	async writeCell(uri: URI, cell: SheetCell): Promise<void> {
		for (const provider of this.providers) {
			try {
				await provider.writeCell(uri, cell);
				return; // Successfully wrote cell
			} catch (error) {
				this.logService.trace(`[SheetService] Provider failed to write cell: ${error}`);
				continue; // Try next provider
			}
		}
		throw new Error(`No provider could write cell at row ${cell.row}, col ${cell.col}`);
	}

	override dispose(): void {
		super.dispose();
		for (const provider of this.providers) {
			provider.dispose();
		}
		this.providers.clear();
	}
}


registerSingleton(ISheetService, SheetService, InstantiationType.Delayed);
