import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { CollaborationService } from './collaboration.service';
import { SessionType } from './session.type';
import { Logger, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

@Resolver(() => SessionType)
export class CollaborationResolver {
  private readonly logger = new Logger(CollaborationResolver.name);

  constructor(private readonly collaborationService: CollaborationService) {}

  @Query(() => SessionType)
  async session(@Args('id') id: string) {
    return this.collaborationService.getSession(id);
  }

  @Query(() => SessionType, { nullable: true })
  async sessionWithDetails(
    @Args('sessionId') sessionId: string,
    @Args('userId', { nullable: true }) userId?: string,
  ) {
    const session = await this.collaborationService.getSessionWithDetails(sessionId);
    
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // If userId is provided, validate that user is part of the session
    if (userId) {
      const isPartOfSession = await this.collaborationService.isUserPartOfSession(sessionId, userId);
      if (!isPartOfSession) {
        throw new ForbiddenException('User is not part of this session');
      }
    }

    return session;
  }

  @Query(() => Boolean)
  async isUserPartOfSession(
    @Args('sessionId') sessionId: string,
    @Args('userId') userId: string,
  ) {
    return this.collaborationService.isUserPartOfSession(sessionId, userId);
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
