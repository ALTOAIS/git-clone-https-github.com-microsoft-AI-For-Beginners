import { createObjectCsvStringifier } from 'csv-writer';
import * as ExcelJS from 'exceljs';

export interface ExportColumn {
  id: string;
  title: string;
}

export function toCsv(
  columns: ExportColumn[],
  rows: Record<string, unknown>[],
): string {
  const stringifier = createObjectCsvStringifier({
    header: columns.map((c) => ({ id: c.id, title: c.title })),
  });
  return stringifier.getHeaderString() + stringifier.stringifyRecords(rows);
}

export async function toXlsx(
  sheetName: string,
  columns: ExportColumn[],
  rows: Record<string, unknown>[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  sheet.columns = columns.map((c) => ({
    header: c.title,
    key: c.id,
    width: 24,
  }));
  sheet.getRow(1).font = { bold: true };
  rows.forEach((row) => sheet.addRow(row));
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
