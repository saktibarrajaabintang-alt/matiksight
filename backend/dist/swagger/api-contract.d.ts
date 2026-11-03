type OpenApiSchema = Record<string, unknown>;
export declare function ApiEndpointDocs(options: {
    summary: string;
    description: string;
    successStatus: number;
    successDescription: string;
    successExample: unknown;
    successSchema?: OpenApiSchema;
    successContentType?: string;
    errors?: number[];
}): <TFunction extends Function, Y>(target: TFunction | object, propertyKey?: string | symbol, descriptor?: TypedPropertyDescriptor<Y>) => void;
export declare function ApiJsonRequest(schema: OpenApiSchema, example: unknown, description?: string): MethodDecorator;
export declare function ApiMultipartFileRequest(): <TFunction extends Function, Y>(target: TFunction | object, propertyKey?: string | symbol, descriptor?: TypedPropertyDescriptor<Y>) => void;
export declare function ApiListQuery(includeSearch?: boolean): <TFunction extends Function, Y>(target: TFunction | object, propertyKey?: string | symbol, descriptor?: TypedPropertyDescriptor<Y>) => void;
export declare function ApiUuidPath(name?: string): MethodDecorator & ClassDecorator;
export {};
