import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class CreateQuestionInput {
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

  @Field({ nullable: true })
  testCases?: string;
}
