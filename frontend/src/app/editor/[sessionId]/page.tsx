"use client";
import { useState, useEffect } from "react";
import Editor from "@/lib/components/editor";
import { useParams, useRouter } from "next/navigation";
import { WebSocketService } from "@/lib/services/web-socket-service";
import { PageLayout } from "@/components/layout";
import NavBar from "@/components/NavBar";
import { useAuth } from "@/components/providers/AuthProvider";
import { useQuery, useMutation } from "@apollo/client";
import {
  GET_SESSION_WITH_DETAILS,
  GET_USERS,
  END_SESSION,
} from "@/lib/queries";
import { collaborationClient, userClient } from "@/lib/apollo-client";
import { Sidebar } from "@/components/layout/Sidebar";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { TerminateSessionModal } from "@/components/TerminateSessionModal";
import { SessionTerminatedModal } from "@/components/SessionTerminatedModal";
import { QuestionExplanation } from "@/components/QuestionExplanation";
import { AiChat } from "@/components/AiChat";
import { Chat } from "@/components/Chat";

type Question = {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  category: string[];
};

type User = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

type SessionData = {
  sessionWithDetails: {
    id: string;
    match_id: string;
    question_id?: string;
    code: string;
    language: string;
    status: string;
    match?: {
      id: string;
      user1_id: string;
      user2_id: string;
      status: string;
    };
    question?: Question;
  };
};

export default function EditorPage() {
  const router = useRouter();
  const { sessionId: sessionIdParam } = useParams();
  const [sessionId] = useState(sessionIdParam as string);
  const { session: authSession, loading: authLoading } = useAuth();
  const [webSocketService, setWebSocketService] =
    useState<WebSocketService | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [showTerminateModal, setShowTerminateModal] = useState(false);
  const [showTerminatedModal, setShowTerminatedModal] = useState(false);
  const [processedEvents, setProcessedEvents] = useState<Set<number>>(
    new Set()
  );
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  const userId = authSession?.user?.id;

  const [endSessionMutation] = useMutation(END_SESSION, {
    client: collaborationClient,
  });

  // Fetch session with details
  const {
    data,
    loading: sessionLoading,
    error,
  } = useQuery<SessionData>(GET_SESSION_WITH_DETAILS, {
    client: collaborationClient,
    variables: { sessionId, userId },
    skip: !userId || authLoading,
  });

  // Fetch users for the match
  const session = data?.sessionWithDetails;
  const userIds = session?.match
    ? [session.match.user1_id, session.match.user2_id]
    : [];

  const { data: usersData, loading: usersLoading } = useQuery(GET_USERS, {
    client: userClient,
    variables: { user_ids: userIds },
    skip: userIds.length === 0 || !session,
  });

  const matchUsers = usersData?.users || [];
  const currentUser = matchUsers.find((user: User) => user.id === userId);
  const currentUserName = currentUser?.name || "User";

  // Handle query errors
  useEffect(() => {
    if (error) {
      console.error("Error fetching session:", error);
      if (error.message.includes("Session not found")) {
        setSessionError("not_found");
      } else if (error.message.includes("not part of this session")) {
        setSessionError("unauthorized");
      } else {
        setSessionError("error");
      }
    }
  }, [error]);

  const onStatusChange = (isConnected: boolean) => {
    const _message = isConnected
      ? "🌎 Connected to server!"
      : "🔴 Connection closed";
    console.log(_message);
  };

  const handleOnSync = (isSynced: boolean) => {
    console.log("🔄 Synced: ", isSynced);
  };

  const handleOnConnectionError = (event: Event) => {
    console.log("❌ Connection error: ", event);
  };

  const handleOnConnectionClosed = () => {
    console.log("🔴 Connection closed");
  };

  // Initialize WebSocketService only on client side
  useEffect(() => {
    if (!session || sessionError) return;

    // Don't initialize WebSocket if session has ended
    if (session.status !== "active") {
      return;
    }

    const initWebSocket = async () => {
      // Import WebSocketService on client side because it utilises browser APIs and NextJS is using SSR
      const { WebSocketService } = await import(
        "@/lib/services/web-socket-service"
      );
      const WS_URL = process.env.NEXT_PUBLIC_WS_URL;
      if (!WS_URL) throw new Error("NEXT_PUBLIC_WS_URL is not set");
      const service = new WebSocketService(WS_URL, sessionId);
      setWebSocketService(service);
      service.onStatusChange(onStatusChange);
      service.onSync(handleOnSync);
      service.onConnectionError(handleOnConnectionError);
      service.onConnectionClosed(handleOnConnectionClosed);

      // Set initial user state in awareness
      if (userId) {
        service.setLocalState({ userId, isPresent: true });
      }

      // Listen for awareness changes (presence and events)
      service.onAwarenessChange((states) => {
        // Track online users
        const currentlyOnline = new Set<string>();

        states.forEach((state, clientId) => {
          // Track presence
          if (state.userId && state.isPresent) {
            currentlyOnline.add(state.userId);
          }

          // Handle session termination events
          const event = state.sessionEvent;
          if (
            event?.type === "terminate" &&
            state.userId !== userId &&
            event.timestamp
          ) {
            // Only process events from the last 10 seconds and only once
            const eventAge = Date.now() - event.timestamp;
            if (eventAge < 10000 && !processedEvents.has(event.timestamp)) {
              console.log("Session terminated by user:", state.userId);
              setProcessedEvents((prev) => new Set(prev).add(event.timestamp));
              setShowTerminatedModal(true);
            }
          }
        });

        setOnlineUsers(currentlyOnline);
      });
    };

    initWebSocket();

    return () => {
      // Mark user as not present before disconnecting
      if (webSocketService && userId) {
        webSocketService.setLocalState({ userId, isPresent: false });
      }
      webSocketService?.destroy();
    };
  }, [sessionId, session, sessionError, userId]);

  const handleTerminateSession = async () => {
    if (!userId || !webSocketService) return;

    try {
      // Mark user as not present
      webSocketService.setLocalState({ userId, isPresent: false });

      // Update database
      await endSessionMutation({ variables: { sessionId } });

      // Broadcast termination event through yjs awareness
      const eventTimestamp = Date.now();
      webSocketService.broadcastSessionEvent({
        type: "terminate",
        data: { userId },
      });

      // Mark this event as processed so we don't react to our own broadcast
      setProcessedEvents((prev) => new Set(prev).add(eventTimestamp));

      // Close modal and redirect
      setShowTerminateModal(false);
      router.push("/");
    } catch (error) {
      console.error("Failed to terminate session:", error);
    }
  };

  // Auth loading state
  if (authLoading) {
    return (
      <PageLayout header={<NavBar></NavBar>}>
        <div className="flex items-center justify-center h-screen">
          <div className="h-12 w-12 rounded-full border-4 border-gray-300 border-t-blue-500 animate-spin" />
        </div>
      </PageLayout>
    );
  }

  // Not logged in
  if (!authSession) {
    return (
      <PageLayout header={<NavBar></NavBar>}>
        <div className="flex flex-col items-center justify-center h-screen">
          <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
          <p className="mb-4">
            You need to be logged in to access this session.
          </p>
          <button
            onClick={() => router.push("/login")}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Go to Login
          </button>
        </div>
      </PageLayout>
    );
  }

  // Session not found
  if (sessionError === "not_found") {
    return (
      <PageLayout header={<NavBar></NavBar>}>
        <div className="flex flex-col items-center justify-center h-screen">
          <h1 className="text-2xl font-bold mb-4">Session Not Found</h1>
          <p className="mb-4">
            The session you are trying to access does not exist.
          </p>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Go to Home
          </button>
        </div>
      </PageLayout>
    );
  }

  // User not part of session
  if (sessionError === "unauthorized") {
    return (
      <PageLayout header={<NavBar></NavBar>}>
        <div className="flex flex-col items-center justify-center h-screen">
          <h1 className="text-2xl font-bold mb-4">Unauthorized Access</h1>
          <p className="mb-4">You are not part of this session.</p>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Go to Home
          </button>
        </div>
      </PageLayout>
    );
  }

  // General error
  if (sessionError === "error" || error) {
    return (
      <PageLayout header={<NavBar></NavBar>}>
        <div className="flex flex-col items-center justify-center h-screen">
          <h1 className="text-2xl font-bold mb-4">Error</h1>
          <p className="mb-4">An error occurred while loading the session.</p>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Go to Home
          </button>
        </div>
      </PageLayout>
    );
  }

  // Loading session
  if (sessionLoading || !data?.sessionWithDetails) {
    return (
      <PageLayout header={<NavBar></NavBar>}>
        <div className="flex items-center justify-center h-screen">
          <div className="h-12 w-12 rounded-full border-4 border-gray-300 border-t-blue-500 animate-spin" />
        </div>
      </PageLayout>
    );
  }

  const sessionData = data.sessionWithDetails;

  // Check if session has ended
  const isSessionEnded = sessionData.status !== "active";

  // Show editor if websocket is ready OR if session has ended (no websocket needed)
  return webSocketService || isSessionEnded ? (
    <PageLayout header={<NavBar></NavBar>}>
      <div className="flex h-[calc(100vh-64px)] w-screen ">
        {/* Left Sidebar */}
        <div className="w-1/2 h-full bg-white border-r border-gray-200 flex flex-col px-6 pb-8">
          <Sidebar
            title=""
            bottomContent={
              <>
                <button
                  onClick={() => router.push("/")}
                  className="w-full px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setShowTerminateModal(true)}
                  className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  Terminate Session
                </button>
              </>
            }
          >
            <div className="flex flex-col justify-between h-full pb-4">
              {/* Question Info */}
              {sessionData.question && (
                <div className="mb-8">
                  <h2 className="text-xl font-bold mb-2">
                    1. {sessionData.question.title}
                  </h2>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {sessionData.question.description}
                  </p>
                  <QuestionExplanation questionId={sessionData.question.id} />
                </div>
              )}

              {/* Users */}
              {!usersLoading && matchUsers.length > 0 && (
                <div className="flex flex-col gap-4">
                  {matchUsers.map((user: User) => {
                    const isOnline = onlineUsers.has(user.id);
                    return (
                      <div key={user.id} className="flex items-center gap-3">
                        <div className="relative">
                          <UserAvatar username={user.name} size="md" />
                          {/* Presence indicator */}
                          <div
                            className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${
                              isOnline ? "bg-green-500" : "bg-red-500"
                            }`}
                            title={isOnline ? "Online" : "Offline"}
                          />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 flex items-center gap-2">
                            @{user.name}
                            <span
                              className={`text-xs ${
                                isOnline ? "text-green-600" : "text-red-600"
                              }`}
                            >
                              {isOnline ? "• Online" : "• Offline"}
                            </span>
                          </p>
                          <p className="text-xs text-gray-500">
                            Joined{" "}
                            {new Date(user.createdAt).toLocaleDateString(
                              "en-US",
                              {
                                month: "long",
                                year: "numeric",
                              }
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Sidebar>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col bg-gray-50">
          {webSocketService && (
            <Editor
              height={"100%"}
              defaultLanguage={sessionData.language}
              defaultValue={sessionData.code}
              webSocketService={webSocketService}
            />
          )}
          {!webSocketService && isSessionEnded && (
            <div className="flex items-center justify-center flex-1">
              <div className="text-gray-400 text-lg">Session has ended</div>
            </div>
          )}

          {/* Session Ended Modal */}
          {isSessionEnded && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              {/* Backdrop with blur */}
              <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => router.push("/")}
              />

              {/* Modal */}
              <div className="relative bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4 border border-gray-200">
                <div className="text-center">
                  <div className="mb-4">
                    <svg
                      className="mx-auto h-16 w-16 text-red-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Session Has Ended
                  </h2>
                  <p className="text-gray-600 mb-6">
                    This collaboration session is no longer active. You can no
                    longer make edits to this session.
                  </p>
                  <button
                    onClick={() => router.push("/")}
                    className="w-full px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-lg hover:from-cyan-700 hover:to-blue-700 transition-colors"
                  >
                    Go Back to Home
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Terminate Confirmation Modal */}
        <TerminateSessionModal
          isOpen={showTerminateModal}
          onConfirm={handleTerminateSession}
          onCancel={() => setShowTerminateModal(false)}
        />

        {/* Session Terminated by Other User Modal */}
        <SessionTerminatedModal
          isOpen={showTerminatedModal}
          onGoHome={() => router.push("/")}
        />

        {/* AI Chat - Only show if we have a question */}
        {sessionData.question && (
          <AiChat
            questionId={sessionData.question.id}
            getCurrentCode={() => webSocketService?.getCurrentCode() || ""}
          />
        )}

        {/* Team Chat - Only show if websocket is connected */}
        {webSocketService && userId && (
          <Chat
            webSocketService={webSocketService}
            currentUserId={userId}
            currentUserName={currentUserName}
          />
        )}
      </div>
    </PageLayout>
  ) : (
    <PageLayout header={<NavBar></NavBar>}>
      <div className="flex items-center justify-center h-screen">
        <div className="h-12 w-12 rounded-full border-4 border-gray-300 border-t-blue-500 animate-spin" />
      </div>
    </PageLayout>
  );
}
