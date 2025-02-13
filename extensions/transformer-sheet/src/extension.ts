import * as vscode from 'vscode';
import { ExcelSheetMutator } from './excelSheetMutator';

export function activate(context: vscode.ExtensionContext) {
	try {
		// Create and register the sheet mutator
		const mutator = new ExcelSheetMutator();
		const disposable = vscode.sheets.registerSheetMutator(mutator);

		// Add to extension subscriptions
		context.subscriptions.push(disposable);

		console.log('Excel Sheet Mutator activated');
	} catch (error: any) {
		console.error('Failed to activate Excel Sheet Mutator:', error?.message);
		throw error;
	}
}

export function deactivate() {
	// Cleanup will be handled by disposables
}
