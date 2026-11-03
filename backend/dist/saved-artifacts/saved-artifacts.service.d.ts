import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DatasetAnalysisService } from '../datasets/analysis/dataset-analysis.service';
import { CreateSavedReportDto, CreateSavedVisualizationDto, ListSavedArtifactsDto, PatchSavedReportDto, PatchSavedVisualizationDto } from './dto/saved-artifact.dto';
export declare class SavedArtifactsService {
    private readonly prisma;
    private readonly datasetAnalysis;
    constructor(prisma: PrismaService, datasetAnalysis: DatasetAnalysisService);
    createVisualization(userId: string, input: CreateSavedVisualizationDto): Promise<{
        success: boolean;
        data: Omit<{
            name: string;
            description: string | null;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            datasetId: string;
            chartType: string;
            configuration: Prisma.JsonValue;
        } & {
            userId?: string;
        }, "userId">;
    }>;
    listVisualizations(userId: string, query: ListSavedArtifactsDto): Promise<{
        success: boolean;
        data: Omit<{
            name: string;
            description: string | null;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            datasetId: string;
            chartType: string;
            configuration: Prisma.JsonValue;
        } & {
            userId?: string;
        }, "userId">[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    visualization(userId: string, id: string): Promise<{
        success: boolean;
        data: Omit<{
            name: string;
            description: string | null;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            datasetId: string;
            chartType: string;
            configuration: Prisma.JsonValue;
        } & {
            userId?: string;
        }, "userId">;
    }>;
    patchVisualization(userId: string, id: string, input: PatchSavedVisualizationDto): Promise<{
        success: boolean;
        data: Omit<{
            name: string;
            description: string | null;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            datasetId: string;
            chartType: string;
            configuration: Prisma.JsonValue;
        } & {
            userId?: string;
        }, "userId">;
    }>;
    removeVisualization(userId: string, id: string): Promise<{
        success: boolean;
        message: string;
    }>;
    createReport(userId: string, input: CreateSavedReportDto): Promise<{
        success: boolean;
        data: Omit<{
            name: string;
            description: string | null;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            datasetId: string;
            configuration: Prisma.JsonValue;
            snapshot: Prisma.JsonValue | null;
        } & {
            userId?: string;
        }, "userId">;
    }>;
    listReports(userId: string, query: ListSavedArtifactsDto): Promise<{
        success: boolean;
        data: Omit<{
            name: string;
            description: string | null;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            datasetId: string;
            configuration: Prisma.JsonValue;
        } & {
            userId?: string;
        }, "userId">[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    report(userId: string, id: string): Promise<{
        success: boolean;
        data: Omit<{
            name: string;
            description: string | null;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            datasetId: string;
            configuration: Prisma.JsonValue;
            snapshot: Prisma.JsonValue | null;
        } & {
            userId?: string;
        }, "userId">;
    }>;
    patchReport(userId: string, id: string, input: PatchSavedReportDto): Promise<{
        success: boolean;
        data: Omit<{
            name: string;
            description: string | null;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            datasetId: string;
            configuration: Prisma.JsonValue;
            snapshot: Prisma.JsonValue | null;
        } & {
            userId?: string;
        }, "userId">;
    }>;
    removeReport(userId: string, id: string): Promise<{
        success: boolean;
        message: string;
    }>;
    private validateVisualization;
    private assertDatasetOwner;
    private assertName;
    private checkedName;
    private assertSize;
    private assertPatchHasFields;
    private toPublicArtifact;
    private pagination;
}
