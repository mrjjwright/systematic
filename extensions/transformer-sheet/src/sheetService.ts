import * as XLSX from 'xlsx';
import * as vscode from 'vscode';

export class SheetService {
	constructor(private readonly context: vscode.ExtensionContext) { }

	async readSheet(uri: vscode.Uri): Promise<any> {
		try {
			// Read file content
			const content = await vscode.workspace.fs.readFile(uri);

			// Parse workbook
			const workbook = XLSX.read(content, {
				type: 'array',
				cellDates: true,
				cellStyles: true
			});

			// Get first sheet
			const firstSheetName = workbook.SheetNames[0];
			const worksheet = workbook.Sheets[firstSheetName];

			// Convert to JSON
			return XLSX.utils.sheet_to_json(worksheet);
		} catch (error: any) {
			throw new Error(`Failed to read spreadsheet: ${error?.message || 'Unknown error'}`);
		}
	}
}
