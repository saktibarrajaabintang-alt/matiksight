import * as XLSX from "@e965/xlsx";
import { ParsedDataset } from "@/lib/data-utils";
import { buildDatasetColumns, buildDatasetProfile } from "@/lib/dataset-service";

type SpreadsheetWorkbook = ReturnType<typeof XLSX.read>;

async function readWorkbook(file: File): Promise<SpreadsheetWorkbook> {
  return XLSX.read(await file.arrayBuffer(), { cellDates: true });
}

export async function getSpreadsheetSheetNames(file: File): Promise<string[]> {
  const workbook = await readWorkbook(file);
  if (!workbook.SheetNames.length) throw new Error("File tidak memiliki sheet yang bisa dibaca.");
  return workbook.SheetNames;
}

export async function parseSpreadsheet(file: File, requestedSheet?: string): Promise<ParsedDataset> {
  const workbook = await readWorkbook(file);
  const sheetName = requestedSheet ?? workbook.SheetNames[0];
  const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
  if (!sheet) throw new Error("Sheet yang dipilih tidak ditemukan di dalam file.");

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: null,
    raw: true,
    blankrows: false,
  });
  const headerRow = matrix[0];
  if (!headerRow?.length) throw new Error("Sheet tidak memiliki baris header.");

  const headers = headerRow.map((value) => String(value ?? "").replace(/^\uFEFF/, ""));
  const dataRows = matrix.slice(1).filter((row) =>
    row.some((value) => value !== null && value !== undefined && String(value).trim() !== ""),
  );
  const invalidHeaderIndex = headers.findIndex((header, index) =>
    !header.trim() && dataRows.some((row) => row[index] !== null && row[index] !== undefined && String(row[index]).trim() !== ""),
  );
  if (invalidHeaderIndex >= 0) {
    throw new Error(`Kolom ke-${invalidHeaderIndex + 1} memiliki data tetapi tidak memiliki nama header.`);
  }
  const columns = headers
    .map((name, index) => ({ name, index }))
    .filter(({ name }) => name.trim());
  if (!columns.length) throw new Error("Sheet tidak memiliki nama kolom yang valid.");

  const rows = dataRows.map((row) => columns.map(({ index }) => row[index] ?? null));
  const datasetColumns = buildDatasetColumns(columns.map(({ name }) => name), rows);
  return {
    columns: datasetColumns,
    rows,
    totalRows: rows.length,
    profile: buildDatasetProfile(datasetColumns, rows),
    sheetName: file.name.toLowerCase().endsWith(".csv") ? undefined : sheetName,
  };
}
