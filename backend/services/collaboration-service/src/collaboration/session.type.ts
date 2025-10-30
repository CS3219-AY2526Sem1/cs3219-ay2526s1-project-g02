import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class SessionType {
  @Field(() => ID)
  id: string;

  @Field()
  match_id: string;

  @Field()
  code: string;

  @Field()
  language: string;

  @Field()
  status: string;

  @Field({ nullable: true })
  ended_at?: string;

  @Field()
  created_at: string;

  @Field()
  updated_at: string;
}
