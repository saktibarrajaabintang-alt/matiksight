import {
  BadRequestException,
  Injectable,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { UploadFile } from './upload-file.interface';
import * as XLSX from 'xlsx';

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string[]> = {
  '.xlsx': [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
  '.xls': ['application/vnd.ms-excel', 'application/x-cdf'],
  '.csv': ['text/csv', 'application/csv', 'application/vnd.ms-excel'],
  '.png': ['image/png'],
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
};

@Injectable()
export class UploadService {
  upload(file?: UploadFile) {
    if (!file) {
      throw new BadRequestException('File wajib diunggah dengan key "file".');
    }
    if (typeof file.originalname !== 'string' || file.originalname.trim().length === 0) {
      throw new BadRequestException('Nama file tidak valid.');
    }

    if (!Number.isInteger(file.size) || file.size < 0) {
      throw new BadRequestException('Ukuran file tidak valid.');
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new PayloadTooLargeException('Ukuran file maksimal 20 MB.');
    }

    const extension = file.originalname
      .slice(file.originalname.lastIndexOf('.'))
      .toLowerCase();
    const acceptedMimeTypes = ALLOWED_TYPES[extension];

    if (!acceptedMimeTypes) {
      throw new UnsupportedMediaTypeException('Format file tidak didukung.');
    }

    if (typeof file.mimetype !== 'string' || !acceptedMimeTypes.includes(file.mimetype.toLowerCase())) {
      throw new UnsupportedMediaTypeException(
        'Ekstensi file dan MIME type tidak sesuai atau tidak didukung.',
      );
    }

    if (!Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
      throw new BadRequestException('File kosong atau tidak memiliki isi.');
    }
    if (file.size !== file.buffer.length) {
      throw new BadRequestException('Ukuran file tidak sesuai dengan isinya.');
    }
    this.validateFileContent(extension, file.buffer);

    return {
      success: true,
      message: 'File berhasil diterima.',
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
    };
  }

  private validateFileContent(extension: string, buffer: Buffer) {
    if (extension === '.csv') {
      try {
        const text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
        if (text.includes('\0') || text.trim().length === 0) throw new Error('Empty or binary CSV');
      } catch {
        throw new BadRequestException('File CSV harus berupa teks UTF-8 yang tidak kosong.');
      }
      return;
    }

    if (extension === '.png') {
      const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      if (buffer.length < 24 || !buffer.subarray(0, 8).equals(signature) || buffer.toString('ascii', 12, 16) !== 'IHDR'
        || buffer.readUInt32BE(16) === 0 || buffer.readUInt32BE(20) === 0) {
        throw new BadRequestException('Isi file tidak sesuai dengan format PNG.');
      }
      return;
    }

    if (extension === '.jpg' || extension === '.jpeg') {
      if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8 || buffer[2] !== 0xff
        || buffer[buffer.length - 2] !== 0xff || buffer[buffer.length - 1] !== 0xd9) {
        throw new BadRequestException('Isi file tidak sesuai dengan format JPEG.');
      }
      return;
    }

    const isXlsx = extension === '.xlsx' && buffer[0] === 0x50 && buffer[1] === 0x4b;
    const isXls = extension === '.xls' && buffer.subarray(0, 8).equals(Buffer.from('D0CF11E0A1B11AE1', 'hex'));
    if (!isXlsx && !isXls) {
      throw new BadRequestException('Isi file tidak sesuai dengan format spreadsheet.');
    }
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer', bookSheets: true });
      if (workbook.SheetNames.length === 0) throw new Error('Missing worksheets');
    } catch {
      throw new BadRequestException('Isi file spreadsheet tidak dapat dibaca.');
    }
  }
}
