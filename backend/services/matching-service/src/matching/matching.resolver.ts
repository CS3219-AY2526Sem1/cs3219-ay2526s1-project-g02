import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { MatchingService } from './matching.service';

@Resolver('Match')
export class MatchingResolver {
  constructor(private readonly matchingService: MatchingService) {}

  @Query(() => [String])
  async matchHistory(@Args({ name: 'userId', type: () => String }) userId: string) {
    return this.matchingService.getMatchHistory(userId);
  }

  @Mutation(() => String)
  async requestMatch(
    @Args({ name: 'userId', type: () => String }) userId: string,
    @Args({ name: 'preferences', type: () => Object }) preferences: any
  ) {
    return this.matchingService.createMatchRequest(userId, preferences);
  }
}
