import * as vscode from 'vscode';
import { SheetService } from './sheetService';

interface MainThreadSheetProtocol {
	$readSheet(uri: string): Promise<unknown>;
}

export function activate(context: vscode.ExtensionContext) {
	const sheetService = new SheetService(context);

	// Implement main thread protocol
	const mainThreadSheet: MainThreadSheetProtocol = {
		async $readSheet(uri: string) {
			return sheetService.readSheet(vscode.Uri.parse(uri));
		}
	};

	return {
		extHostSheet: mainThreadSheet
	};
}

export function deactivate() { }
