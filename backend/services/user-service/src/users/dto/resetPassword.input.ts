import { InputType, Field } from "@nestjs/graphql";
import { IsEmail } from "class-validator";

@InputType()
export class ResetPasswordInput {
  @Field()
  @IsEmail()
  email!: string;
}
