declare module 'vscode' {
	/**
	 * Represents a cell within a sheet-like data structure, containing both position and value.
	 *
	 * @example
	 * ```typescript
	 * const cell: SheetCell = {
	 *     row: 0,
	 *     col: 0,
	 *     value: "Header"
	 * };
	 * ```
	 */
	export interface SheetCell {
		/**
		 * Zero-based row index of the cell in the sheet.
		 * Must be a non-negative integer.
		 */
		row: number;

		/**
		 * Zero-based column index of the cell in the sheet.
		 * Must be a non-negative integer.
		 */
		col: number;

		/**
		 * The cell's content value. Common types include:
		 * - Strings for text content
		 * - Numbers for numeric values
		 * - Dates for temporal values
		 * - Booleans for true/false values
		 * - null for empty cells
		 */
		value: any;
	}
	/**
 * A mutator that can read and write cells in a sheet-like data structure.
 *
 * Sheet mutators enable VSCode to work with various types of tabular data, including:
 * - Spreadsheets
 * - CSV files
 * - Custom grid-based data structures
 *
 * An extension must register a {@link SheetMutator} to enable sheet capabilities
 * for specific URIs.
 */
	export interface SheetMutator {
		/**
		 * Read a cell's value from the specified location in the sheet.
		 *
		 * @param uri The URI identifying the sheet resource
		 * @param row The zero-based row index of the cell
		 * @param col The zero-based column index of the cell
		 * @returns A thenable that resolves to the cell's data
		 * @throws An error if the cell cannot be read
		 */
		readCell(uri: Uri, row: number, col: number): Thenable<SheetCell>;

		/**
		 * Write a value to the specified cell in the sheet.
		 *
		 * @param uri The URI identifying the sheet resource
		 * @param cell The cell data to write, including row, column, and value
		 * @returns A thenable that resolves when the write is complete
		 * @throws An error if the cell cannot be written
		 */
		writeCell(uri: Uri, cell: SheetCell): Thenable<void>;
	}

	export namespace sheets {
		/**
		 * Register a mutator that can read and write sheet data.
		 *
		 * @param mutator The mutator to register
		 * @returns A {@link Disposable} that unregisters the mutator when disposed
		 *
		 * @example
		 * ```typescript
		 * const mutator: vscode.SheetMutator = {
		 *     async readCell(uri, row, col) {
		 *         // Implement cell reading
		 *     },
		 *     async writeCell(uri, cell) {
		 *         // Implement cell writing
		 *     }
		 * };
		 *
		 * const disposable = vscode.sheets.registerSheetMutator(mutator);
		 * ```
		 */
		export function registerSheetMutator(mutator: SheetMutator): Disposable;
	}
}
