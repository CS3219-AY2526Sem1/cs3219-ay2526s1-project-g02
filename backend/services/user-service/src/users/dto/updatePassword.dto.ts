import {
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
  IsStrongPassword,
} from "class-validator";

export class UpdatePasswordDto {
  @IsString()
  @MinLength(12)
  @IsStrongPassword({
    minLength: 12,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1,
  })
  password!: string;
}
