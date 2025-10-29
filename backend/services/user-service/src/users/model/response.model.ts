// src/users/models/register-response.model.ts
import { ObjectType, Field } from "@nestjs/graphql";

@ObjectType()
export class UserResponse {
  @Field()
  message!: string;
}
