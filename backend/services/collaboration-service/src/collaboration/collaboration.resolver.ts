import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { CollaborationService } from './collaboration.service';

@Resolver('Session')
export class CollaborationResolver {
  constructor(private readonly collaborationService: CollaborationService) {}

  @Query(() => String)
  async session(@Args('id') id: string) {
    return this.collaborationService.getSession(id);
  }

  @Mutation(() => String)
  async createSession(@Args('matchId') matchId: string) {
    return this.collaborationService.createSession(matchId);
  }

  @Mutation(() => Boolean)
  async endSession(@Args('sessionId') sessionId: string) {
    return this.collaborationService.endSession(sessionId);
  }
}
