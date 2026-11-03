import {
  BadRequestException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { UploadFile } from './upload-file.interface';
import { UploadService } from './upload.service';

describe('UploadService', () => {
  let service: UploadService;

  beforeEach(() => {
    service = new UploadService();
  });

  it('returns upload metadata for a supported file', () => {
    const file: UploadFile = {
      originalname: 'report.csv',
      mimetype: 'text/csv',
      size: Buffer.byteLength('a,b'),
      buffer: Buffer.from('a,b'),
    };

    expect(service.upload(file)).toEqual({
      success: true,
      message: 'File berhasil diterima.',
      originalName: 'report.csv',
      size: Buffer.byteLength('a,b'),
      mimeType: 'text/csv',
    });
  });

  it('rejects a missing file', () => {
    expect(() => service.upload()).toThrow(BadRequestException);
  });

  it('rejects an unsupported extension', () => {
    const file = {
      originalname: 'report.pdf',
      mimetype: 'application/pdf',
      size: 42,
      buffer: Buffer.from('pdf'),
    };

    expect(() => service.upload(file)).toThrow(UnsupportedMediaTypeException);
  });

  it('rejects a mismatched MIME type', () => {
    const file = {
      originalname: 'image.png',
      mimetype: 'image/jpeg',
      size: 42,
      buffer: Buffer.from('image'),
    };

    expect(() => service.upload(file)).toThrow(UnsupportedMediaTypeException);
  });

  it('rejects files larger than 20 MB', () => {
    const file = {
      originalname: 'large.csv',
      mimetype: 'text/csv',
      size: 20 * 1024 * 1024 + 1,
      buffer: Buffer.alloc(0),
    };

    expect(() => service.upload(file)).toThrow(PayloadTooLargeException);
  });

  it('rejects empty content and MIME or signature mismatches', () => {
    expect(() => service.upload({ originalname: 'empty.csv', mimetype: 'text/csv', size: 0, buffer: Buffer.alloc(0) })).toThrow(BadRequestException);
    expect(() => service.upload({ originalname: 'bad.csv', mimetype: 'text/csv', size: 3, buffer: Buffer.from([0xff, 0xfe, 0xfd]) })).toThrow(BadRequestException);
    expect(() => service.upload({ originalname: 'fake.png', mimetype: 'image/png', size: 5, buffer: Buffer.from('hello') })).toThrow(BadRequestException);
  });

  it('accepts image uploads only when the extension, MIME, and file signature agree', () => {
    const png = Buffer.alloc(24);
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(png, 0);
    png.write('IHDR', 12, 'ascii');
    png.writeUInt32BE(1, 16);
    png.writeUInt32BE(1, 20);
    expect(service.upload({ originalname: 'image.png', mimetype: 'image/png', size: png.length, buffer: png })).toMatchObject({ success: true });
  });
});
