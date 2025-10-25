import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { MatchingService, MatchRequest } from './matching.service';
import { CancellationResultOutput, CancelMatchRequestInput, MatchRequestInput, MatchResultOutput } from './matching.dto';

/* This resolver is to resolve GraphQL requests from the client, NOT WebSocket (see matching.gateway.ts for that) */
@Resolver(() => MatchResultOutput)
export class MatchingResolver {
    constructor(private readonly matchingService: MatchingService) {}

    // Client requests a match
    @Mutation(() => MatchResultOutput)
    async findMatch(
        @Args('request') requestInput: MatchRequestInput,
    ): Promise<MatchResultOutput> {
        return this.matchingService.findMatchOrQueueUser(requestInput as MatchRequest);
    }

    // Client cancels an ongiong match request
    @Mutation(() => CancellationResultOutput)
    async cancelMatchRequest(
        @Args('request') cancelInput: CancelMatchRequestInput,
    ): Promise<CancellationResultOutput> {
        return this.matchingService.cancelMatchRequest(cancelInput.requestId);
    }
}
