import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { CollaborationService } from './collaboration.service';
import { SessionType } from './session.type';

@Resolver(() => SessionType)
export class CollaborationResolver {
  constructor(private readonly collaborationService: CollaborationService) {}

  @Query(() => SessionType)
  async session(@Args('id') id: string) {
    return this.collaborationService.getSession(id);
  }

  @Mutation(() => SessionType)
  async createSession(@Args('matchId') matchId: string) {
    return this.collaborationService.createSession(matchId);
  }

  @Mutation(() => SessionType)
  async endSession(@Args('sessionId') sessionId: string) {
    return this.collaborationService.endSession(sessionId);
  }
}
