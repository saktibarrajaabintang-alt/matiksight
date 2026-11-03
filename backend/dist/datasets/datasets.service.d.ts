import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DatasetProcessingService } from './dataset-processing.service';
import type { UploadFile } from '../upload/upload-file.interface';
import type { ListDatasetsDto } from './dto/list-datasets.dto';
import type { PreviewDatasetDto } from './dto/preview-dataset.dto';
export declare class DatasetsService {
    private readonly prisma;
    private readonly processing;
    constructor(prisma: PrismaService, processing: DatasetProcessingService);
    create(userId: string, file?: UploadFile): Promise<{
        success: boolean;
        dataset: {
            mimeType: string;
            sheetName: string | null;
            name: string;
            id: string;
            fileSize: number;
            createdAt: Date;
            updatedAt: Date;
            columns: Prisma.JsonValue;
            columnMetadata: Prisma.JsonValue;
            profiling: Prisma.JsonValue;
            originalFilename: string;
            fileType: string;
            rowCount: number;
            columnCount: number;
        };
        columns: string[];
        totalRows: number;
        preview: Record<string, unknown>[];
        columnMetadata: import("./dataset-processing.service").ColumnMetadata[];
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
    }>;
    findAll(userId: string, query: ListDatasetsDto): Promise<{
        success: boolean;
        data: Omit<{
            name: string;
            id: string;
            fileSize: number;
            createdAt: Date;
            updatedAt: Date;
            columns: Prisma.JsonValue;
            columnMetadata: Prisma.JsonValue;
            profiling: Prisma.JsonValue;
            originalFilename: string;
            fileType: string;
            rowCount: number;
            columnCount: number;
            userId: string;
        }, "userId">[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    findOne(userId: string, id: string): Promise<{
        success: boolean;
        data: Omit<{
            name: string;
            id: string;
            fileSize: number;
            createdAt: Date;
            updatedAt: Date;
            columns: Prisma.JsonValue;
            columnMetadata: Prisma.JsonValue;
            profiling: Prisma.JsonValue;
            originalFilename: string;
            fileType: string;
            rowCount: number;
            columnCount: number;
            userId: string;
        }, "userId">;
    }>;
    preview(userId: string, id: string, query: PreviewDatasetDto): Promise<{
        success: boolean;
        data: Prisma.JsonValue[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    remove(userId: string, id: string): Promise<{
        success: boolean;
        message: string;
    }>;
    private pagination;
    private toPublicDataset;
}
