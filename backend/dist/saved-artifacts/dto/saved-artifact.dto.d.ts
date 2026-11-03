import { AggregationOperation, ChartType, FilterDto, SortDto } from '../../datasets/analysis/dto/analysis-request.dto';
export declare class SavedVisualizationConfigurationDto {
    chartType: ChartType;
    xAxis: string;
    yAxis: string;
    groupBy: string[];
    aggregation: AggregationOperation;
    filters: FilterDto[];
    sort?: SortDto;
    limit: number;
}
export declare class CreateSavedVisualizationDto {
    datasetId: string;
    name: string;
    description?: string;
    configuration: SavedVisualizationConfigurationDto;
}
export declare class PatchSavedVisualizationDto {
    datasetId?: string;
    name?: string;
    description?: string;
    configuration?: SavedVisualizationConfigurationDto;
}
export declare class CreateSavedReportDto {
    datasetId: string;
    name: string;
    description?: string;
    configuration: Record<string, unknown>;
    snapshot?: Record<string, unknown>;
}
export declare class PatchSavedReportDto {
    datasetId?: string;
    name?: string;
    description?: string;
    configuration?: Record<string, unknown>;
    snapshot?: Record<string, unknown> | null;
}
export declare class ListSavedArtifactsDto {
    page: number;
    limit: number;
    search?: string;
}
