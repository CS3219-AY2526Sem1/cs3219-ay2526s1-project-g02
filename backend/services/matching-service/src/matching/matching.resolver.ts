import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { MatchingService, MatchRequest } from './matching.service';
import { MatchRequestInput, MatchResult } from './matching.dto';

@Resolver(() => MatchResult)
export class MatchingResolver {
    constructor(private readonly matchingService: MatchingService) {}

    @Mutation(() => MatchResult)
    async findMatch(
        @Args('request') requestInput: MatchRequestInput,
    ): Promise<MatchResult> {
        return this.matchingService.findMatchOrQueueUser(requestInput as MatchRequest);
    }
}
