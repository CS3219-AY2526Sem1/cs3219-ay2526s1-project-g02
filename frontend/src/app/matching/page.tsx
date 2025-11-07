"use client";

import { PageLayout } from "@/components/layout";
import NavBar from "@/components/NavBar";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button, Loading } from "@/components/ui";
import { DIFFICULTIES, PROGRAMMING_LANGUAGES, PROGRAMMING_TOPICS } from "@/constants/constants";
import { MatchStatus } from "@/constants/types";
import { useMatchingLogic } from "@/hooks/useMatchingLogic";
import { useRouter } from "next/navigation";

export default function MatchingPage() {
    const router = useRouter();
    const { session, loading: authLoading } = useAuth();

    const {
        // state
        status, loading, canceling, notification, matchResult, finalMatchData, socketStatus,
        // form state
        formLanguage, formTopics, formDifficulty,
        // handlers
        handleSetFormLanguage, handleSetFormTopics, handleSetFormDifficulty,
        handleStartMatch, handleCancelMatch, setNotification, setStatus,
        // derived ui state
        isFormDisabled, isReadyState, buttonDisabledForStart,
    } = useMatchingLogic(session);

    if (authLoading) {
        return (
        <PageLayout header={<NavBar></NavBar>}>
            <div className="flex justify-center items-center h-full pt-20">
            <Loading message="Loading user session..." />
            </div>
        </PageLayout>
        );
    }

    if (!session) {
        router.push("/login");
        return null;
    }

    const dismissNotification = () => {
        setNotification(null);
        if (
            status === "REQUEST_EXPIRED" ||
            status === "CANCELLED" ||
            status === "ERROR"
        ) {
            setStatus("IDLE"); // Requires setStatus from the hook
        }
    };

    const toggleTopic = (topic: string) => {
        const newTopics = formTopics.includes(topic)
            ? formTopics.filter((t) => t !== topic)
            : [...formTopics, topic];
        handleSetFormTopics(newTopics); 
    };

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

    // Helper to get notification banner classes
    const getNotificationColorClasses = (currentStatus: MatchStatus) => {
        switch (currentStatus) {
        case "MATCH_FOUND":
            return "bg-green-600 text-white";
        case "REQUEST_EXPIRED":
        case "CANCELLED":
            return "bg-amber-600 text-white";
        case "ERROR":
            return "bg-red-600 text-white";
        case "QUEUED": // Active/In Progress
            return "bg-indigo-600 text-white";
        default:
            return "bg-gray-600 text-white";
        }
    };

    return (
        <PageLayout header={<NavBar></NavBar>}>
            <div className="bg-gray-100 w-full mx-auto rounded-xl p-8 shadow-xl">
                {/* Notification Banner with Dismiss Button */}
                {notification && (
                    <div
                        className={`p-3 mb-6 rounded-lg text-sm font-medium flex items-center justify-between ${getNotificationColorClasses(notification.status)}`}
                    >
                        {/* Message Content */}
                        <span>{notification.message}</span>

                        {/* Close Button */}
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

                {/* Matching Form */}
                <fieldset
                disabled={isFormDisabled}
                className={isFormDisabled ? "opacity-60 transition-opacity" : ""}
                >
                {/* Programming Language selection */}
                <div className="mb-6">
                    <label className="block text-lg font-medium text-gray-800 mb-1">
                    1. Select Programming Language
                    </label>
                    <select
                    id="language-select"
                    value={formLanguage}
                    onChange={(e) => handleSetFormLanguage(e.target.value)}
                    className={`w-full appearance-none border border-gray-300 bg-white rounded-xl py-3 px-4 shadow-md 
                                                transition duration-150 ease-in-out focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none 
                                                text-gray-800 cursor-pointer
                                                ${
                                                isFormDisabled
                                                    ? "bg-gray-200 cursor-not-allowed"
                                                    : ""
                                                }`}
                    >
                    {PROGRAMMING_LANGUAGES.map((lang) => (
                        <option key={lang} value={lang}>
                            {lang}
                        </option>
                    ))}
                    </select>
                </div>

                {/* 2. Topics selection */}
                <div className="mb-6">
                    <label className="block text-lg font-medium text-gray-800 mb-2">
                    2. Topics (Select one or more)
                    </label>
                    <div className="flex flex-wrap gap-2 p-3 bg-white border border-gray-300 rounded-xl shadow-sm">
                        {PROGRAMMING_TOPICS.map((topic) => (
                            <button
                                key={topic}
                                onClick={() => toggleTopic(topic)}
                                type="button"
                                disabled={isFormDisabled}
                                className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-200 
                                            ${
                                            formTopics.includes(topic)
                                                ? "bg-blue-500 text-white shadow-md"
                                                : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300"
                                            }
                                            ${
                                            isFormDisabled
                                                ? "cursor-not-allowed"
                                                : ""
                                            }`}
                                >
                                {topic}
                            </button>
                        ))}
                    </div>
                    {formTopics.length === 0 && !isFormDisabled && (
                        <p className="text-sm text-red-500 mt-2">
                            Please select at least one topic.
                        </p>
                    )}
                </div>

                {/* Difficulty selection */}
                <div className="mb-6">
                    <label className="block text-lg font-medium text-gray-800 mb-2">
                    3. Select Difficulty Level
                    </label>
                    <div className="flex space-x-3 p-3 bg-white border border-gray-300 rounded-xl shadow-sm">
                    {DIFFICULTIES.map((diff) => (
                        <button
                        key={diff}
                        onClick={() => handleSetFormDifficulty(diff)}
                        type="button"
                        className={`flex-1 py-3 text-base font-semibold rounded-lg transition-all duration-200 border-2
                                                ${
                                                diff === formDifficulty
                                                    ? "bg-blue-500 text-white shadow-md border-blue-500"
                                                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                                                }
                                                ${
                                                isFormDisabled
                                                    ? "cursor-not-allowed"
                                                    : ""
                                                }`}
                        >
                        {diff}
                        </button>
                    ))}
                    </div>
                </div>
                </fieldset>

                {/* Conditional Action Button */}
                <div className="pt-2 min-h-[50px]">
                    {isReadyState ? (
                        <Button
                            onClick={handleStartMatch}
                            variant="primary"
                            disabled={buttonDisabledForStart}
                            className="w-full text-lg shadow-xl"
                        >
                            {loading ? "Submitting Request..." : "Find Match"}
                        </Button>
                    ) : status === "QUEUED" ? (
                        <div className="flex flex-col items-center justify-between space-x-4 p-4 bg-indigo-50 border border-indigo-300 rounded-lg shadow-md">
                            <span className="text-indigo-700 font-semibold flex-1 flex items-center">
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
                    ) : status === "MATCH_FOUND" ? (
                        <div className="flex flex-col items-center justify-between space-x-4 p-4 bg-green-50 border border-green-300 rounded-lg shadow-md">
                            <span className="text-green-700 font-semibold flex-1 mb-4">
                                Success! Matched with{" "}
                                {finalMatchData?.matchedUserId ||
                                matchResult?.matchedUserId ||
                                "a partner"}
                            </span>
                            <Button
                                onClick={() => {
                                if (!finalMatchData?.matchId) {
                                    return;
                                }
                                router.push(`/question-selection?matchId=${finalMatchData.matchId}`);
                                }}
                                variant="primary"
                                disabled={!finalMatchData?.matchId}
                            >
                                {finalMatchData?.matchId ? "Go to Session" : "Preparing session..."}
                            </Button>
                        </div>
                    ) : status === "LOADING" ? (
                        <div className="flex items-center justify-center p-4">
                            <Loading message="Sending Request..." />
                        </div>
                    ) : null}
                </div>

                {/* Status and Socket Footer */}
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
            </div>
        </PageLayout>
    );
}
