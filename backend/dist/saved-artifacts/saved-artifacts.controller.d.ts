import type { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { CreateSavedReportDto, CreateSavedVisualizationDto, ListSavedArtifactsDto, PatchSavedReportDto, PatchSavedVisualizationDto } from './dto/saved-artifact.dto';
import { SavedArtifactsService } from './saved-artifacts.service';
export declare class SavedVisualizationsController {
    private readonly saved;
    constructor(saved: SavedArtifactsService);
    create(request: AuthenticatedRequest, body: CreateSavedVisualizationDto): Promise<{
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
            configuration: import("@prisma/client/runtime/library").JsonValue;
        } & {
            userId?: string;
        }, "userId">;
    }>;
    list(request: AuthenticatedRequest, query: ListSavedArtifactsDto): Promise<{
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
            configuration: import("@prisma/client/runtime/library").JsonValue;
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
    detail(request: AuthenticatedRequest, id: string): Promise<{
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
            configuration: import("@prisma/client/runtime/library").JsonValue;
        } & {
            userId?: string;
        }, "userId">;
    }>;
    patch(request: AuthenticatedRequest, id: string, body: PatchSavedVisualizationDto): Promise<{
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
            configuration: import("@prisma/client/runtime/library").JsonValue;
        } & {
            userId?: string;
        }, "userId">;
    }>;
    remove(request: AuthenticatedRequest, id: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
export declare class SavedReportsController {
    private readonly saved;
    constructor(saved: SavedArtifactsService);
    create(request: AuthenticatedRequest, body: CreateSavedReportDto): Promise<{
        success: boolean;
        data: Omit<{
            name: string;
            description: string | null;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            datasetId: string;
            configuration: import("@prisma/client/runtime/library").JsonValue;
            snapshot: import("@prisma/client/runtime/library").JsonValue | null;
        } & {
            userId?: string;
        }, "userId">;
    }>;
    list(request: AuthenticatedRequest, query: ListSavedArtifactsDto): Promise<{
        success: boolean;
        data: Omit<{
            name: string;
            description: string | null;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            datasetId: string;
            configuration: import("@prisma/client/runtime/library").JsonValue;
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
    detail(request: AuthenticatedRequest, id: string): Promise<{
        success: boolean;
        data: Omit<{
            name: string;
            description: string | null;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            datasetId: string;
            configuration: import("@prisma/client/runtime/library").JsonValue;
            snapshot: import("@prisma/client/runtime/library").JsonValue | null;
        } & {
            userId?: string;
        }, "userId">;
    }>;
    patch(request: AuthenticatedRequest, id: string, body: PatchSavedReportDto): Promise<{
        success: boolean;
        data: Omit<{
            name: string;
            description: string | null;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            datasetId: string;
            configuration: import("@prisma/client/runtime/library").JsonValue;
            snapshot: import("@prisma/client/runtime/library").JsonValue | null;
        } & {
            userId?: string;
        }, "userId">;
    }>;
    remove(request: AuthenticatedRequest, id: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
