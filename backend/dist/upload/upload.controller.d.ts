import type { UploadFile } from './upload-file.interface';
import { UploadService } from './upload.service';
export declare class UploadController {
    private readonly uploadService;
    constructor(uploadService: UploadService);
    upload(file?: UploadFile): {
        success: boolean;
        message: string;
        originalName: string;
        size: number;
        mimeType: string;
    };
}
