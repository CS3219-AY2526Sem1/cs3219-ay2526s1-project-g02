import { DIFFICULTIES, PROGRAMMING_LANGUAGES } from "@/constants/constants";
import { MatchStatus } from "@/constants/types";
import { matchingClient } from "@/lib/apollo-client";
import { CANCEL_MATCH_MUTATION, FIND_MATCH_MUTATION } from "@/lib/graphql/matching-mutations";
import { MatchFoundData, matchingSocket, RequestExpiredData } from "@/lib/socket/socket";
import { useMutation } from "@apollo/client";
import { MatchRequestInput, MatchResultOutput } from "@noclue/common";
import { useEffect, useMemo, useState } from "react";

type Notification = {
    message: string;
    status: MatchStatus;
}

export function useMatchingLogic(session: any) {
    // Auth
    const ACTIVE_USER_ID = session?.user?.id || null;

    // State Variables   
    const [status, setStatus] = useState<MatchStatus>("IDLE");
    const [matchResult, setMatchResult] = useState<MatchResultOutput | null>(null); // sync
    const [finalMatchData, setFinalMatchData] = useState<MatchFoundData | null>(null); // async
    const [formLanguage, setFormLanguage] = useState<string>(PROGRAMMING_LANGUAGES[0]);
    const [formTopics, setFormTopics] = useState<string[]>([]);
    const [formDifficulty, setFormDifficulty] = useState<string>(DIFFICULTIES[0]);
    const [socketStatus, setSocketStatus] = useState<"connected" | "disconnected">("disconnected");
    const [notification, setNotification] = useState<Notification | null>(null);

    // 1a. GraphQL Mutation for findMatch
    const [findMatch, { loading, error }] = useMutation(FIND_MATCH_MUTATION, {
        client: matchingClient,
        onCompleted(data) {
            const result: MatchResultOutput = data.findMatch;
            setMatchResult(result);
            if (!result.matchFound && !result.queued && result.reason === "User already in active match") {
                setStatus("ERROR");
                setNotification({
                    message: "You are already in an active match.",
                    status: "ERROR",
                });
                return;
            }

            if (result.matchFound) {
                setStatus("MATCH_FOUND");
                setNotification({
                    message: "Match found successfully!",
                    status: "MATCH_FOUND",
            });
            // TODO: Show matchedUserId somewhere in the UI
            } else if (result.queued) {
                setStatus("QUEUED");
            }
        },
        onError(err) {
            console.error("Error during findMatch mutation:", err);
            setStatus("ERROR");
            setNotification({
            message: "Failed to start match search. Please try again.",
            status: "ERROR",
            });
        },
    });
    
    // 1b. GraphQL Mutation for cancelMatchRequest (to be used below)
    const [cancelMatch, { loading: canceling, error: cancelError }] = useMutation(CANCEL_MATCH_MUTATION, {
        client: matchingClient,
        onCompleted(data) {
            const result = data.cancelMatchRequest;
            if (result.success) {
                setStatus("CANCELLED");
                setNotification({
                    message: "Match request cancelled successfully.",
                    status: "CANCELLED",
                });
                setMatchResult(null);
            } else {
                console.error("Failed to cancel match request:", result.message);
                setNotification({
                    message: `Failed to cancel match request.`,
                    status: "ERROR",
                });
            }
        },
        onError(err) {
        console.error("Error during cancelMatchRequest mutation:", err);
        },
    });
    
    // 2a. Upon 'Find Match' button press
    const handleStartMatch = () => {
        if (loading) return;
        setStatus("LOADING");
        setMatchResult(null);
        setNotification(null);

        const input: MatchRequestInput = {
            userId: ACTIVE_USER_ID,
            language: formLanguage,
            topics: formTopics,
            difficulty: formDifficulty.toLowerCase() as "easy" | "medium" | "hard",
        };
        findMatch({ variables: { input } });
    };
    
    // 2b. Upon 'Cancel Match' button press
    const handleCancelMatch = () => {
        const requestId = matchResult?.requestId;
        if (status !== "QUEUED" || !requestId) {
            return;
        }
        if (canceling) return; // Prevent multiple requests
        cancelMatch({ variables: { input: { requestId } } });
    };
    
    // 3. Initial Socket.IO Connection
    useEffect(() => {
        if (!ACTIVE_USER_ID) {
            if (matchingSocket.connected) matchingSocket.disconnect();
            setSocketStatus("disconnected");
            console.log("Socket: Disconnected due to missing User ID.");
            return;
        }

        matchingSocket.auth = { userId: ACTIVE_USER_ID };

        if (!matchingSocket.connected) {
            matchingSocket.connect();
        }

        const onConnect = () => setSocketStatus("connected");
        const onDisconnect = () => setSocketStatus("disconnected");

        matchingSocket.on("connect", onConnect);
        matchingSocket.on("disconnect", onDisconnect);

        return () => {
            matchingSocket.off("connect", onConnect);
            matchingSocket.off("disconnect", onDisconnect);
        };
    }, [ACTIVE_USER_ID]);

    // 4. Socket.IO Listeners
    useEffect(() => {
        // Event Listener for 'matchFound' (i.e. match found after being queued)
        const handleMatchFoundEvent = (data: MatchFoundData) => {
            setFinalMatchData(data);

            if (status !== "MATCH_FOUND") {
                setStatus("MATCH_FOUND");
            }

            setNotification({
                message: "Match found successfully!",
                status: "MATCH_FOUND",
            });
        };

        // Event Listener for 'requestExpired' (i.e. match request expired)
        const handleRequestExpiredEvent = (data: RequestExpiredData) => {
            if (status === "QUEUED") {
                setStatus("REQUEST_EXPIRED");
                setMatchResult(null);
                setNotification({
                    message: "Your match request has expired. Please try again.",
                    status: "REQUEST_EXPIRED",
                });
            }
        };

        matchingSocket.on("matchFound", handleMatchFoundEvent);
        matchingSocket.on("requestExpired", handleRequestExpiredEvent);

        // Cleanup
        return () => {
            matchingSocket.off("matchFound", handleMatchFoundEvent);
            matchingSocket.off("requestExpired", handleRequestExpiredEvent);
        };
    }, [status, matchResult]);

    // 5a. Helper for language selection
    const handleSetFormLanguage = (value: string) => {
        if (!isFormDisabled) setFormLanguage(value);
    };

    // 5b. Helper for topics selection
    const handleSetFormTopics = (value: string[]) => {
        if (!isFormDisabled) setFormTopics(value);
    };

    // 5c. Helper for difficulty selection
    const handleSetFormDifficulty = (value: string) => {
        if (!isFormDisabled) setFormDifficulty(value);
    };

    // 6. UI State
    const isFormDisabled = useMemo(() => status === "LOADING" || status === "QUEUED" || status === "MATCH_FOUND", [status]);
    const isReadyState = useMemo(() => status === "IDLE" || status === "REQUEST_EXPIRED" || status === "CANCELLED" || status === "ERROR", [status]);
    const buttonDisabledForStart = useMemo(() => formTopics.length === 0 || loading || canceling, [formTopics.length, loading, canceling]);
    
    return {
        // state
        status, loading, canceling, notification, matchResult, finalMatchData, socketStatus,
        // form state
        formLanguage, formTopics, formDifficulty,
        // handlers
        handleSetFormLanguage, handleSetFormTopics, handleSetFormDifficulty,
        handleStartMatch, handleCancelMatch, setNotification, setStatus,
        // derived ui state
        isFormDisabled, isReadyState, buttonDisabledForStart,
    }
}