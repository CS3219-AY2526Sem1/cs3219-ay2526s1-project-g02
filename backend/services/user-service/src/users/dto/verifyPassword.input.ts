import { InputType, Field } from "@nestjs/graphql";
import { IsEmail, IsString, MinLength } from "class-validator";

@InputType()
export class VerifyPasswordInput {
  @Field()
  @IsEmail()
  email!: string;

  @Field()
  @IsString()
  @MinLength(1) // keep strong rules for register/change, not verify/login
  password!: string;
}
