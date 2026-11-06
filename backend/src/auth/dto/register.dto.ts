import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { MaxUtf8Bytes } from '../validators/max-utf8-bytes.validator';

export class RegisterDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  fullName?: string;

  @IsString()
  @Matches(/^[a-zA-Z0-9_]{3,30}$/)
  username: string;

  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @MaxUtf8Bytes(72)
  password: string;
}
