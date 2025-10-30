import { ObjectType, Field } from "@nestjs/graphql";
import { GqlUser } from "./user.model";

@ObjectType()
export class AuthPayload {
  @Field({ nullable: true, name: "access_token" })
  access_token?: string;

  @Field({ nullable: true, name: "refresh_token" })
  refresh_token?: string;

  @Field(() => GqlUser, { nullable: true })
  user?: GqlUser;
}
