import { URI } from '../../../../base/common/uri.js';

export interface SheetCell {
	row: number;
	col: number;
	value: any;
}

export interface ISheetProvider {
	readonly extId: string;
	readCell(uri: URI, row: number, col: number): Promise<SheetCell>;
	writeCell(uri: URI, cell: SheetCell): Promise<void>;
	dispose(): void;
}
