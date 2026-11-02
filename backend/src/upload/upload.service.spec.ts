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
      size: 42,
      buffer: Buffer.from('a,b'),
    };

    expect(service.upload(file)).toEqual({
      success: true,
      message: 'File berhasil diterima.',
      originalName: 'report.csv',
      size: 42,
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

  it('rejects files larger than 10 MB', () => {
    const file = {
      originalname: 'large.csv',
      mimetype: 'text/csv',
      size: 10 * 1024 * 1024 + 1,
      buffer: Buffer.alloc(0),
    };

    expect(() => service.upload(file)).toThrow(PayloadTooLargeException);
  });
});
