import { Resolver, Query, Mutation, Args, ObjectType, Field, InputType, ID, Int } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';
import { QuestionsService, Question as QuestionInterface, TestCase as TestCaseInterface, CreateQuestionInput as CreateInput, UpdateQuestionInput as UpdateInput } from './questions.service';

@ObjectType()
export class TestCase {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  questionId: string;

  @Field(() => GraphQLJSON, { description: 'Input data in JSON format' })
  input: any;

  @Field(() => GraphQLJSON, { description: 'Expected output in JSON format' })
  expectedOutput: any;

  @Field(() => Boolean)
  isHidden: boolean;

  @Field(() => Int)
  orderIndex: number;

  @Field()
  createdAt: string;

  @Field()
  updatedAt: string;
}

@ObjectType()
export class Question {
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

  @Field({ nullable: true })
  testCases?: string;

  @Field()
  createdAt: string;

  @Field()
  updatedAt: string;
}

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

@Resolver('Question')
export class QuestionsResolver {
  constructor(private readonly questionsService: QuestionsService) {}

  @Query(() => [Question])
  async questions() {
    return this.questionsService.findAll();
  }

  @Query(() => Question, { nullable: true })
  async question(@Args('id') id: string) {
    return this.questionsService.findOne(id);
  }

  @Query(() => [Question])
  async questionsByDifficulty(@Args('difficulty') difficulty: string) {
    return this.questionsService.findByDifficulty(difficulty);
  }

  @Query(() => [Question])
  async questionsByCategory(@Args('category') category: string) {
    return this.questionsService.findByCategory(category);
  }

  @Query(() => [Question], { description: 'Allocate K random questions for a session with optional filters' })
  async allocateQuestionsForSession(
    @Args('count', { type: () => Number, description: 'Number of questions to allocate' }) count: number,
    @Args('difficulty', { type: () => String, nullable: true, description: 'Filter by difficulty (Easy, Medium, Hard)' }) difficulty?: string,
    @Args('categories', { type: () => [String], nullable: true, description: 'Filter by categories/topics' }) categories?: string[],
  ) {
    return this.questionsService.findRandomQuestions(count, difficulty, categories);
  }

  @Mutation(() => Question)
  async createQuestion(@Args('input') input: CreateQuestionInput) {
    return this.questionsService.create(input);
  }

  @Mutation(() => Question)
  async updateQuestion(
    @Args('id') id: string,
    @Args('input') input: UpdateQuestionInput,
  ) {
    return this.questionsService.update(id, input);
  }

  @Mutation(() => Boolean)
  async deleteQuestion(@Args('id') id: string) {
    return this.questionsService.delete(id);
  }

  @Query(() => [TestCase], { description: 'Get all test cases for a question - all test cases are visible to users' })
  async testCasesForQuestion(
    @Args('questionId', { type: () => ID }) questionId: string,
  ) {
    return this.questionsService.getTestCasesForQuestion(questionId);
  }
}
