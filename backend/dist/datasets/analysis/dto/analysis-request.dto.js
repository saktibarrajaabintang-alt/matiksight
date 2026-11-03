"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VisualizationRequestDto = exports.ChartType = exports.AggregateRequestDto = exports.SortDto = exports.FilterDto = exports.MetricDto = exports.FilterOperator = exports.AggregationOperation = void 0;
const openapi = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
var AggregationOperation;
(function (AggregationOperation) {
    AggregationOperation["Count"] = "count";
    AggregationOperation["Sum"] = "sum";
    AggregationOperation["Average"] = "average";
    AggregationOperation["Minimum"] = "minimum";
    AggregationOperation["Maximum"] = "maximum";
    AggregationOperation["DistinctCount"] = "distinct_count";
})(AggregationOperation || (exports.AggregationOperation = AggregationOperation = {}));
var FilterOperator;
(function (FilterOperator) {
    FilterOperator["Equal"] = "eq";
    FilterOperator["NotEqual"] = "neq";
    FilterOperator["GreaterThan"] = "gt";
    FilterOperator["GreaterThanOrEqual"] = "gte";
    FilterOperator["LessThan"] = "lt";
    FilterOperator["LessThanOrEqual"] = "lte";
    FilterOperator["Contains"] = "contains";
    FilterOperator["In"] = "in";
    FilterOperator["IsNull"] = "isNull";
})(FilterOperator || (exports.FilterOperator = FilterOperator = {}));
class MetricDto {
    column;
    operation;
    static _OPENAPI_METADATA_FACTORY() {
        return { column: { required: false, type: () => String }, operation: { required: true, enum: require("./analysis-request.dto").AggregationOperation } };
    }
}
exports.MetricDto = MetricDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], MetricDto.prototype, "column", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(AggregationOperation),
    __metadata("design:type", String)
], MetricDto.prototype, "operation", void 0);
class FilterDto {
    column;
    operator;
    value;
    static _OPENAPI_METADATA_FACTORY() {
        return { column: { required: true, type: () => String }, operator: { required: true, enum: require("./analysis-request.dto").FilterOperator }, value: { required: false, type: () => Object } };
    }
}
exports.FilterDto = FilterDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], FilterDto.prototype, "column", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(FilterOperator),
    __metadata("design:type", String)
], FilterDto.prototype, "operator", void 0);
__decorate([
    (0, class_validator_1.Allow)(),
    __metadata("design:type", Object)
], FilterDto.prototype, "value", void 0);
class SortDto {
    column;
    direction;
    static _OPENAPI_METADATA_FACTORY() {
        return { column: { required: true, type: () => String }, direction: { required: true, enum: ["asc", "desc"] } };
    }
}
exports.SortDto = SortDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SortDto.prototype, "column", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(['asc', 'desc']),
    __metadata("design:type", String)
], SortDto.prototype, "direction", void 0);
class AggregateRequestDto {
    groupBy = [];
    metrics;
    filters = [];
    sort;
    limit = 100;
    static _OPENAPI_METADATA_FACTORY() {
        return { groupBy: { required: true, type: () => [String], default: [], maxItems: 3 }, metrics: { required: false, type: () => [require("./analysis-request.dto").MetricDto], maxItems: 10 }, filters: { required: true, type: () => [require("./analysis-request.dto").FilterDto], default: [], maxItems: 20 }, sort: { required: false, type: () => require("./analysis-request.dto").SortDto }, limit: { required: true, type: () => Object, default: 100, minimum: 1, maximum: 1000 } };
    }
}
exports.AggregateRequestDto = AggregateRequestDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMaxSize)(3),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], AggregateRequestDto.prototype, "groupBy", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMaxSize)(10),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => MetricDto),
    __metadata("design:type", Array)
], AggregateRequestDto.prototype, "metrics", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMaxSize)(20),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => FilterDto),
    __metadata("design:type", Array)
], AggregateRequestDto.prototype, "filters", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateIf)((_object, value) => value !== undefined),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => SortDto),
    __metadata("design:type", SortDto)
], AggregateRequestDto.prototype, "sort", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(1000),
    __metadata("design:type", Object)
], AggregateRequestDto.prototype, "limit", void 0);
var ChartType;
(function (ChartType) {
    ChartType["Bar"] = "bar";
    ChartType["Line"] = "line";
    ChartType["Pie"] = "pie";
    ChartType["Area"] = "area";
    ChartType["Scatter"] = "scatter";
})(ChartType || (exports.ChartType = ChartType = {}));
class VisualizationRequestDto extends AggregateRequestDto {
    chartType;
    xAxis;
    yAxis;
    aggregation = AggregationOperation.Average;
    static _OPENAPI_METADATA_FACTORY() {
        return { chartType: { required: true, enum: require("./analysis-request.dto").ChartType }, xAxis: { required: true, type: () => String }, yAxis: { required: true, type: () => String }, aggregation: { required: true, default: AggregationOperation.Average, enum: require("./analysis-request.dto").AggregationOperation } };
    }
}
exports.VisualizationRequestDto = VisualizationRequestDto;
__decorate([
    (0, class_validator_1.IsEnum)(ChartType),
    __metadata("design:type", String)
], VisualizationRequestDto.prototype, "chartType", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], VisualizationRequestDto.prototype, "xAxis", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], VisualizationRequestDto.prototype, "yAxis", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(AggregationOperation),
    __metadata("design:type", String)
], VisualizationRequestDto.prototype, "aggregation", void 0);
//# sourceMappingURL=analysis-request.dto.js.map