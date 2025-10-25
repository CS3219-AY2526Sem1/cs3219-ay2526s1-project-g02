import { Field, InputType, ObjectType } from "@nestjs/graphql";

@InputType()
export class MatchRequestInput {
    @Field()
    userId: string;

    @Field()
    language: string;

    @Field(() => [String])
    topics: string[];

    @Field()
    difficulty: string;
}

@ObjectType()
export class MatchResult {
    @Field()
    matchFound: boolean;

    @Field({ nullable: true })
    matchedUserId?: string;

    @Field()
    queued: boolean;

    @Field({ nullable: true })
    queueKey?: string;

    @Field({ nullable: true })
    requestId?: string;

    @Field({ nullable: true })
    reason?: string;
}

@InputType()
export class CancelMatchRequestInput {
    @Field()
    requestId: string;
}

@ObjectType()
export class CancellationResult {
    @Field()
    success: boolean;

    @Field({ nullable: true })
    reason?: string;
}