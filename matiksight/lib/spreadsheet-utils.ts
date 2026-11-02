import * as XLSX from "@e965/xlsx";
import { SalesRow } from "@/lib/data-utils";

type SpreadsheetRecord = Record<string, unknown>;

const fieldAliases = {
  tanggal: ["tanggal", "date", "tgl"],
  produk: ["produk", "product", "item", "nama", "barang"],
  kategori: ["kategori", "category", "jenis", "tipe"],
  jumlah: ["jumlah", "qty", "kuantitas", "quantity", "units"],
  harga: ["harga", "hargasatuan", "price", "unitprice"],
  total: ["total", "subtotal", "penjualan", "sales", "amount", "revenue"],
};

function normalizeHeader(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function parseNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const text = String(value ?? "").trim().replace(/[^\d,.-]/g, "");
  if (!text) return 0;
  const normalized = text.includes(",") && text.includes(".")
    ? text.lastIndexOf(",") > text.lastIndexOf(".") ? text.replaceAll(".", "").replace(",", ".") : text.replaceAll(",", "")
    : text.includes(",") ? text.replace(",", ".") : text;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseDate(value: unknown, fallback: string): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  const text = String(value ?? "").trim();
  if (!text) return fallback;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? text : parsed.toISOString().slice(0, 10);
}

function findHeader(headers: string[], aliases: string[]) {
  const normalizedAliases = aliases.map(normalizeHeader);
  return headers.find((header) => normalizedAliases.includes(normalizeHeader(header)));
}

export async function parseSpreadsheet(file: File): Promise<SalesRow[]> {
  const workbook = XLSX.read(await file.arrayBuffer(), { cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
  if (!sheet) throw new Error("File tidak memiliki sheet yang bisa dibaca.");

  const records = XLSX.utils.sheet_to_json<SpreadsheetRecord>(sheet, { defval: "", raw: true });
  const nonEmptyRecords = records.filter((record) => Object.values(record).some((value) => String(value ?? "").trim() !== ""));
  if (!nonEmptyRecords.length) throw new Error("Sheet pertama tidak berisi baris data.");

  const headers = Object.keys(nonEmptyRecords[0]);
  const columns = {
    tanggal: findHeader(headers, fieldAliases.tanggal),
    produk: findHeader(headers, fieldAliases.produk),
    kategori: findHeader(headers, fieldAliases.kategori),
    jumlah: findHeader(headers, fieldAliases.jumlah),
    harga: findHeader(headers, fieldAliases.harga),
    total: findHeader(headers, fieldAliases.total),
  };
  const textHeaders = headers.filter((header) => nonEmptyRecords.some((record) => typeof record[header] === "string" && String(record[header]).trim()));
  const numericHeaders = headers.filter((header) => nonEmptyRecords.some((record) => typeof record[header] === "number"));
  const productHeader = columns.produk ?? textHeaders[0];
  const categoryHeader = columns.kategori ?? textHeaders.find((header) => header !== productHeader);
  const quantityHeader = columns.jumlah ?? numericHeaders[0];
  const priceHeader = columns.harga ?? numericHeaders[1];
  const totalHeader = columns.total ?? numericHeaders.at(-1);

  return nonEmptyRecords.map((record, index) => {
    const quantity = quantityHeader ? parseNumber(record[quantityHeader]) : 0;
    const price = priceHeader ? parseNumber(record[priceHeader]) : 0;
    const total = totalHeader
      ? parseNumber(record[totalHeader])
      : priceHeader ? quantity * price : numericHeaders.length ? parseNumber(record[numericHeaders.at(-1)!]) : 0;
    const dateValue = columns.tanggal ? record[columns.tanggal] : "";
    return {
      id: index + 1,
      tanggal: parseDate(dateValue, `Baris ${index + 1}`),
      produk: String(productHeader ? record[productHeader] : `Baris ${index + 1}`),
      kategori: String(categoryHeader ? record[categoryHeader] : "Lainnya"),
      jumlah: quantity,
      harga: price,
      total,
    };
  });
}
