import { UploadFile } from './upload-file.interface';
export declare class UploadService {
    upload(file?: UploadFile): {
        success: boolean;
        message: string;
        originalName: string;
        size: number;
        mimeType: string;
    };
    private validateFileContent;
}
