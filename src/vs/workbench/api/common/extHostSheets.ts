/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type * as vscode from 'vscode';
import { ExtHostSheetShape, IMainContext, MainContext, MainThreadSheetShape } from './extHost.protocol.js';
import { URI, UriComponents } from '../../../base/common/uri.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { IExtensionDescription } from '../../../platform/extensions/common/extensions.js';
import { SheetCell } from '../../services/sheet/common/sheet.js';

export interface ISheetDataProvider {
	readCell(uri: URI, row: number, col: number): Promise<SheetCell>;
	writeCell(uri: URI, cell: SheetCell): Promise<void>;
}

export class ExtHostSheets implements ExtHostSheetShape {
	private static handlePool: number = 0;

	private readonly proxy: MainThreadSheetShape;
	private readonly providers = new Map<number, ISheetDataProvider>();
	private readonly disposables = new DisposableStore();

	constructor(mainContext: IMainContext) {
		this.proxy = mainContext.getProxy(MainContext.MainThreadSheet);
	}

	async $readCell(handle: number, uri: UriComponents, row: number, col: number): Promise<SheetCell> {
		const provider = this.providers.get(handle);
		if (!provider) {
			throw new Error(`No provider found for handle ${handle}`);
		}
		return provider.readCell(URI.revive(uri), row, col);
	}

	async $writeCell(handle: number, uri: UriComponents, cell: SheetCell): Promise<void> {
		const provider = this.providers.get(handle);
		if (!provider) {
			throw new Error(`No provider found for handle ${handle}`);
		}
		return provider.writeCell(URI.revive(uri), cell);
	}

	registerSheetProvider(extension: IExtensionDescription, provider: ISheetDataProvider): vscode.Disposable {
		const handle = ExtHostSheets.handlePool++;
		this.providers.set(handle, provider);

		this.proxy.$registerSheetProvider(handle, extension.identifier);

		const disposable = {
			dispose: () => {
				this.proxy.$unregisterSheetProvider(handle);
				this.providers.delete(handle);
			}
		};
		this.disposables.add(disposable);
		return disposable;
	}

	dispose(): void {
		this.disposables.dispose();
	}
}
