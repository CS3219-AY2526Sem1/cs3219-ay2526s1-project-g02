import { InputType, Field } from "@nestjs/graphql";
import {
  IsEmail,
  IsString,
  MinLength,
  IsStrongPassword,
} from "class-validator";

@InputType()
export class LoginInput {
  @Field()
  @IsEmail()
  email!: string;

  @Field()
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
