import { type ValidationOptions } from 'class-validator';
export declare function MaxUtf8Bytes(maxBytes: number, options?: ValidationOptions): (target: object, propertyName: string) => void;
