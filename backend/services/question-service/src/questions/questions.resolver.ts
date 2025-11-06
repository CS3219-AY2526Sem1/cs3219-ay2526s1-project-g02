import { Resolver, Query, Mutation, Args, ObjectType, Field, InputType, ID, Int, registerEnumType } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';
import {
  QuestionsService,
  QuestionSelectionResult,
  SubmitQuestionSelectionInput as SubmitSelectionInput,
} from './questions.service';

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

enum QuestionSelectionStatusEnum {
  PENDING = 'PENDING',
  COMPLETE = 'COMPLETE',
  ALREADY_ASSIGNED = 'ALREADY_ASSIGNED',
}

registerEnumType(QuestionSelectionStatusEnum, {
  name: 'QuestionSelectionStatus',
});

@ObjectType()
export class QuestionSelectionEntry {
  @Field()
  userId: string;

  @Field()
  questionId: string;

  @Field(() => Boolean, { nullable: true })
  isWinner?: boolean | null;

  @Field({ nullable: true })
  submittedAt?: string | null;

  @Field({ nullable: true })
  finalizedAt?: string | null;
}

@ObjectType()
export class QuestionSelectionResponse {
  @Field(() => QuestionSelectionStatusEnum)
  status: QuestionSelectionStatusEnum;

  @Field(() => [QuestionSelectionEntry])
  selections: QuestionSelectionEntry[];

  @Field(() => [String])
  pendingUserIds: string[];

  @Field(() => Question, { nullable: true })
  finalQuestion?: Question | null;
}

@InputType()
export class SubmitQuestionSelectionInput {
  @Field()
  matchId: string;

  @Field()
  userId: string;

  @Field()
  questionId: string;
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

  @Mutation(() => QuestionSelectionResponse, {
    description:
      'Record a question selection for a match. When both participants submit, a random selection is chosen and emitted.',
  })
  async submitQuestionSelection(
    @Args('input') input: SubmitQuestionSelectionInput,
  ): Promise<QuestionSelectionResponse> {
    const result = await this.questionsService.submitQuestionSelection(input as SubmitSelectionInput);
    return this.mapSelectionResult(result);
  }

  @Query(() => QuestionSelectionResponse, {
    description: 'Get the current question selection status for a match.',
  })
  async questionSelectionStatus(
    @Args('matchId', { type: () => ID }) matchId: string,
  ): Promise<QuestionSelectionResponse> {
    const result = await this.questionsService.getQuestionSelectionStatus(matchId);
    return this.mapSelectionResult(result);
  }

  private mapSelectionResult(result: QuestionSelectionResult): QuestionSelectionResponse {
    return {
      status: result.status as QuestionSelectionStatusEnum,
      selections: result.selections.map((selection) => ({
        userId: selection.userId,
        questionId: selection.questionId,
        isWinner: selection.isWinner,
        submittedAt: selection.submittedAt,
        finalizedAt: selection.finalizedAt,
      })),
      pendingUserIds: result.pendingUserIds,
      finalQuestion: result.finalQuestion ?? null,
    };
  }

  @Query(() => [QuestionAttempt], {
    description: 'Get all question attempts for a specific user',
  })
  async questionAttemptsByUser(
    @Args('userId', { type: () => ID }) userId: string,
  ): Promise<QuestionAttempt[]> {
    return this.questionsService.getQuestionAttemptsByUser(userId);
  }

  @Query(() => [SuggestedSolution], {
    description: 'Get suggested solutions for a specific question',
  })
  async suggestedSolutionsForQuestion(
    @Args('questionId', { type: () => ID }) questionId: string,
  ): Promise<SuggestedSolution[]> {
    return this.questionsService.getSuggestedSolutionsForQuestion(questionId);
  }
}

@ObjectType()
export class QuestionAttempt {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  userId: string;

  @Field(() => ID)
  questionId: string;

  @Field(() => ID)
  matchId: string;

  @Field()
  attemptedAt: string;

  @Field()
  createdAt: string;

  @Field(() => Question, { nullable: true, description: 'The question details' })
  question?: Question;
}

@ObjectType()
export class SuggestedSolution {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  questionId: string;

  @Field()
  language: string;

  @Field()
  solutionCode: string;

  @Field({ nullable: true })
  explanation?: string;

  @Field({ nullable: true })
  timeComplexity?: string;

  @Field({ nullable: true })
  spaceComplexity?: string;

  @Field()
  createdAt: string;

  @Field()
  updatedAt: string;
}

