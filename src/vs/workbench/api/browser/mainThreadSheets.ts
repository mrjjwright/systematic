/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable, IDisposable } from '../../../base/common/lifecycle.js';
import { ExtensionIdentifier } from '../../../platform/extensions/common/extensions.js';
import { extHostNamedCustomer, IExtHostContext } from '../../services/extensions/common/extHostCustomers.js';
import { ISheetService } from '../../services/sheet/browser/sheetService.js';
import { ExtHostContext, ExtHostSheetShape, MainContext, MainThreadSheetShape } from '../common/extHost.protocol.js';
import { URI } from '../../../base/common/uri.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { ISheetMutator, SheetCell } from '../../services/sheet/common/sheet.js';

@extHostNamedCustomer(MainContext.MainThreadSheets)
export class MainThreadSheets extends Disposable implements MainThreadSheetShape {
	private readonly proxy: ExtHostSheetShape;
	private readonly providers = new Map<number, {
		extensionId: ExtensionIdentifier;
		disposable: IDisposable;
	}>();

	constructor(
		context: IExtHostContext,
		@ISheetService private readonly sheetService: ISheetService,
		@ILogService private readonly logService: ILogService
	) {
		super();
		this.proxy = context.getProxy(ExtHostContext.ExtHostSheets);
	}

	$registerSheetMutator(
		handle: number,
		extensionId: ExtensionIdentifier,
	): void {
		try {
			const provider: ISheetMutator = {
				extId: extensionId.value,

				readCell: async (uri: URI, row: number, col: number): Promise<SheetCell> => {
					return this.proxy.$readCell(handle, uri, row, col);
				},

				writeCell: async (uri: URI, cell: SheetCell): Promise<void> => {
					return this.proxy.$writeCell(handle, uri, cell);
				},

				dispose: () => {
					// Provider cleanup logic
				}
			};

			const disposable = this.sheetService.registerProvider(provider);
			this.providers.set(handle, {
				extensionId,
				disposable
			});

			this.logService.trace(`Registered sheet provider ${handle} for extension ${extensionId.value}`);
		} catch (error) {
			this.logService.error('Failed to register sheet provider', error);
			throw error;
		}
	}

	$unregisterSheetMutator(handle: number): void {
		const registration = this.providers.get(handle);
		if (registration) {
			registration.disposable.dispose();
			this.providers.delete(handle);
			this.logService.trace(`Unregistered sheet provider ${handle}`);
		}
	}

	override dispose(): void {
		super.dispose();
		for (const { disposable } of this.providers.values()) {
			disposable.dispose();
		}
		this.providers.clear();
	}
}
