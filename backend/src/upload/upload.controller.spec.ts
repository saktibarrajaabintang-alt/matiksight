import { GUARDS_METADATA } from '@nestjs/common/constants';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';

describe('UploadController', () => {
  it('requires the shared JWT guard', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, UploadController)).toContain(JwtAuthGuard);
  });

  it('preserves the UploadService response contract for a valid upload', () => {
    const service = new UploadService();
    const controller = new UploadController(service);
    const content = Buffer.from('a,b');
    expect(controller.upload({
      originalname: 'data.csv', mimetype: 'text/csv', size: content.length, buffer: content,
    })).toEqual({
      success: true,
      message: 'File berhasil diterima.',
      originalName: 'data.csv',
      size: content.length,
      mimeType: 'text/csv',
    });
  });
});
