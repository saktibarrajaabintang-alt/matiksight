import { IsString, MaxLength, MinLength } from 'class-validator';
import { MaxUtf8Bytes } from '../validators/max-utf8-bytes.validator';

export class LoginDto {
  @IsString()
  @MinLength(1)
  @MaxLength(254)
  identifier: string;

  @IsString()
  @MinLength(1)
  @MaxLength(72)
  @MaxUtf8Bytes(72)
  password: string;
}
