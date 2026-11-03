import { BadRequestException, UnsupportedMediaTypeException } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { DatasetProcessingService } from './dataset-processing.service';

describe('DatasetProcessingService', () => {
  const service = new DatasetProcessingService();
  const file = (name: string, contents: Buffer | string) => {
    const buffer = Buffer.isBuffer(contents) ? contents : Buffer.from(contents);
    return {
      originalname: name,
      mimetype: 'application/octet-stream',
      size: buffer.length,
      buffer,
    };
  };

  it('parses CSV, skips blank rows, and makes headers unique', () => {
    const result = service.process(
      file('sales.csv', 'Nama,Nama,,Jumlah\nBuku,Buku A,Catatan,2\n,,,\n'),
    );
    expect(result.columns).toEqual(['Nama', 'Nama_2', 'kolom_3', 'Jumlah']);
    expect(result.totalRows).toBe(1);
    expect(result.preview).toEqual([
      { Nama: 'Buku', Nama_2: 'Buku A', kolom_3: 'Catatan', Jumlah: '2' },
    ]);
    expect(result.dataset.sheetName).toBeNull();
  });

  it.each(['xlsx', 'xls'] as const)('parses Excel %s and selects the first sheet', (bookType) => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([['nama', 'jumlah'], ['Apel', 3]]),
      'Data',
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([['ignored']]),
      'Lembar Kedua',
    );
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType }) as Buffer;
    const result = service.process(file(`data.${bookType}`, buffer));
    expect(result.dataset.sheetName).toBe('Data');
    expect(result.preview).toEqual([{ nama: 'Apel', jumlah: 3 }]);
  });

  it('returns at most 20 preview rows but counts every row', () => {
    const csv = ['id', ...Array.from({ length: 25 }, (_, index) => String(index + 1))].join('\n');
    const result = service.process(file('rows.csv', csv));
    expect(result.totalRows).toBe(25);
    expect(result.preview).toHaveLength(20);
  });

  it('profiles columns dynamically without relying on business-specific names', () => {
    const result = service.process(file(
      'custom.csv',
      'area,measure,active,when,note\nNorth,2,true,2025-01-02,ok\nSouth,4,false,2025-02-02,\nSouth,4,false,2025-02-02,\n',
    ));
    expect(result.columnMetadata).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'area', type: 'category', uniqueCount: 2 }),
      expect.objectContaining({ name: 'measure', type: 'number', min: 2, max: 4, mean: 10 / 3 }),
      expect.objectContaining({ name: 'active', type: 'boolean' }),
      expect.objectContaining({ name: 'when', type: 'date' }),
      expect.objectContaining({ name: 'note', type: 'category', nullable: true, nullCount: 2 }),
    ]));
    expect(result.profiling).toMatchObject({
      totalRows: 3,
      totalColumns: 5,
      duplicateRows: 1,
      missingValues: 2,
      dateRange: [{ column: 'when', min: '2025-01-02T00:00:00.000Z', max: '2025-02-02T00:00:00.000Z' }],
    });
  });

  it('profiles many wide unique rows and still detects an identical duplicate row', () => {
    const payload = 'x'.repeat(4096);
    const rows = Array.from({ length: 80 }, (_, index) => `${index},${payload}${index}`);
    rows.push(rows[17]);
    const result = service.process(file('wide-rows.csv', `id,description\n${rows.join('\n')}`));

    expect(result.totalRows).toBe(81);
    expect(result.profiling.duplicateRows).toBe(1);
    expect(result.columnMetadata).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'description', uniqueCount: 80 }),
    ]));
  });

  it('marks uncertain and empty columns as unknown or mixed', () => {
    const result = service.process(file('types.csv', 'empty,mixed\n,1\n,word\n'));
    expect(result.columnMetadata).toEqual([
      expect.objectContaining({ name: 'empty', type: 'unknown' }),
      expect.objectContaining({ name: 'mixed', type: 'mixed' }),
    ]);
  });

  it('rejects an empty file and a headerless CSV', () => {
    expect(() => service.process(file('empty.csv', ''))).toThrow(BadRequestException);
    expect(() => service.process(file('blank.csv', '\n,,\n'))).toThrow(BadRequestException);
  });

  it('rejects unsupported extensions regardless of MIME type', () => {
    expect(() => service.process(file('image.png', 'not really a spreadsheet'))).toThrow(
      UnsupportedMediaTypeException,
    );
  });

  it('rejects MIME mismatches before parsing dataset content', () => {
    expect(() => service.process({
      originalname: 'data.csv', mimetype: 'application/pdf', size: 3, buffer: Buffer.from('a,b'),
    })).toThrow(UnsupportedMediaTypeException);
  });

  it('rejects malformed Excel data', () => {
    expect(() => service.process(file('broken.xlsx', 'not an excel file'))).toThrow(
      BadRequestException,
    );
  });
});
