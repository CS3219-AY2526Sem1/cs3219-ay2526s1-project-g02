import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class MatchType {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  user1_id: string;

  @Field(() => ID)
  user2_id: string;

  @Field()
  status: string;

  @Field()
  created_at: string;

  @Field({ nullable: true })
  ended_at?: string;
}

@ObjectType()
export class QuestionType {
  @Field(() => ID)
  id: string;

  @Field()
  title: string;

  @Field()
  description: string;

  @Field()
  difficulty: string;

  @Field(() => [String])
  category: string[];

  @Field({ nullable: true })
  examples?: string;

  @Field({ nullable: true })
  constraints?: string;

  @Field()
  created_at: string;

  @Field()
  updated_at: string;
}

@ObjectType()
export class SessionType {
  @Field(() => ID)
  id: string;

  @Field()
  match_id: string;

  @Field({ nullable: true })
  question_id?: string;

  @Field()
  code: string;

  @Field()
  language: string;

  @Field()
  status: string;

  @Field({ nullable: true })
  end_at?: string;

  @Field()
  created_at: string;

  @Field({ nullable: true })
  updated_at?: string;

  @Field(() => MatchType, { nullable: true })
  match?: MatchType;

  @Field(() => QuestionType, { nullable: true })
  question?: QuestionType;
}
