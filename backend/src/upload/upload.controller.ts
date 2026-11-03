import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { UploadFile } from './upload-file.interface';
import { UploadService } from './upload.service';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import { ApiEndpointDocs, ApiMultipartFileRequest } from '../swagger/api-contract';

@Controller('upload')
@ApiTags('legacy upload')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiMultipartFileRequest()
  @ApiEndpointDocs({
    summary: 'Validate and receive an upload',
    description: 'Requires a Bearer JWT. Accepts CSV, XLSX, XLS, PNG, or JPEG up to 20 MiB in multipart field `file`; preserves the legacy metadata response.',
    successStatus: 201,
    successDescription: 'File validated and accepted.',
    successExample: { success: true, message: 'File berhasil diterima.', originalName: 'report.csv', size: 42, mimeType: 'text/csv' },
    errors: [400, 401, 413, 415, 500],
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 20 * 1024 * 1024, files: 1 },
    }),
  )
  upload(@UploadedFile() file?: UploadFile) {
    return this.uploadService.upload(file);
  }
}
