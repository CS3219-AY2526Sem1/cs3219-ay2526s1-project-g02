import { MatchStatus } from "@/constants/types";
import { MatchFoundData } from "@/lib/socket/socket";
import { MatchResultOutput } from "@noclue/common";
import { useRouter } from "next/navigation";
import { Button, Loading } from "./ui";

interface MatchingActionButtonProps {
    status: MatchStatus;
    loading: boolean;
    canceling: boolean;
    isReadyState: boolean;
    buttonDisabledForStart: boolean;
    matchResult: MatchResultOutput | null;
    finalMatchData: MatchFoundData | null;
    matchedUsername: string | null;
    handleStartMatch: () => void;
    handleCancelMatch: () => void;
}

export default function MatchingActionButton({
    status, loading, canceling,
    isReadyState, buttonDisabledForStart,
    matchResult, finalMatchData, matchedUsername,
    handleStartMatch, handleCancelMatch,
}: MatchingActionButtonProps) {
    const router = useRouter();

    const goToSession = () => {
        const matchId = finalMatchData?.matchId;
        if (matchId) {
            router.push(`/question-selection?matchId=${matchId}`);
        } 
    };

    if (isReadyState) {
        return (
            <Button
                onClick={handleStartMatch}
                variant="primary"
                disabled={buttonDisabledForStart}
                className="w-full transition-all duration-200 text-lg shadow-xl"
            >
                {loading ? "Submitting Request..." : "Find a Match"}
            </Button>
        );
    }

    if (status === "QUEUED") {
        return (
            <div className="flex flex-col items-center justify-between space-y-4 p-4 bg-indigo-50 border border-indigo-300 rounded-lg shadow-md">
                <span className="text-indigo-700 font-semibold flex items-center">
                    <Loading message="Looking for a partner..." />
                </span>
                <Button
                    onClick={handleCancelMatch}
                    variant="danger"
                    disabled={canceling}
                >
                    {canceling ? "Cancelling..." : "Cancel Search"}
                </Button>
            </div>
        );
    }

    if (status === "MATCH_FOUND") {
        const matchedUserId = finalMatchData?.matchedUserId || matchResult?.matchedUserId || "a partner";
        const isSessionReady = !!finalMatchData?.matchId;
        
        return (
            <div className="flex flex-col items-center justify-between space-y-4 p-4 bg-green-50 border border-green-300 rounded-lg shadow-md">
                <span className="text-green-700 font-semibold mb-2">
                    Success! Matched with {`${matchedUsername} (${matchedUserId.substring(0, 8)}...)`}
                </span>
                <Button
                    onClick={goToSession}
                    variant="primary"
                    disabled={!isSessionReady}
                >
                    {isSessionReady ? "Go to Session" : "Preparing session..."}
                </Button>
            </div>
        );
    }

    if (status === "LOADING") {
        return (
            <div className="flex items-center justify-center p-4">
                <Loading message="Sending Request..." />
            </div>
        );
    }

    return null;
}