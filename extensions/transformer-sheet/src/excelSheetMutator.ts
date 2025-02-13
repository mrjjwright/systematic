import * as vscode from 'vscode';
import * as XLSX from 'xlsx';

/**
 * Implements the VS Code Sheet Mutator interface for Excel files.
 * Supports reading and writing cells in Excel workbooks.
 */
export class ExcelSheetMutator implements vscode.SheetMutator {
	constructor() {
	}

	async readCell(uri: vscode.Uri, row: number, col: number): Promise<vscode.SheetCell> {
		try {
			const workbook = await this.getWorkbook(uri);
			const sheet = workbook.Sheets[workbook.SheetNames[0]];

			// Convert to 0-based indices to XLSX A1-style reference
			const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
			const cell = sheet[cellRef];

			return {
				row,
				col,
				value: cell ? this.convertFromExcelValue(cell.v) : null
			};
		} catch (error: any) {
			throw new Error(`Failed to read cell at (${row}, ${col}): ${error?.message || 'Unknown error'}`);
		}
	}

	async writeCell(uri: vscode.Uri, cell: vscode.SheetCell): Promise<void> {
		try {
			const workbook = await this.getWorkbook(uri);
			const sheet = workbook.Sheets[workbook.SheetNames[0]];

			// Convert to A1-style reference
			const cellRef = XLSX.utils.encode_cell({ r: cell.row, c: cell.col });

			// Update cell value
			XLSX.utils.sheet_add_aoa(sheet, [[cell.value]], {
				origin: cellRef
			});

			// Save workbook back to file
			await this.saveWorkbook(uri, workbook);
		} catch (error: any) {
			throw new Error(`Failed to write cell at (${cell.row}, ${cell.col}): ${error?.message || 'Unknown error'}`);
		}
	}

	private async getWorkbook(uri: vscode.Uri): Promise<XLSX.WorkBook> {
		// Read file content
		const content = await vscode.workspace.fs.readFile(uri);

		// Parse workbook
		return XLSX.read(content, {
			type: 'array',
			cellDates: true,
			cellStyles: true
		});
	}

	private async saveWorkbook(uri: vscode.Uri, workbook: XLSX.WorkBook): Promise<void> {
		// Write to buffer
		const wbout = XLSX.write(workbook, {
			bookType: this.getBookType(uri),
			type: 'array'
		});

		// Convert to Uint8Array and save
		await vscode.workspace.fs.writeFile(uri, new Uint8Array(wbout));
	}

	private getBookType(uri: vscode.Uri): XLSX.BookType {
		const ext = uri.path.split('.').pop()?.toLowerCase();
		switch (ext) {
			case 'xlsx': return 'xlsx';
			case 'xls': return 'xls';
			case 'csv': return 'csv';
			default: return 'xlsx';
		}
	}

	private convertFromExcelValue(value: any): any {
		if (value instanceof Date) {
			return value.toISOString();
		}
		return value;
	}
}
