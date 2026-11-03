import type { ColumnMetadata } from '../dataset-processing.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AggregateRequestDto, AggregationOperation, ChartType, FilterDto, VisualizationRequestDto } from './dto/analysis-request.dto';
type DataRow = Record<string, unknown>;
export declare class DatasetAnalysisService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    analysis(userId: string, datasetId: string): Promise<{
        success: boolean;
        data: {
            overview: {
                id: string;
                name: string;
                totalRows: number;
                totalColumns: number;
            };
            columnTypes: Record<string, number>;
            columns: ColumnMetadata[];
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
                chartType: ChartType;
                xAxis: string;
                yAxis: string;
                aggregation: AggregationOperation;
                reason: string;
            }[];
        };
    }>;
    aggregate(userId: string, datasetId: string, request: AggregateRequestDto): Promise<{
        success: boolean;
        data: {
            datasetId: string;
            groupBy: string[];
            metrics: {
                key: string;
                column: string | null;
                operation: AggregationOperation;
            }[];
            filters: FilterDto[];
            totalGroups: number;
            limit: number;
            results: {
                [x: string]: unknown;
            }[];
        };
    }>;
    visualizationData(userId: string, datasetId: string, request: VisualizationRequestDto): Promise<{
        success: boolean;
        chart: {
            type: ChartType;
            xAxis: string;
            yAxis: string;
            aggregation: null;
            totalGroups: number;
            limit: number;
        };
        data: DataRow[];
    } | {
        success: boolean;
        chart: {
            type: ChartType.Bar | ChartType.Line | ChartType.Pie | ChartType.Area;
            xAxis: string;
            yAxis: string;
            aggregation: AggregationOperation;
            groupBy: string[];
            totalGroups: number;
            limit: number;
        };
        data: {
            value: unknown;
        }[];
    }>;
    validateSavedVisualization(userId: string, datasetId: string, request: VisualizationRequestDto): Promise<{
        chartType: ChartType;
        xAxis: string;
        yAxis: string;
        groupBy: string[];
        aggregation: AggregationOperation;
        filters: FilterDto[];
        sort: import("./dto/analysis-request.dto").SortDto | null;
        limit: number;
    }>;
    private scatterData;
    private validateChartType;
    private validateGroupBy;
    private validateMetrics;
    private validateFilters;
    private validateSort;
    private emptyBucket;
    private addMetric;
    private metricValue;
    private matchesFilter;
    private equals;
    private normalize;
    private compare;
    private numeric;
    private scalarString;
    private isPresent;
    private keyOf;
    private findDataset;
    private columnsOf;
    private asObject;
    private recommendations;
    private readRows;
    private checkScanSize;
}
export {};
