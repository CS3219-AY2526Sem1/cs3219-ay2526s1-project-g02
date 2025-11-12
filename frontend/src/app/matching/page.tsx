"use client";

import { PageLayout } from "@/components/layout";
import MatchingActionButton from "@/components/MatchingActionButton";
import MatchingFooter from "@/components/MatchingFooter";
import MatchingFormFields from "@/components/MatchingForm";
import MatchingNotification from "@/components/MatchingNotification";
import NavBar from "@/components/NavBar";
import { useAuth } from "@/components/providers/AuthProvider";
import { Loading } from "@/components/ui";
import { useMatchingLogic } from "@/hooks/useMatchingLogic";
import { HeartHandshake, Link, Users, UserSearch } from "lucide-react";
import { useRouter } from "next/navigation";

export default function MatchingPage() {
    const router = useRouter();
    const { session, loading: authLoading } = useAuth();
    const {
        // state
        status, loading, canceling, notification, matchResult, finalMatchData, socketStatus, matchedUsername,
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

    return (
        <PageLayout header={<NavBar></NavBar>}>
            <div className="flex flex-col gap-2 w-4/5 xl:max-w-5xl mx-auto p-8">
                {/* Notification Banner with Dismiss Button */}
                <MatchingNotification
                    notification={notification}
                    dismissNotification={dismissNotification}
                />

                {/* New Header Section */}
                <header className="mb-8">
                    <h1 className="flex items-center text-3xl font-extrabold text-gray-900 mb-2">
                        <UserSearch className="w-8 h-8 mr-2 text-blue-500" strokeWidth={3}/>
                        Find a Coding Partner
                    </h1>
                    <p className="text-gray-500">
                        Choose your preferences below to be matched with a peer.
                    </p>
                </header>

                {/* Matching Form */}
                <MatchingFormFields 
                    formLanguage={formLanguage}
                    formTopics={formTopics}
                    formDifficulty={formDifficulty}
                    isFormDisabled={isFormDisabled}
                    handleSetFormLanguage={handleSetFormLanguage}
                    handleSetFormTopics={handleSetFormTopics}
                    handleSetFormDifficulty={handleSetFormDifficulty}
                />

                {/* Conditional Action Button */}
                <MatchingActionButton 
                    status={status}
                    loading={loading}
                    canceling={canceling}
                    isReadyState={isReadyState}
                    buttonDisabledForStart={buttonDisabledForStart}
                    matchResult={matchResult}
                    finalMatchData={finalMatchData}
                    matchedUsername={matchedUsername}
                    handleStartMatch={handleStartMatch}
                    handleCancelMatch={handleCancelMatch}
                />

                {/* Status and Socket Footer */}
                {/* <MatchingFooter 
                    status={status}
                    socketStatus={socketStatus}
                    matchResult={matchResult}
                /> */}
            </div>
        </PageLayout>
    );
}
