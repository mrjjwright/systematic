import * as vscode from 'vscode';
import { ExcelSheetMutator } from './excelSheetMutator';

export async function activate(context: vscode.ExtensionContext) {
	console.log('Transformer Sheet Extension - Starting activation');
	try {
		// Create and register the sheet mutator
		const mutator = new ExcelSheetMutator();
		const disposable = vscode.sheets.registerSheetMutator(mutator);
		// Add to extension subscriptions
		context.subscriptions.push(disposable);

	} catch (error: any) {
		console.error('Failed to activate Excel Sheet Mutator:', error?.message);
		throw error;
	}
}

export function deactivate() {
	// Cleanup will be handled by disposables
}
