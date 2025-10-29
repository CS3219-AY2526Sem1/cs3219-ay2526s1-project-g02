import { InputType, Field } from "@nestjs/graphql";
import { IsString } from "class-validator";

@InputType()
export class DeleteAccountInput {
  @Field()
  @IsString()
  userId!: string;
}
