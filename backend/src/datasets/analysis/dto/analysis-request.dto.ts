import { Type } from 'class-transformer';
import {
  Allow,
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export enum AggregationOperation {
  Count = 'count',
  Sum = 'sum',
  Average = 'average',
  Minimum = 'minimum',
  Maximum = 'maximum',
  DistinctCount = 'distinct_count',
}

export enum FilterOperator {
  Equal = 'eq',
  NotEqual = 'neq',
  GreaterThan = 'gt',
  GreaterThanOrEqual = 'gte',
  LessThan = 'lt',
  LessThanOrEqual = 'lte',
  Contains = 'contains',
  In = 'in',
  IsNull = 'isNull',
}

export class MetricDto {
  @IsOptional()
  @IsString()
  column?: string;

  @IsEnum(AggregationOperation)
  operation: AggregationOperation;
}

export class FilterDto {
  @IsString()
  column: string;

  @IsEnum(FilterOperator)
  operator: FilterOperator;

  @Allow()
  value?: unknown;
}

export class SortDto {
  @IsString()
  column: string;

  @IsEnum(['asc', 'desc'])
  direction: 'asc' | 'desc';
}

export class AggregateRequestDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @IsString({ each: true })
  groupBy: string[] = [];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => MetricDto)
  metrics?: MetricDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => FilterDto)
  filters: FilterDto[] = [];

  @IsOptional()
  @ValidateIf((_object, value) => value !== undefined)
  @ValidateNested()
  @Type(() => SortDto)
  sort?: SortDto;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  limit = 100;
}

export enum ChartType {
  Bar = 'bar',
  Line = 'line',
  Pie = 'pie',
  Area = 'area',
  Scatter = 'scatter',
}

export class VisualizationRequestDto extends AggregateRequestDto {
  @IsEnum(ChartType)
  chartType: ChartType;

  @IsString()
  xAxis: string;

  @IsString()
  yAxis: string;

  @IsOptional()
  @IsEnum(AggregationOperation)
  aggregation: AggregationOperation = AggregationOperation.Average;
}
