import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { QuestionsService, CreateQuestionInput, UpdateQuestionInput } from './questions.service';

@Resolver('Question')
export class QuestionsResolver {
  constructor(private readonly questionsService: QuestionsService) {}

  @Query(() => [String])
  async questions() {
    return this.questionsService.findAll();
  }

  @Query(() => String)
  async question(@Args({ name: 'id', type: () => String }) id: string) {
    return this.questionsService.findOne(id);
  }

  @Query(() => [String])
  async questionsByDifficulty(@Args({ name: 'difficulty', type: () => String }) difficulty: string) {
    return this.questionsService.findByDifficulty(difficulty);
  }

  @Query(() => [String])
  async questionsByCategory(@Args({ name: 'category', type: () => String }) category: string) {
    return this.questionsService.findByCategory(category);
  }

  @Mutation(() => String)
  async createQuestion(@Args('input') input: CreateQuestionInput) {
    return this.questionsService.create(input);
  }

  @Mutation(() => String)
  async updateQuestion(
    @Args({ name: 'id', type: () => String }) id: string,
    @Args('input') input: UpdateQuestionInput,
  ) {
    return this.questionsService.update(id, input);
  }

  @Mutation(() => Boolean)
  async deleteQuestion(@Args({ name: 'id', type: () => String }) id: string) {
    return this.questionsService.delete(id);
  }
}
