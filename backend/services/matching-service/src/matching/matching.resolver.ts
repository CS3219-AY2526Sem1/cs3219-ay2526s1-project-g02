import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { MatchingService, MatchRequest } from './matching.service';
import { CancellationResult, CancelMatchRequestInput, MatchRequestInput, MatchResult } from './matching.dto';

/* This resolver is to resolve GraphQL requests from the client, NOT WebSocket (see matching.gateway.ts for that) */
@Resolver(() => MatchResult)
export class MatchingResolver {
    constructor(private readonly matchingService: MatchingService) {}

    // Client requests a match
    @Mutation(() => MatchResult)
    async findMatch(
        @Args('request') requestInput: MatchRequestInput,
    ): Promise<MatchResult> {
        return this.matchingService.findMatchOrQueueUser(requestInput as MatchRequest);
    }

    // Client cancels an ongiong match request
    @Mutation(() => CancellationResult)
    async cancelMatchRequest(
        @Args('request') cancelInput: CancelMatchRequestInput,
    ): Promise<CancellationResult> {
        return this.matchingService.cancelMatchRequest(cancelInput.requestId);
    }
}
