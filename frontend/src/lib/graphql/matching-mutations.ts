import { gql } from "@apollo/client";

export const FIND_MATCH_MUTATION = gql`
    mutation FindMatch($input: MatchRequestInput!) {
        findMatch(request: $input) {
            matchFound
            matchedUserId
            queued
            queueKey
            requestId
            reason
        }
    }
`;

export const CANCEL_MATCH_MUTATION = gql`
    mutation CancelMatch($input: CancelMatchRequestInput!) {
        cancelMatchRequest(request: $input) {
            success
            reason
        }
    }
`;