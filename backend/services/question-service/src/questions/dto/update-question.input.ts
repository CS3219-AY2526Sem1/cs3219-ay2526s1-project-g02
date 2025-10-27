import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class UpdateQuestionInput {
  @Field({ nullable: true })
  title?: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  difficulty?: string;

  @Field(() => [String], { nullable: true })
  category?: string[];

  @Field({ nullable: true })
  examples?: string;

  @Field({ nullable: true })
  constraints?: string;

  @Field({ nullable: true })
  testCases?: string;
}
