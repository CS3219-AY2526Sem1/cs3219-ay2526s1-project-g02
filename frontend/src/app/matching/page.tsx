"use client";

import { PageLayout } from "@/components/layout";
import NavBar from "@/components/NavBar";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button, Loading } from "@/components/ui";
import {
  CANCEL_MATCH_MUTATION,
  FIND_MATCH_MUTATION,
} from "@/lib/graphql/matching-mutations";
import {
  MatchFoundData,
  matchingSocket,
  RequestExpiredData,
} from "@/lib/socket/socket";
import { useMutation } from "@apollo/client";
import {
  MatchRequestInput,
  MatchResultOutput,
} from "@noclue/common";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const LANGUAGES = ["JavaScript", "Python", "Java", "C++", "Go", "Rust"];
const TOPICS = [
  "Algorithms",
  "Data Structures",
  "Graphs and Trees",
  "Networking",
  "Concurrency",
  "Databases",
];
const DIFFICULTIES = ["Easy", "Medium", "Hard"];

type MatchStatus =
  | "IDLE"
  | "LOADING"
  | "QUEUED"
  | "MATCH_FOUND"
  | "REQUEST_EXPIRED"
  | "CANCELLED"
  | "ERROR";

export default function MatchingPage() {

  const router = useRouter();

  // Get userId from auth
  const { session, loading: authLoading } = useAuth();
  const ACTIVE_USER_ID = session?.user?.id || null;
  const ACCESS_TOKEN = session?.access_token || "";

  // State Variables   
  const [status, setStatus] = useState<MatchStatus>("IDLE");
  const [matchResult, setMatchResult] = useState<MatchResultOutput | null>(
    null
  ); // from sync graphQL
  const [finalMatchData, setFinalMatchData] = useState<MatchFoundData | null>(
    null
  ); // from async websocket
  const [socketStatus, setSocketStatus] = useState<
    "connected" | "disconnected"
  >("disconnected");
  const [notification, setNotification] = useState<{
    message: string;
    status: MatchStatus;
  } | null>(null);

  // Form State
  const [formLanguage, setFormLanguage] = useState<string>(LANGUAGES[0]);
  const [formTopics, setFormTopics] = useState<string[]>([]);
  const [formDifficulty, setFormDifficulty] = useState<string>(DIFFICULTIES[0]);

  // Loading auth
  if (authLoading) {
    return (
      <PageLayout header={<NavBar></NavBar>}>
        <div className="flex justify-center items-center h-full pt-20">
          <Loading message="Loading user session..." />
        </div>
      </PageLayout>
    );
  }

  // Not authenticated yet
  if (!session) {
    router.push("/login");
    return null;
  }

  // Helper to dismiss notification
  const dismissNotification = () => {
    setNotification(null);
    if (
      status === "REQUEST_EXPIRED" ||
      status === "CANCELLED" ||
      status === "ERROR"
    ) {
      setStatus("IDLE");
    }
  };

  // Helper for language selection
  const handleSetFormLanguage = (value: string) => {
    if (!isFormDisabled) setFormLanguage(value);
  };

  // Helper for difficulty selection
  const handleSetFormDifficulty = (value: string) => {
    if (!isFormDisabled) setFormDifficulty(value);
  };

  // Helper for topic selection (multi-select)
  const toggleTopic = (topic: string) => {
    setFormTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
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

  // 1a. GraphQL Mutation for findMatch (to be used below)
  const [findMatch, { loading, error }] = useMutation(FIND_MATCH_MUTATION, {
    onCompleted(data) {
      const result: MatchResultOutput = data.findMatch;
      setMatchResult(result);

      if (
        !result.matchFound &&
        !result.queued &&
        result.reason === "User already in active match"
      ) {
        console.warn("User is already in an active match.");
        setStatus("ERROR");
        setNotification({
          message: "You are already in an active match.",
          status: "ERROR",
        });
        return;
      }

      if (result.matchFound) {
        console.log("Match found immediately:", result);
        setStatus("MATCH_FOUND");
        setNotification({
          message: "Match found successfully!",
          status: "MATCH_FOUND",
        });
        // TODO: Show matchedUserId somewhere in the UI
      } else if (result.queued) {
        console.log("No immediate match, queued for matching:", result);
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
  const [cancelMatch, { loading: canceling, error: cancelError }] = useMutation(
    CANCEL_MATCH_MUTATION,
    {
      onCompleted(data) {
        const result = data.cancelMatchRequest;
        if (result.success) {
          console.log("Match request cancelled successfully");
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
    }
  );

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
      console.warn("No active match request to cancel.");
      return;
    }
    if (canceling) return; // Prevent multiple requests
    cancelMatch({ variables: { input: { requestId } } });
  };

  // 3. Initial Socket.IO Connection
  useEffect(() => {
    if (!ACTIVE_USER_ID) {
        console.log("No valid user ID to initialize socket.");
        return;
    }

    matchingSocket.auth = { userId: ACTIVE_USER_ID };
    console.log("Set socket auth with userId:", { userId: ACTIVE_USER_ID });

    if (!matchingSocket.connected) {
      matchingSocket.connect();
      console.log("Attempting initial socket connection...");
    }

    const onConnect = () => setSocketStatus("connected");
    const onDisconnect = () => setSocketStatus("disconnected");

    matchingSocket.on("connect", onConnect);
    matchingSocket.on("disconnect", onDisconnect);

    return () => {
      matchingSocket.off("connect", onConnect);
      matchingSocket.off("disconnect", onDisconnect);
      if (matchingSocket.connected) matchingSocket.disconnect();
    };
  }, [ACTIVE_USER_ID]);

  // 4. Socket.IO Listeners
  useEffect(() => {
    // Event Listener for 'matchFound' (i.e. match found after being queued)
    const handleMatchFoundEvent = (data: MatchFoundData) => {
      if (status === "QUEUED" && matchResult) {
        console.log("Match found!", data);
        setFinalMatchData(data);
        setStatus("MATCH_FOUND");
        setNotification({
          message: "Match found successfully!",
          status: "MATCH_FOUND",
        });
      }
    };

    // Event Listener for 'requestExpired' (i.e. match request expired)
    const handleRequestExpiredEvent = (data: RequestExpiredData) => {
      if (status === "QUEUED") {
        console.log("Match request expired:", data);
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

  // 5. UI State
  const isFormDisabled =
    status === "LOADING" || status === "QUEUED" || status === "MATCH_FOUND";
  const buttonDisabledForStart =
    formTopics.length === 0 || loading || canceling;
  const isReadyState =
    status === "IDLE" ||
    status === "REQUEST_EXPIRED" ||
    status === "CANCELLED" ||
    status === "ERROR";

  return (
    <PageLayout header={<NavBar></NavBar>}>
      <div className="bg-gray-100 w-full mx-auto rounded-xl p-8 shadow-xl">
        {/* Notification Banner with Dismiss Button */}
        {notification && (
          <div
            // Use flex to align message and button
            className={`p-3 mb-6 rounded-lg text-sm font-medium flex items-center justify-between
                            ${getNotificationColorClasses(
                              notification.status
                            )}`}
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
              {LANGUAGES.map((lang) => (
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
              {TOPICS.map((topic) => (
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
                  console.log("Navigating to session...");
                  dismissNotification();
                }}
                variant="primary"
              >
                Go to Session
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
            <span
              className={`ml-1 font-extrabold ${getStatusTextColor(status)}`}
            >
              {status}
            </span>
          </div>

          {/* Technical Connection Status (Bottom-Right) */}
          <div className="text-right font-medium text-gray-500">
            Connection:
            <span
              className={`ml-1 font-extrabold ${
                socketStatus === "connected" ? "text-green-600" : "text-red-600"
              }`}
            >
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
