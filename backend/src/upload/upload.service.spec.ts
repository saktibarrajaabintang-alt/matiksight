import {
  BadRequestException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import type { FileStorageService } from '../storage/file-storage.service';
import type { UploadFile } from './upload-file.interface';
import { UploadService } from './upload.service';

describe('UploadService', () => {
  let service: UploadService;
  const prisma = {
    uploadedFile: {
      create: jest.fn(async () => ({ id: '00000000-0000-4000-8000-000000000001', createdAt: new Date() })),
      findFirst: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
  const storage = {
    store: jest.fn(async () => '00000000-0000-4000-8000-000000000002.csv'),
    read: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UploadService(prisma as unknown as PrismaService, storage as unknown as FileStorageService);
  });

  it('stores validated file metadata for the authenticated owner', async () => {
    const file: UploadFile = {
      originalname: 'report.csv',
      mimetype: 'text/csv',
      size: Buffer.byteLength('a,b'),
      buffer: Buffer.from('a,b'),
    };

    await expect(service.upload('owner-id', file)).resolves.toMatchObject({
      success: true,
      message: 'File berhasil diterima.',
      originalName: 'report.csv',
      size: Buffer.byteLength('a,b'),
      mimeType: 'text/csv',
      id: '00000000-0000-4000-8000-000000000001',
    });
    expect(storage.store).toHaveBeenCalledWith(file.buffer, '.csv');
    expect(prisma.uploadedFile.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ userId: 'owner-id', originalFilename: 'report.csv' }),
    }));
  });

  it('rejects a missing file', async () => {
    await expect(service.upload('owner-id')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an unsupported extension', async () => {
    const file = {
      originalname: 'report.pdf',
      mimetype: 'application/pdf',
      size: 42,
      buffer: Buffer.from('pdf'),
    };
    await expect(service.upload('owner-id', file)).rejects.toBeInstanceOf(UnsupportedMediaTypeException);
  });

  it('rejects a mismatched MIME type', async () => {
    const file = {
      originalname: 'image.png',
      mimetype: 'image/jpeg',
      size: 42,
      buffer: Buffer.from('image'),
    };
    await expect(service.upload('owner-id', file)).rejects.toBeInstanceOf(UnsupportedMediaTypeException);
  });

  it('rejects files larger than 20 MB', async () => {
    const file = {
      originalname: 'large.csv',
      mimetype: 'text/csv',
      size: 20 * 1024 * 1024 + 1,
      buffer: Buffer.alloc(0),
    };
    await expect(service.upload('owner-id', file)).rejects.toBeInstanceOf(PayloadTooLargeException);
  });

  it('rejects empty content and MIME or signature mismatches', async () => {
    await expect(service.upload('owner-id', { originalname: 'empty.csv', mimetype: 'text/csv', size: 0, buffer: Buffer.alloc(0) }))
      .rejects.toBeInstanceOf(BadRequestException);
    await expect(service.upload('owner-id', { originalname: 'bad.csv', mimetype: 'text/csv', size: 3, buffer: Buffer.from([0xff, 0xfe, 0xfd]) }))
      .rejects.toBeInstanceOf(BadRequestException);
    await expect(service.upload('owner-id', { originalname: 'fake.png', mimetype: 'image/png', size: 5, buffer: Buffer.from('hello') }))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts image uploads only when the extension, MIME, and file signature agree', async () => {
    const png = Buffer.alloc(24);
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(png, 0);
    png.write('IHDR', 12, 'ascii');
    png.writeUInt32BE(1, 16);
    png.writeUInt32BE(1, 20);
    await expect(service.upload('owner-id', {
      originalname: 'image.png', mimetype: 'image/png', size: png.length, buffer: png,
    })).resolves.toMatchObject({ success: true });
  });
});
