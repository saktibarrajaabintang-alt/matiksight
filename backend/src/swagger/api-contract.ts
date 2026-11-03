import { applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';

type OpenApiSchema = Record<string, unknown>;

function closeRequestObjects(schema: OpenApiSchema): OpenApiSchema {
  const result = { ...schema };
  if (result.type === 'object') {
    const properties = result.properties as Record<string, OpenApiSchema> | undefined;
    if (properties) result.properties = Object.fromEntries(Object.entries(properties).map(([key, value]) => [key, closeRequestObjects(value)]));
    if (result.additionalProperties === undefined) result.additionalProperties = false;
  }
  if (result.type === 'array' && result.items && typeof result.items === 'object') {
    result.items = closeRequestObjects(result.items as OpenApiSchema);
  }
  return result;
}

function schemaFromExample(value: unknown, key = ''): OpenApiSchema {
  if (value === null) return { type: 'string', nullable: true, example: null };
  if (Array.isArray(value)) {
    return {
      type: 'array',
      items: value.length ? schemaFromExample(value[0]) : {},
      example: value,
    };
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    return {
      type: 'object',
      properties: Object.fromEntries(entries.map(([name, child]) => [name, schemaFromExample(child, name)])),
      ...(entries.length ? { required: entries.map(([name]) => name) } : { additionalProperties: true }),
      example: value,
    };
  }
  if (typeof value === 'boolean') return { type: 'boolean', example: value };
  if (typeof value === 'number') return { type: Number.isInteger(value) ? 'integer' : 'number', example: value };
  if (typeof value === 'string') {
    return {
      type: 'string',
      ...(key.endsWith('At') || key === 'generatedAt' ? { format: 'date-time' } : {}),
      example: value,
    };
  }
  return {};
}

const errorSchema: OpenApiSchema = {
  type: 'object',
  required: ['statusCode', 'message', 'error'],
  properties: {
    statusCode: { type: 'integer', example: 400 },
    message: {
      oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
      example: 'Validation failed',
    },
    error: { type: 'string', example: 'Bad Request' },
  },
  example: { statusCode: 400, message: 'Validation failed', error: 'Bad Request' },
};

const errorDescriptions: Record<number, string> = {
  400: 'Invalid request, DTO validation, or incompatible column configuration.',
  401: 'Missing, invalid, or expired Bearer token.',
  404: 'Resource does not exist or is not owned by the authenticated user.',
  409: 'A unique account field is already in use.',
  413: 'Upload or analysis exceeds the configured processing limit.',
  415: 'Unsupported upload format or media type.',
  429: 'Authentication rate limit exceeded.',
  500: 'Unexpected server error; internal details are not returned.',
};

export function ApiEndpointDocs(options: {
  summary: string;
  description: string;
  successStatus: number;
  successDescription: string;
  successExample: unknown;
  successSchema?: OpenApiSchema;
  successContentType?: string;
  errors?: number[];
}) {
  const successSchema = options.successSchema
    ? { ...options.successSchema, example: options.successExample }
    : schemaFromExample(options.successExample);
  const decorators = [
    ApiOperation({ summary: options.summary, description: options.description }),
    ApiResponse({
      status: options.successStatus,
      description: options.successDescription,
      ...(options.successContentType
        ? { content: { [options.successContentType]: { schema: successSchema } } }
        : { schema: successSchema }),
    }),
    ...(options.errors ?? []).map((status) => ApiResponse({
      status,
      description: errorDescriptions[status] ?? 'Request failed.',
      schema: {
        ...errorSchema,
        example: { statusCode: status, message: status === 500 ? 'Internal server error' : errorDescriptions[status], error: status === 500 ? 'Internal Server Error' : 'Request Error' },
      },
      ...(status === 429 ? {
        headers: { 'Retry-After': { description: 'Seconds until another request is allowed.', schema: { type: 'integer', example: 900 } } },
      } : {}),
    })),
  ];
  return applyDecorators(...decorators);
}

export function ApiJsonRequest(schema: OpenApiSchema, example: unknown, description?: string) {
  return ApiBody({
    required: true,
    description,
    schema: { ...closeRequestObjects(schema), example },
  });
}

export function ApiMultipartFileRequest() {
  return applyDecorators(
    ApiBody({
      required: true,
      description: 'One CSV, XLSX, or XLS file, maximum 20 MiB. The multipart field name is `file`.',
      schema: {
        type: 'object',
        required: ['file'],
        additionalProperties: false,
        properties: { file: { type: 'string', format: 'binary' } },
      },
    }),
  );
}

export function ApiListQuery(includeSearch = false) {
  return applyDecorators(
    ApiQuery({ name: 'page', required: false, schema: { type: 'integer', minimum: 1, maximum: 1_000_000, default: 1 }, example: 1 }),
    ApiQuery({ name: 'limit', required: false, schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 }, example: 20 }),
    ...(includeSearch ? [ApiQuery({ name: 'search', required: false, schema: { type: 'string', maxLength: 100 }, example: 'custom' })] : []),
  );
}

export function ApiUuidPath(name = 'id') {
  return ApiParam({ name, required: true, description: 'UUID resource identifier.', schema: { type: 'string', format: 'uuid' }, example: '00000000-0000-4000-8000-000000000001' });
}
