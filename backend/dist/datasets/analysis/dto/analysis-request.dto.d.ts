export declare enum AggregationOperation {
    Count = "count",
    Sum = "sum",
    Average = "average",
    Minimum = "minimum",
    Maximum = "maximum",
    DistinctCount = "distinct_count"
}
export declare enum FilterOperator {
    Equal = "eq",
    NotEqual = "neq",
    GreaterThan = "gt",
    GreaterThanOrEqual = "gte",
    LessThan = "lt",
    LessThanOrEqual = "lte",
    Contains = "contains",
    In = "in",
    IsNull = "isNull"
}
export declare class MetricDto {
    column?: string;
    operation: AggregationOperation;
}
export declare class FilterDto {
    column: string;
    operator: FilterOperator;
    value?: unknown;
}
export declare class SortDto {
    column: string;
    direction: 'asc' | 'desc';
}
export declare class AggregateRequestDto {
    groupBy: string[];
    metrics?: MetricDto[];
    filters: FilterDto[];
    sort?: SortDto;
    limit: number;
}
export declare enum ChartType {
    Bar = "bar",
    Line = "line",
    Pie = "pie",
    Area = "area",
    Scatter = "scatter"
}
export declare class VisualizationRequestDto extends AggregateRequestDto {
    chartType: ChartType;
    xAxis: string;
    yAxis: string;
    aggregation: AggregationOperation;
}
