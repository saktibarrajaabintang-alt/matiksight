import {
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
} from 'class-validator';

export function MaxUtf8Bytes(maxBytes: number, options?: ValidationOptions) {
  return (target: object, propertyName: string) => {
    registerDecorator({
      name: 'maxUtf8Bytes',
      target: target.constructor,
      propertyName,
      constraints: [maxBytes],
      options,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          if (typeof value !== 'string') return false;
          const [limit] = args.constraints as [number];
          return Buffer.byteLength(value, 'utf8') <= limit;
        },
        defaultMessage(args: ValidationArguments) {
          const [limit] = args.constraints as [number];
          return `${args.property} must be at most ${limit} UTF-8 bytes`;
        },
      },
    });
  };
}
