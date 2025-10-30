import { Args, Mutation, Resolver, Query } from '@nestjs/graphql';
import { MatchingService } from './matching.service';
import { CancellationResultOutput, CancelMatchRequestInput, MatchRequestInput, MatchResultOutput } from './matching.dto';
import { MatchRequest } from 'src/utils/types';

/* This resolver is to resolve GraphQL requests from the client, NOT WebSocket (see matching.gateway.ts for that) */
@Resolver()
export class MatchingResolver {
    constructor(private readonly matchingService: MatchingService) {}

    @Query(() => String)
    healthCheck(): string {
        return 'Matching Service is healthy';
    }

    // Client requests a match
    @Mutation(() => MatchResultOutput)
    async findMatch(
        @Args('request') requestInput: MatchRequestInput,
    ): Promise<MatchResultOutput> {
        return this.matchingService.findMatchOrQueueUser(requestInput as MatchRequest);
    }

    // Client cancels an ongoing match request
    @Mutation(() => CancellationResultOutput)
    async cancelMatchRequest(
        @Args('request') cancelInput: CancelMatchRequestInput,
    ): Promise<CancellationResultOutput> {
        return this.matchingService.cancelMatchRequest(cancelInput.requestId);
    }
}
