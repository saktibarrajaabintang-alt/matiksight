"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaxUtf8Bytes = MaxUtf8Bytes;
const class_validator_1 = require("class-validator");
function MaxUtf8Bytes(maxBytes, options) {
    return (target, propertyName) => {
        (0, class_validator_1.registerDecorator)({
            name: 'maxUtf8Bytes',
            target: target.constructor,
            propertyName,
            constraints: [maxBytes],
            options,
            validator: {
                validate(value, args) {
                    if (typeof value !== 'string')
                        return false;
                    const [limit] = args.constraints;
                    return Buffer.byteLength(value, 'utf8') <= limit;
                },
                defaultMessage(args) {
                    const [limit] = args.constraints;
                    return `${args.property} must be at most ${limit} UTF-8 bytes`;
                },
            },
        });
    };
}
//# sourceMappingURL=max-utf8-bytes.validator.js.map