import { ObjectType, Field, ID } from "@nestjs/graphql";

@ObjectType()
export class GqlUser {
  @Field(() => ID)
  id!: string;

  @Field({ nullable: true })
  email?: string;

  // add more fields as needed (e.g., app_metadata, user_metadata as JSON scalars)
}
