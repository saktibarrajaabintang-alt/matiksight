import { IsString, MaxLength, MinLength } from 'class-validator';
import { MaxUtf8Bytes } from '../validators/max-utf8-bytes.validator';

export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  @MaxLength(72)
  @MaxUtf8Bytes(72)
  currentPassword: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @MaxUtf8Bytes(72)
  newPassword: string;
}
