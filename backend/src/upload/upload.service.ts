import {
  BadRequestException,
  Injectable,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { UploadFile } from './upload-file.interface';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
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

    if (file.size > MAX_FILE_SIZE) {
      throw new PayloadTooLargeException('Ukuran file maksimal 10 MB.');
    }

    const extension = file.originalname
      .slice(file.originalname.lastIndexOf('.'))
      .toLowerCase();
    const acceptedMimeTypes = ALLOWED_TYPES[extension];

    if (!acceptedMimeTypes) {
      throw new UnsupportedMediaTypeException('Format file tidak didukung.');
    }

    if (!acceptedMimeTypes.includes(file.mimetype.toLowerCase())) {
      throw new UnsupportedMediaTypeException(
        'Ekstensi file dan MIME type tidak sesuai atau tidak didukung.',
      );
    }

    return {
      success: true,
      message: 'File berhasil diterima.',
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
    };
  }
}
