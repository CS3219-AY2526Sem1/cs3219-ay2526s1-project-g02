'use client';

import { PageHeader, PageLayout } from "@/components/layout";

type MatchStatus = 
    | 'IDLE'
    | 'LOADING'
    | 'QUEUED'
    | 'MATCH_FOUND_IMMEDIATELY'
    | 'REQUEST_EXPIRED'
    | 'CANCELLED'
    | 'MATCH_FOUND_WHEN_IN_QUEUE'
    | 'ERROR';


    
export default function MatchingPage() {
    return (
        <PageLayout 
            header={<PageHeader title="No Clue" />}>
            <div>
                <h1>This is the matching svc.</h1>
            </div>
        </PageLayout>
    )
}