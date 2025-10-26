'use client';

import { PageHeader, PageLayout } from "@/components/layout";
import { Button } from "@/components/ui";
import { CANCEL_MATCH_MUTATION, FIND_MATCH_MUTATION } from "@/lib/graphql/matching-mutations";
import { MatchFoundData, matchingSocket, RequestExpiredData } from "@/lib/socket/socket";
import { useMutation } from "@apollo/client";
import { CancelMatchRequestInput, MatchRequestInput, MatchResultOutput } from "@noclue/common";
import { useEffect, useState } from "react";

const LANGUAGES = ['JavaScript', 'Python', 'Java', 'C++', 'Go', 'Rust'];
const TOPICS = ['Algorithms', 'Data Structures', 'Graphs and Trees', 'Networking', 'Concurrency', 'Databases'];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

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
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Form State
    const [formLanguage, setFormLanguage] = useState<string>(LANGUAGES[0]);
    const [formTopics, setFormTopics] = useState<string[]>([]);
    const [formDifficulty, setFormDifficulty] = useState<string>(DIFFICULTIES[0]);
    const showForm = status === 'IDLE' || status === 'REQUEST_EXPIRED' || status === 'CANCELLED' || status === 'ERROR';
    
    // 1a. Defining the GraphQL Mutation for findMatch (to be used below)
    const [findMatch, { loading, error }] = useMutation(FIND_MATCH_MUTATION, {
        onCompleted(data) {
            const result: MatchResultOutput = data.findMatch;
            setMatchResult(result);
            if (result.matchFound) {
                console.log('Match found immediately:', result);
                setStatus('MATCH_FOUND')
                // TODO: Notify user via UI
            } else if (result.queued) {
                console.log('No immediate match, queued for matching:', result);
                setStatus('QUEUED');
                setNotification({ message: 'You have been queued for matching.', type: 'success' });
            }
        },
        onError(err) {
            console.error("Error during findMatch mutation:", err);
            setStatus('ERROR');
            setNotification({ message: 'Failed to start match search. Please try again.', type: 'error' });
        }
    })

    // 1b. Defining the GraphQL Mutation for cancelMatchRequest (to be used below)
    const [cancelMatch, { loading: canceling, error: cancelError }] = useMutation(CANCEL_MATCH_MUTATION, {
        onCompleted(data) {
            const result = data.cancelMatchRequest;
            if (result.success) {
                console.log('Match request cancelled successfully');
                setStatus('CANCELLED');
                setNotification({ message: 'Match request cancelled successfully.', type: 'success' });
                setMatchResult(null);
            } else {
                console.error('Failed to cancel match request:', result.message);
                setNotification({ message: `Failed to cancel match request.`, type: 'error' });
            }
        },
        onError(err) {
            console.error("Error during cancelMatchRequest mutation:", err);
        }
    })

    // 2a. Function to execute the findMatch mutation
    const initiateMatch = (input: MatchRequestInput) => {
        if (loading) return; // Prevent multiple requests

        setStatus('LOADING');
        setMatchResult(null);

        findMatch({ variables: { input } });
    };

    // 2b. Function to execute the cancelMatchRequest mutation
    const cancelMatchRequest = (input: CancelMatchRequestInput) => {
        if (canceling) return; // Prevent multiple requests
        cancelMatch({ variables: { input } });
    }

    // 3a. Upon 'Find Match' button press
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

    // 3b. Upon 'Cancel Match' button press
    // TODO: Connect to button
    const handleCancelMatch = () => { 
        const requestId = matchResult?.requestId;
        if (status !== 'QUEUED' || !requestId) {
            console.warn("No active match request to cancel.");
            return;
        }
        cancelMatchRequest({ requestId });
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
                setNotification({ message: 'Your match request has expired. Please try again.', type: 'error' });
                setMatchResult(null);
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

    // Helper for topic selection (multi-select)
    const toggleTopic = (topic: string) => {
        setFormTopics(prev => 
            prev.includes(topic)
                ? prev.filter(t => t !== topic)
                : [...prev, topic]
        );
    };

    // Helper to get status box classes
    const getStatusTextColor = (currentStatus: MatchStatus) => {
        switch (currentStatus) {
            case 'IDLE':
                return 'text-gray-500';
            case 'LOADING':
            case 'QUEUED':
                return 'text-indigo-600 animate-pulse'; // Uses Indigo for active state
            case 'MATCH_FOUND':
                return 'text-green-600'; // Success
            case 'REQUEST_EXPIRED':
            case 'CANCELLED':
                return 'text-yellow-700'; // Warning/Neutral completion
            case 'ERROR':
                return 'text-red-600'; // Failure
            default:
                return 'text-gray-500';
        }
    }

    // Helper function to dismiss the notification
    const dismissNotification = () => {
        setNotification(null);
        // If you had a status like 'ERROR' that needed to reset back to 'IDLE',
        // you would place that logic here, too:
        // if (status === 'ERROR' || status === 'REQUEST_EXPIRED') {
        //     setStatus('IDLE');
        // }
    };

    return (
        <PageLayout header={<PageHeader title="No Clue" />}>
            <div className="bg-gray-100 w-3/4 mx-auto rounded-xl p-8 shadow-xl">

                {notification && (
                    <div 
                        // Use flex to align message and button
                        className={`p-3 mb-6 rounded-lg text-sm font-medium flex items-center justify-between
                            ${notification.type === 'error' 
                                ? 'bg-red-500 text-white' 
                                : 'bg-green-500 text-white'}`
                        }
                    >
                        {/* Message Content */}
                        <span>{notification.message}</span>
                        
                        {/* Close Button (The "Cross") */}
                        <button
                            onClick={dismissNotification}
                            className="ml-4 p-1 rounded-full hover:bg-white hover:bg-opacity-20 transition-colors duration-150"
                            aria-label="Close notification"
                        >
                            {/* Simple 'X' character or a relevant icon */}
                            <span className="font-bold text-lg leading-none">&times;</span> 
                        </button>
                    </div>
                )}

                {/* 1. Choose Language */}
                <div className="mb-6">
                    <label className="block text-lg font-medium text-gray-800 mb-1">
                        1. Select Programming Language
                    </label>
                    <select
                        id="language-select"
                        value={formLanguage} 
                        onChange={(e) => setFormLanguage(e.target.value)}
                        className="w-full appearance-none border border-gray-300 bg-white rounded-lg py-3 px-4 shadow-md 
                                    transition duration-150 ease-in-out focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none 
                                    text-gray-800 cursor-pointer">
                        {LANGUAGES.map(lang => (
                            <option key={lang} value={lang}>{lang}</option>
                        ))}
                    </select>
                </div>

                {/* 2. Choose Topics */}
                <div className="mb-6">
                    <label className="block text-lg font-medium text-gray-800 mb-2">
                        2. Topics (Select one or more)
                    </label>
                    <div className="flex flex-wrap gap-2 p-3 bg-white border border-gray-300 rounded-lg shadow-sm">
                        {TOPICS.map(topic => (
                            <button
                                key={topic}
                                onClick={() => toggleTopic(topic)}
                                type="button"
                                className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-200 
                                    ${formTopics.includes(topic) 
                                        ? 'bg-indigo-600 text-white shadow-md' 
                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'}`
                                }
                            >
                                {topic}
                            </button>
                        ))}
                    </div>
                    {formTopics.length === 0 && (
                        <p className="text-sm text-red-500 mt-2">Please select at least one topic.</p>
                    )}
                </div>

                {/* 3. Choose Difficulty Level */}
                <div className="mb-6">
                    <label className="block text-lg font-medium text-gray-800 mb-2">
                        3. Select Difficulty Level
                    </label>
                    <div className="flex space-x-3 p-3 bg-white border border-gray-300 rounded-lg shadow-sm">
                        {DIFFICULTIES.map(diff => (
                            <button
                                key={diff}
                                onClick={() => setFormDifficulty(diff)}
                                type="button"
                                className={`flex-1 py-3 text-base font-semibold rounded-lg transition-all duration-200 border-2
                                    ${diff === formDifficulty
                                        // Selected Style
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                                        // Default Style with new hover effect
                                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100' 
                                    }`
                                }
                            >
                                {diff}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 4. Action Button */}
                <div className="mb-6">
                    <Button 
                        onClick={handleStartMatch}
                        variant="primary" 
                        disabled={formTopics.length === 0 || !showForm}>
                        Find Match
                    </Button>
                </div>

                {/* 5. Socket Status */}
                <div className="mt-8 pt-4 border-t border-gray-300 text-xs flex justify-between items-center">
                
                    {/* Primary Match Status (Bottom-Left) */}
                    <div className="font-medium text-gray-600">
                        Match Status: 
                        <span className={`ml-1 font-semibold ${getStatusTextColor(status)}`}>
                            {status}
                        </span>
                    </div>

                    {/* Technical Connection Status (Bottom-Right) */}
                    <div className="text-right text-gray-500">
                        Connection: 
                        <span className={`font-semibold ml-1 ${socketStatus === 'connected' ? 'text-green-600' : 'text-red-600'}`}>
                            {socketStatus.toUpperCase()}
                        </span>
                        {matchResult?.requestId && <span className="ml-4">Req ID: {matchResult.requestId}</span>}
                    </div>

                </div>

            </div>
        </PageLayout>
    )
}