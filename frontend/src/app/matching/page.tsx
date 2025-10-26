'use client';

import { PageHeader, PageLayout } from "@/components/layout";
import { FIND_MATCH_MUTATION } from "@/lib/graphql/matching-mutations";
import { MatchFoundData, matchingSocket, RequestExpiredData } from "@/lib/socket/socket";
import { useMutation } from "@apollo/client";
import { MatchRequestInput, MatchResultOutput } from "@noclue/common";
import { useEffect, useState } from "react";

type MatchStatus = 
    | 'IDLE'
    | 'LOADING'
    | 'QUEUED'
    | 'MATCH_FOUND'
    | 'REQUEST_EXPIRED'
    | 'CANCELLED'
    | 'ERROR';

export default function MatchingPage() {
    const [status, setStatus] = useState<MatchStatus>('IDLE');
    const [matchResult, setMatchResult] = useState<MatchResultOutput | null>(null); // from sync graphQL
    const [finalMatchData, setFinalMatchData] = useState<MatchFoundData | null>(null); // from async websocket

    const [socketStatus, setSocketStatus] = useState<'connected' | 'disconnected'>('disconnected');

    // 1. Defining the GraphQL Mutation Hook (to be used below)
    const [findMatch, { loading, error }] = useMutation(FIND_MATCH_MUTATION, {
        onCompleted(data) {
            const result: MatchResultOutput = data.findMatch;
            setMatchResult(result);
            if (result.matchFound) setStatus('MATCH_FOUND');
            else if (result.queued) setStatus('QUEUED');
        },
        onError(err) {
            setStatus('ERROR');
            console.error("Error during findMatch mutation:", err);
        }
    })

    // 2. Function to execute the mutation
    const initiateMatch = (input: MatchRequestInput) => {
        if (loading) return; // Prevent multiple requests

        setStatus('LOADING');
        setMatchResult(null);

        findMatch({ variables: { input } });
    };

    // 3. Upon 'Find Match' button press
    // TODO: Connect to button
    const handleStartMatch = () => {
        // TODO: Replace with form data
        const dummyInput: MatchRequestInput = {
            userId: 'testUser1', // Should come from a global user context or session
            language: 'Python',
            topics: ['Algorithms', 'Data Structures'],
            difficulty: 'medium',
        };

        initiateMatch(dummyInput);
    }

    // 4. Socket.IO connection and Listener Hook
    useEffect(() => {
        const onConnect = () => setSocketStatus('connected');
        const onDisconnect = () => setSocketStatus('disconnected');

        // Event Listener for 'matchFound' (i.e. match found after being queued)
        const handleMatchFoundEvent = (data: MatchFoundData) => {
            if (status === 'QUEUED' && matchResult) {
                console.log('Match found!', data);
                setFinalMatchData(data);
                setStatus('MATCH_FOUND');
                // TODO: Notify user via UI
            }
        };

        // Event Listener for 'requestExpired' (i.e. match request expired)
        const handleRequestExpiredEvent = (data: RequestExpiredData) => {
            if (status === 'QUEUED') {
                console.log('Match request expired:', data);
                setStatus('REQUEST_EXPIRED');
                // TODO: Notify user via UI      
            }
        };
        matchingSocket.on('connect', onConnect);
        matchingSocket.on('disconnect', onDisconnect);
        matchingSocket.on('matchFound', handleMatchFoundEvent);
        matchingSocket.on('requestExpired', handleRequestExpiredEvent);

        if (status === 'QUEUED' && !matchingSocket.connected) {
            matchingSocket.connect();
        } else if (status !== 'QUEUED' && matchingSocket.connected) {
            matchingSocket.disconnect();
        }

        // Cleanup 
        return () => {
            matchingSocket.off('connect', onConnect);
            matchingSocket.off('disconnect', onDisconnect);
            matchingSocket.off('matchFound', handleMatchFoundEvent);
            matchingSocket.off('requestExpired', handleRequestExpiredEvent);
            if (matchingSocket.connected) matchingSocket.disconnect();
        }

    }, [status, matchResult]);



    return (
        <PageLayout 
            header={<PageHeader title="No Clue" />}>
            <div>
                <h1>This is the matching svc.</h1>
            </div>
        </PageLayout>
    )
}