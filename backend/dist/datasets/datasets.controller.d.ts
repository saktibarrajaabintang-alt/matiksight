import type { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import type { UploadFile } from '../upload/upload-file.interface';
import { ListDatasetsDto } from './dto/list-datasets.dto';
import { PreviewDatasetDto } from './dto/preview-dataset.dto';
import { DatasetsService } from './datasets.service';
import { DatasetAnalysisService } from './analysis/dataset-analysis.service';
import { AggregateRequestDto, VisualizationRequestDto } from './analysis/dto/analysis-request.dto';
export declare class DatasetsController {
    private readonly datasets;
    private readonly analysisService;
    constructor(datasets: DatasetsService, analysisService: DatasetAnalysisService);
    upload(request: AuthenticatedRequest, file?: UploadFile): Promise<{
        success: boolean;
        dataset: {
            mimeType: string;
            sheetName: string | null;
            name: string;
            id: string;
            fileSize: number;
            createdAt: Date;
            updatedAt: Date;
            columns: import("@prisma/client/runtime/library").JsonValue;
            columnMetadata: import("@prisma/client/runtime/library").JsonValue;
            profiling: import("@prisma/client/runtime/library").JsonValue;
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
    list(request: AuthenticatedRequest, query: ListDatasetsDto): Promise<{
        success: boolean;
        data: Omit<{
            name: string;
            id: string;
            fileSize: number;
            createdAt: Date;
            updatedAt: Date;
            columns: import("@prisma/client/runtime/library").JsonValue;
            columnMetadata: import("@prisma/client/runtime/library").JsonValue;
            profiling: import("@prisma/client/runtime/library").JsonValue;
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
    preview(request: AuthenticatedRequest, id: string, query: PreviewDatasetDto): Promise<{
        success: boolean;
        data: import("@prisma/client/runtime/library").JsonValue[];
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
            id: string;
            fileSize: number;
            createdAt: Date;
            updatedAt: Date;
            columns: import("@prisma/client/runtime/library").JsonValue;
            columnMetadata: import("@prisma/client/runtime/library").JsonValue;
            profiling: import("@prisma/client/runtime/library").JsonValue;
            originalFilename: string;
            fileType: string;
            rowCount: number;
            columnCount: number;
            userId: string;
        }, "userId">;
    }>;
    remove(request: AuthenticatedRequest, id: string): Promise<{
        success: boolean;
        message: string;
    }>;
    analysis(request: AuthenticatedRequest, id: string): Promise<{
        success: boolean;
        data: {
            overview: {
                id: string;
                name: string;
                totalRows: number;
                totalColumns: number;
            };
            columnTypes: Record<string, number>;
            columns: import("./dataset-processing.service").ColumnMetadata[];
            numericStatistics: {
                name: string;
                nullCount: number;
                uniqueCount: number;
                min: string | number | undefined;
                max: string | number | undefined;
                mean: number | undefined;
            }[];
            categoricalSummary: {
                name: string;
                type: "number" | "boolean" | "date" | "category" | "text" | "mixed" | "unknown";
                nullCount: number;
                uniqueCount: number;
            }[];
            dateRange: any[];
            dataQuality: {};
            recommendations: {
                chartType: import("./analysis/dto/analysis-request.dto").ChartType;
                xAxis: string;
                yAxis: string;
                aggregation: import("./analysis/dto/analysis-request.dto").AggregationOperation;
                reason: string;
            }[];
        };
    }>;
    aggregate(request: AuthenticatedRequest, id: string, body: AggregateRequestDto): Promise<{
        success: boolean;
        data: {
            datasetId: string;
            groupBy: string[];
            metrics: {
                key: string;
                column: string | null;
                operation: import("./analysis/dto/analysis-request.dto").AggregationOperation;
            }[];
            filters: import("./analysis/dto/analysis-request.dto").FilterDto[];
            totalGroups: number;
            limit: number;
            results: {
                [x: string]: unknown;
            }[];
        };
    }>;
    visualizationData(request: AuthenticatedRequest, id: string, body: VisualizationRequestDto): Promise<{
        success: boolean;
        chart: {
            type: import("./analysis/dto/analysis-request.dto").ChartType;
            xAxis: string;
            yAxis: string;
            aggregation: null;
            totalGroups: number;
            limit: number;
        };
        data: {
            [x: string]: unknown;
        }[];
    } | {
        success: boolean;
        chart: {
            type: import("./analysis/dto/analysis-request.dto").ChartType.Bar | import("./analysis/dto/analysis-request.dto").ChartType.Line | import("./analysis/dto/analysis-request.dto").ChartType.Pie | import("./analysis/dto/analysis-request.dto").ChartType.Area;
            xAxis: string;
            yAxis: string;
            aggregation: import("./analysis/dto/analysis-request.dto").AggregationOperation;
            groupBy: string[];
            totalGroups: number;
            limit: number;
        };
        data: {
            value: unknown;
        }[];
    }>;
}
