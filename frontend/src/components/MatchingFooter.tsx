import { MatchStatus } from "@/constants/types";
import { MatchResultOutput } from "@noclue/common";

interface MatchingFooterProps {
    status: MatchStatus;
    socketStatus: "connected" | "disconnected";
    matchResult: MatchResultOutput | null;
}

// Helper to get status box classes
const getStatusTextColor = (currentStatus: MatchStatus) => {
    switch (currentStatus) {
    case "IDLE":
        return "text-gray-500";
    case "LOADING":
    case "QUEUED":
        return "text-indigo-600 animate-pulse"; // Uses Indigo for active state
    case "MATCH_FOUND":
        return "text-green-600"; // Success
    case "REQUEST_EXPIRED":
    case "CANCELLED":
        return "text-yellow-700"; // Warning/Neutral completion
    case "ERROR":
        return "text-red-600"; // Failure
    default:
        return "text-gray-500";
    }
};

export default function MatchingFooter({ status, socketStatus, matchResult }: MatchingFooterProps) {
    return (
        <div className="mt-8 pt-4 border-t border-gray-300 text-xs flex justify-between items-center">
            {/* Primary Match Status (Bottom-Left) */}
            <div className="font-medium text-gray-600">
                Match Status:
                <span className={`ml-1 font-extrabold ${getStatusTextColor(status)}`}>
                    {status}
                </span>
            </div>

            {/* Technical Connection Status (Bottom-Right) */}
            <div className="text-right font-medium text-gray-500">
                Connection:
                <span className={`ml-1 font-extrabold ${socketStatus === "connected" ? "text-green-600" : "text-red-600"}`}>
                    {socketStatus.toUpperCase()}
                </span>
                {matchResult?.requestId && (
                    <span className="ml-4">Req ID: {matchResult.requestId}</span>
                )}
            </div>
        </div>
    );
} 