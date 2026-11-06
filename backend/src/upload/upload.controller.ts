import {
  Delete,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  Res,
  StreamableFile,
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
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { ApiEndpointDocs, ApiMultipartFileRequest } from '../swagger/api-contract';
import { attachmentContentDisposition } from '../security/content-disposition';

@Controller('upload')
@ApiTags('legacy upload')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiMultipartFileRequest('One CSV, XLSX, XLS, PNG, or JPEG file, maximum 20 MiB. The multipart field name is `file`.')
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
  upload(@Req() request: AuthenticatedRequest, @UploadedFile() file?: UploadFile) {
    return this.uploadService.upload(request.user.id, file);
  }

  @Get(':id')
  @ApiEndpointDocs({
    summary: 'Download an owned uploaded file',
    description: 'Requires ****** and file ownership. Always downloads as an attachment.',
    successStatus: 200,
    successDescription: 'Original uploaded file.',
    successExample: { message: 'Binary file response' },
    successContentType: 'application/octet-stream',
    errors: [401, 404, 500],
  })
  async download(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const file = await this.uploadService.download(request.user.id, id);
    response.setHeader('Content-Type', file.mimeType);
    response.setHeader('Content-Length', file.buffer.length);
    response.setHeader('Content-Disposition', attachmentContentDisposition(file.filename));
    response.setHeader('X-Content-Type-Options', 'nosniff');
    return new StreamableFile(file.buffer);
  }

  @Delete(':id')
  remove(@Req() request: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.uploadService.remove(request.user.id, id);
  }
}
