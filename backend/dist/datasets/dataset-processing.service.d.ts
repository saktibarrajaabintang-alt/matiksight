import type { UploadFile } from '../upload/upload-file.interface';
export interface DatasetPreview {
    success: true;
    dataset: {
        originalName: string;
        size: number;
        mimeType: string;
        sheetName: string | null;
    };
    columns: string[];
    totalRows: number;
    preview: Record<string, unknown>[];
    columnMetadata: ColumnMetadata[];
    profiling: {
        totalRows: number;
        totalColumns: number;
        duplicateRows: number;
        missingValues: number;
        dateRange: {
            column: string;
            min: string;
            max: string;
        }[];
        dataQuality: {
            score: number;
            missingValues: number;
            duplicateRows: number;
        };
    };
}
export interface ColumnMetadata {
    name: string;
    type: 'number' | 'date' | 'boolean' | 'category' | 'text' | 'mixed' | 'unknown';
    nullable: boolean;
    uniqueCount: number;
    nullCount: number;
    min?: number | string;
    max?: number | string;
    mean?: number;
}
export declare class DatasetProcessingService {
    process(file?: UploadFile): DatasetPreview;
    parse(file?: UploadFile): DatasetPreview & {
        rows: Record<string, unknown>[];
    };
    private profile;
    private inferType;
    private isDateString;
    private numberValue;
    private dateValue;
    private valueKey;
    private extensionOf;
    private hasValue;
    private makeHeaders;
    private headerText;
    private validateContent;
}
