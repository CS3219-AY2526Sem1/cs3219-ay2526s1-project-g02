import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { QuestionsService, CreateQuestionInput, UpdateQuestionInput } from './questions.service';

@Resolver('Question')
export class QuestionsResolver {
  constructor(private readonly questionsService: QuestionsService) {}

  @Query()
  async questions() {
    return this.questionsService.findAll();
  }

  @Query()
  async question(@Args('id') id: string) {
    return this.questionsService.findOne(id);
  }

  @Query()
  async questionsByDifficulty(@Args('difficulty') difficulty: string) {
    return this.questionsService.findByDifficulty(difficulty);
  }

  @Query()
  async questionsByCategory(@Args('category') category: string) {
    return this.questionsService.findByCategory(category);
  }

  @Mutation()
  async createQuestion(@Args('input') input: CreateQuestionInput) {
    return this.questionsService.create(input);
  }

  @Mutation()
  async updateQuestion(
    @Args('id') id: string,
    @Args('input') input: UpdateQuestionInput,
  ) {
    return this.questionsService.update(id, input);
  }

  @Mutation()
  async deleteQuestion(@Args('id') id: string) {
    return this.questionsService.delete(id);
  }
}
