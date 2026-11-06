import { GUARDS_METADATA } from '@nestjs/common/constants';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';

describe('UploadController', () => {
  it('requires the shared JWT guard', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, UploadController)).toContain(JwtAuthGuard);
  });

  it('preserves the UploadService response contract for a valid upload', async () => {
    const upload = jest.fn().mockResolvedValue({
      success: true,
      message: 'File berhasil diterima.',
      originalName: 'data.csv',
      size: 3,
      mimeType: 'text/csv',
      id: '00000000-0000-4000-8000-000000000001',
    });
    const service = {
      upload,
    } as unknown as UploadService;
    const controller = new UploadController(service);
    const content = Buffer.from('a,b');
    await expect(controller.upload({ user: { id: 'owner-id' } } as never, {
      originalname: 'data.csv', mimetype: 'text/csv', size: content.length, buffer: content,
    })).resolves.toEqual({
      success: true,
      message: 'File berhasil diterima.',
      originalName: 'data.csv',
      size: 3,
      mimeType: 'text/csv',
      id: '00000000-0000-4000-8000-000000000001',
    });
    expect(upload).toHaveBeenCalledWith('owner-id', expect.objectContaining({ originalname: 'data.csv' }));
  });
});
