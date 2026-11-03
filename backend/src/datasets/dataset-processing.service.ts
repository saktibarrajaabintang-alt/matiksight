import {
  BadRequestException,
  Injectable,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import * as XLSX from 'xlsx';
import type { UploadFile } from '../upload/upload-file.interface';

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const PREVIEW_ROWS = 20;
const SUPPORTED_EXTENSIONS = new Set(['.csv', '.xlsx', '.xls']);
const ACCEPTED_MIME_TYPES: Record<string, Set<string>> = {
  '.csv': new Set(['text/csv', 'application/csv', 'application/vnd.ms-excel', 'text/plain', 'application/octet-stream']),
  '.xlsx': new Set(['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/octet-stream']),
  '.xls': new Set(['application/vnd.ms-excel', 'application/x-cdf', 'application/octet-stream']),
};

export interface DatasetPreview {
  success: true;
  dataset: {
    originalName: string;
    size: number;
    mimeType: string;
    sheetName: string | null;
  };
  columns: string[];
  totalRows: number;
  preview: Record<string, unknown>[];
  columnMetadata: ColumnMetadata[];
  profiling: {
    totalRows: number;
    totalColumns: number;
    duplicateRows: number;
    missingValues: number;
    dateRange: { column: string; min: string; max: string }[];
    dataQuality: { score: number; missingValues: number; duplicateRows: number };
  };
}

export interface ColumnMetadata {
  name: string;
  type: 'number' | 'date' | 'boolean' | 'category' | 'text' | 'mixed' | 'unknown';
  nullable: boolean;
  uniqueCount: number;
  nullCount: number;
  min?: number | string;
  max?: number | string;
  mean?: number;
}

@Injectable()
export class DatasetProcessingService {
  process(file?: UploadFile): DatasetPreview {
    const { rows: _rows, ...preview } = this.parse(file);
    return preview;
  }

  parse(file?: UploadFile): DatasetPreview & { rows: Record<string, unknown>[] } {
    if (!file) {
      throw new BadRequestException('File wajib diunggah dengan key "file".');
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new PayloadTooLargeException('Ukuran file maksimal 20 MB.');
    }
    const extension = this.extensionOf(file.originalname);
    if (!SUPPORTED_EXTENSIONS.has(extension)) {
      throw new UnsupportedMediaTypeException(
        'Format tidak didukung. Gunakan file CSV, XLSX, atau XLS.',
      );
    }
    if (typeof file.mimetype !== 'string' || !ACCEPTED_MIME_TYPES[extension].has(file.mimetype.toLowerCase())) {
      throw new UnsupportedMediaTypeException('MIME type tidak sesuai atau tidak didukung.');
    }
    if (!file.buffer?.length) {
      throw new BadRequestException('File kosong atau tidak memiliki isi.');
    }
    this.validateContent(extension, file.buffer);

    try {
      const workbook = XLSX.read(file.buffer, {
        type: 'buffer',
        cellDates: true,
        raw: true,
        codepage: 65001,
      });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        throw new BadRequestException('File tidak memiliki lembar data.');
      }
      const sheet = workbook.Sheets[sheetName];
      const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
        header: 1,
        defval: null,
        blankrows: false,
        raw: true,
      });
      if (matrix.length === 0 || !matrix[0]?.some((value) => this.hasValue(value))) {
        throw new BadRequestException('File tidak memiliki baris header.');
      }

      const headers = this.makeHeaders(matrix[0]);
      const records = matrix.slice(1)
        .filter((row) => row.some((value) => this.hasValue(value)))
        .map((row) => Object.fromEntries(headers.map((header, index) => [
          header,
          row[index] ?? null,
        ])));
      const profile = this.profile(headers, records);

      return {
        success: true,
        dataset: {
          originalName: file.originalname,
          size: file.size,
          mimeType: file.mimetype,
          sheetName: extension === '.csv' ? null : sheetName,
        },
        columns: headers,
        totalRows: records.length,
        preview: records.slice(0, PREVIEW_ROWS),
        columnMetadata: profile.columns,
        profiling: profile.summary,
        rows: records,
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(
        'Isi file tidak dapat dibaca. Periksa format dan isi CSV/Excel.',
      );
    }
  }

  private profile(headers: string[], records: Record<string, unknown>[]) {
    const columns = headers.map((name) => {
      const values = records.map((row) => row[name]);
      const nonNull = values.filter((value) => this.hasValue(value));
      const nullCount = values.length - nonNull.length;
      const uniqueCount = new Set(nonNull.map((value) => this.valueKey(value))).size;
      const kind = this.inferType(nonNull);
      const metadata: ColumnMetadata = {
        name,
        type: kind,
        nullable: nullCount > 0,
        uniqueCount,
        nullCount,
      };
      if (kind === 'number' && nonNull.length) {
        const numbers = nonNull.map((value) => this.numberValue(value));
        metadata.min = numbers.reduce((min, value) => Math.min(min, value), Number.POSITIVE_INFINITY);
        metadata.max = numbers.reduce((max, value) => Math.max(max, value), Number.NEGATIVE_INFINITY);
        metadata.mean = numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
      }
      if (kind === 'date' && nonNull.length) {
        const times = nonNull.map((value) => this.dateValue(value).getTime());
        metadata.min = new Date(times.reduce((min, value) => Math.min(min, value), Number.POSITIVE_INFINITY)).toISOString();
        metadata.max = new Date(times.reduce((max, value) => Math.max(max, value), Number.NEGATIVE_INFINITY)).toISOString();
      }
      return metadata;
    });
    const seenRows = new Set<string>();
    let duplicateRows = 0;
    for (const record of records) {
      const serializedRow = JSON.stringify(headers.map((header) => record[header] ?? null));
      const key = createHash('sha256').update(serializedRow).digest('base64url');
      if (seenRows.has(key)) duplicateRows += 1;
      else seenRows.add(key);
    }
    const missingValues = columns.reduce((total, column) => total + column.nullCount, 0);
    const possibleValues = records.length * headers.length;
    const quality = possibleValues === 0 ? 100 : Math.round(
      100 * (1 - (missingValues + duplicateRows * headers.length) / possibleValues),
    );
    const dateRange = columns
      .filter((column) => column.type === 'date' && column.min && column.max)
      .map((column) => ({ column: column.name, min: String(column.min), max: String(column.max) }));
    return {
      columns,
      summary: {
        totalRows: records.length,
        totalColumns: headers.length,
        duplicateRows,
        missingValues,
        dateRange,
        dataQuality: { score: Math.max(0, quality), missingValues, duplicateRows },
      },
    };
  }

  private inferType(values: unknown[]): ColumnMetadata['type'] {
    if (!values.length) return 'unknown';
    const types = new Set(values.map((value) => {
      if (typeof value === 'boolean') return 'boolean';
      if (typeof value === 'number' && Number.isFinite(value)) return 'number';
      if (value instanceof Date && !Number.isNaN(value.getTime())) return 'date';
      if (typeof value === 'string') {
        const text = value.trim();
        if (/^(true|false)$/i.test(text)) return 'boolean';
        if (text && Number.isFinite(Number(text))) return 'number';
        if (this.isDateString(text)) return 'date';
        return 'text';
      }
      return 'unknown';
    }));
    if (types.size !== 1) return 'mixed';
    const type = [...types][0];
    if (type === 'text') return new Set(values.map((value) => String(value))).size <= Math.min(20, Math.max(5, values.length * 0.2)) ? 'category' : 'text';
    return type as ColumnMetadata['type'];
  }

  private isDateString(value: string): boolean {
    return /^\d{4}-\d{1,2}-\d{1,2}(?:[T ]\d{1,2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/.test(value)
      && !Number.isNaN(Date.parse(value));
  }

  private numberValue(value: unknown): number {
    return typeof value === 'number' ? value : Number(String(value).trim());
  }

  private dateValue(value: unknown): Date {
    return value instanceof Date ? value : new Date(String(value));
  }

  private valueKey(value: unknown): string {
    if (value instanceof Date) return value.toISOString();
    return `${typeof value}:${String(value)}`;
  }

  private extensionOf(name: string): string {
    const dot = name.lastIndexOf('.');
    return dot < 0 ? '' : name.slice(dot).toLowerCase();
  }

  private hasValue(value: unknown): boolean {
    if (value === null || value === undefined) return false;
    return typeof value !== 'string' || value.trim() !== '';
  }

  private makeHeaders(row: unknown[]): string[] {
    const seen = new Map<string, number>();
    const used = new Set<string>();
    return row.map((value, index) => {
      const base = this.hasValue(value)
        ? this.headerText(value).trim()
        : `kolom_${index + 1}`;
      let count = seen.get(base) ?? 0;
      let candidate = base;
      do {
        count += 1;
        candidate = count === 1 ? base : `${base}_${count}`;
      } while (used.has(candidate));
      seen.set(base, count);
      used.add(candidate);
      return candidate;
    });
  }

  private headerText(value: unknown): string {
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return `${value}`;
    }
    return JSON.stringify(value);
  }

  private validateContent(extension: string, buffer: Buffer): void {
    if (extension === '.xlsx') {
      if (buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
        throw new BadRequestException('Isi file tidak sesuai dengan ekstensi XLSX.');
      }
      return;
    }
    if (extension === '.xls') {
      if (!buffer.subarray(0, 8).equals(Buffer.from('D0CF11E0A1B11AE1', 'hex'))) {
        throw new BadRequestException('Isi file tidak sesuai dengan ekstensi XLS.');
      }
      return;
    }
    try {
      const text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
      if (text.includes('\0')) throw new Error('Binary content');
    } catch {
      throw new BadRequestException('File CSV harus berupa teks UTF-8 yang valid.');
    }
  }
}
