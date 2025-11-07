"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@apollo/client";
import {
  GET_QUESTIONS_FOR_MATCH,
  QUESTION_SELECTION_STATUS,
  SESSION_BY_MATCH,
  SUBMIT_QUESTION_SELECTION,
  GET_USERS,
} from "@/lib/queries";
import { collaborationClient, questionClient, userClient } from "@/lib/apollo-client";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DifficultyBadge,
  Loading,
  UserAvatar,
} from "@/components/ui";
import { PageLayout } from "@/components/layout";
import NavBar from "@/components/NavBar";
import { useAuth } from "@/components/providers/AuthProvider";
import { matchingSocket, SessionStartedData } from "@/lib/socket/socket";

interface Question {
  id: string;
  title: string;
  difficulty: string;
  category: string[];
  description?: string;
}

type SelectionStatus = "PENDING" | "COMPLETE" | "ALREADY_ASSIGNED";

interface QuestionSelectionEntry {
  userId: string;
  questionId: string;
  isWinner?: boolean | null;
  submittedAt?: string | null;
  finalizedAt?: string | null;
}

interface QuestionSelectionResponse {
  status: SelectionStatus;
  pendingUserIds: string[];
  selections: QuestionSelectionEntry[];
  finalQuestion?: Question | null;
}

interface Participant {
  id: string;
  name?: string | null;
  email?: string | null;
}

export default function SessionPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const matchId = searchParams.get("matchId");

  const { session, loading: authLoading } = useAuth();
  const activeUserId = session?.user?.id ?? null;

  const {
    loading: questionsLoading,
    error: questionsError,
    data: questionsData,
  } = useQuery(GET_QUESTIONS_FOR_MATCH, {
    client: questionClient,
    variables: { matchId },
    skip: !matchId,
  });

  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const hasNavigatedRef = useRef(false);

  const {
    data: selectionData,
    error: selectionError,
    refetch: refetchSelection,
    stopPolling,
  } = useQuery<{ questionSelectionStatus: QuestionSelectionResponse }>(
    QUESTION_SELECTION_STATUS,
    {
      variables: { matchId },
      skip: !matchId,
      client: questionClient,
      pollInterval: 700,
      notifyOnNetworkStatusChange: true,
    }
  );

  const [submitSelection, { loading: submitting }] = useMutation(
    SUBMIT_QUESTION_SELECTION,
    {
      client: questionClient,
      onCompleted: () => {
        refetchSelection();
      },
      onError: (error) => {
        setSubmitError(error.message);
      },
    }
  );

  const selectionStatus = selectionData?.questionSelectionStatus;
  const finalQuestionId = selectionStatus?.finalQuestion?.id ?? null;
  const isSelectionComplete =
    selectionStatus?.status === "COMPLETE" ||
    selectionStatus?.status === "ALREADY_ASSIGNED";

  const questions: Question[] = questionsData?.questionsForMatchSelection || [];

  const shouldFetchSession =
    selectionStatus?.status === "COMPLETE" && Boolean(matchId);

  const {
    data: sessionByMatchData,
    startPolling: startSessionPolling,
    stopPolling: stopSessionPolling,
  } = useQuery(SESSION_BY_MATCH, {
    variables: { matchId },
    skip: !shouldFetchSession,
    client: collaborationClient,
    fetchPolicy: "network-only",
  });

  const questionLookup = useMemo(() => {
    const map = new Map<string, Question>();
    questions.forEach((question) => {
      map.set(question.id, question);
    });
    return map;
  }, [questions]);

  const selectionSummary = useMemo(() => {
    if (!selectionStatus) {
      return null;
    }

    return {
      status: selectionStatus.status,
      pendingUserIds: selectionStatus.pendingUserIds,
      selections: selectionStatus.selections,
    };
  }, [selectionStatus]);

  const participantIds = useMemo(() => {
    const ids = new Set<string>();
    selectionStatus?.selections.forEach((entry) => {
      if (entry.userId) {
        ids.add(entry.userId);
      }
    });
    selectionStatus?.pendingUserIds.forEach((id) => {
      if (id) {
        ids.add(id);
      }
    });
    return Array.from(ids);
  }, [selectionStatus]);

  const { data: usersData } = useQuery<{ users: Participant[] }>(GET_USERS, {
    client: userClient,
    variables: { user_ids: participantIds },
    skip: participantIds.length === 0,
    fetchPolicy: "cache-first",
  });

  const participantsById = useMemo(() => {
    const map = new Map<string, Participant>();
    usersData?.users.forEach((user) => {
      map.set(user.id, user);
    });
    return map;
  }, [usersData]);

  const resolveUserLabel = (userId: string) => {
    if (!userId) {
      return "Unknown User";
    }
    if (userId === activeUserId) {
      return "You";
    }
    const user = participantsById.get(userId);
    const trimmedName = user?.name?.trim();
    if (trimmedName) {
      return trimmedName;
    }
    if (user?.email) {
      const emailName = user.email.split("@")[0];
      if (emailName) {
        return emailName;
      }
    }
    return `User ${userId.slice(0, 8)}`;
  };

  useEffect(() => {
    if (!activeUserId) {
      return;
    }

    matchingSocket.auth = { userId: activeUserId };

    if (!matchingSocket.connected) {
      try {
        matchingSocket.connect();
      } catch (error) {
        console.error("Failed to connect to matching socket:", error);
      }
    }
  }, [activeUserId]);

  useEffect(() => {
    if (!matchId) {
      return;
    }

    const handleSessionStarted = (payload: SessionStartedData) => {
      if (!payload?.sessionId || payload.matchId !== matchId) {
        return;
      }

      if (hasNavigatedRef.current) {
        return;
      }

      hasNavigatedRef.current = true;

      stopSessionPolling?.();
      stopPolling?.();

      try {
        router.push(`/editor/${payload.sessionId}`);
      } catch (error) {
        hasNavigatedRef.current = false;
        console.error("Failed to navigate to collaborative editor:", error);
      }
    };

    matchingSocket.on("sessionStarted", handleSessionStarted);

    return () => {
      matchingSocket.off("sessionStarted", handleSessionStarted);
    };
  }, [matchId, router, stopPolling, stopSessionPolling]);

  useEffect(() => {
    if (!activeUserId) {
      setHasSubmitted(false);
      return;
    }
    const alreadySubmitted =
      selectionStatus?.selections.some((selection) => selection.userId === activeUserId) ??
      false;
    if (alreadySubmitted) {
      setHasSubmitted(true);
    }
  }, [selectionStatus, activeUserId]);

  useEffect(() => {
    setHasSubmitted(false);
  }, [matchId]);

  useEffect(() => {
    if (
      selectionStatus &&
      (selectionStatus.status === "COMPLETE" ||
        selectionStatus.status === "ALREADY_ASSIGNED")
    ) {
      stopPolling?.();
      setIsCreatingSession(true);
    }
  }, [selectionStatus?.status, stopPolling]);

  useEffect(() => {
    if (!shouldFetchSession) {
      stopSessionPolling?.();
      return;
    }
    startSessionPolling?.(1000);
    return () => {
      stopSessionPolling?.();
    };
  }, [shouldFetchSession, startSessionPolling, stopSessionPolling]);

  const sessionId = sessionByMatchData?.sessionByMatch?.id ?? null;

  useEffect(() => {
    if (sessionId && !hasNavigatedRef.current) {
      hasNavigatedRef.current = true;
      stopSessionPolling?.();
      router.push(`/editor/${sessionId}`);
    }
  }, [sessionId, router, stopSessionPolling]);

  useEffect(() => {
    if (finalQuestionId) {
      setSelectedQuestion(finalQuestionId);
    }
  }, [finalQuestionId]);

  if (authLoading || questionsLoading) {
    return (
      <PageLayout header={<NavBar />}>
        <Loading message="Loading session..." />
      </PageLayout>
    );
  }

  if (!session) {
    router.push("/login");
    return null;
  }

  if (!matchId) {
    return (
      <PageLayout header={<NavBar />}>
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <div className="text-red-600">
            Match information is missing. Please return to the matching page.
          </div>
        </div>
      </PageLayout>
    );
  }

  if (questionsError) {
    return (
      <PageLayout header={<NavBar />}>
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <div className="text-red-600">Error: {questionsError.message}</div>
        </div>
      </PageLayout>
    );
  }

  // Show loading screen when creating session
  if (isCreatingSession) {
    return (
      <PageLayout header={<NavBar />}>
        <div className="w-full mx-auto pt-20 pb-32 px-6">
          <div className="max-w-3xl mx-auto">
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-12 border border-white/50 shadow-lg text-center">
              <div className="mb-6">
                <div className="w-20 h-20 mx-auto bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center animate-pulse">
                  <svg className="w-10 h-10 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-3">
                Creating Your Session
              </h2>
              <p className="text-lg text-slate-600 mb-4">
                Setting up the collaborative environment...
              </p>
              <p className="text-sm text-slate-500">
                You'll be redirected to the editor shortly
              </p>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  const handleSubmitSelection = async () => {
    if (!selectedQuestion || hasSubmitted) {
      if (!selectedQuestion) {
        setSubmitError("Please choose a question before submitting.");
      }
      return;
    }
    if (!matchId || !activeUserId) {
      setSubmitError("Missing match or user information.");
      return;
    }

    try {
      setSubmitError(null);
      const { data } = await submitSelection({
        variables: {
          input: {
            matchId,
            userId: activeUserId,
            questionId: selectedQuestion,
          },
        },
      });

      const result: QuestionSelectionResponse | undefined =
        data?.submitQuestionSelection;
      if (result) {
        if (result.status === "COMPLETE" && result.finalQuestion?.id) {
          setSelectedQuestion(result.finalQuestion.id);
        }
      }
      setHasSubmitted(true);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to submit question selection.";
      setSubmitError(message);
      setHasSubmitted(false);
    }
  };

  return (
    <PageLayout header={<NavBar />}>
      <div className="w-full mx-auto pt-12 pb-32 px-6">
        <div className="max-w-5xl mx-auto">
          {/* Header Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 leading-tight">
              Choose Your
              <span className="block bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent pb-1">
                Challenge
              </span>
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Select a question to solve together. Once both participants choose, one will be randomly selected.
            </p>
          </div>

          {/* Error Messages */}
          {selectionError && (
            <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm mb-6 backdrop-blur-sm">
              Failed to load selection status: {selectionError?.message ?? "Unknown error"}
            </div>
          )}

          {submitError && (
            <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm mb-6 backdrop-blur-sm">
              {submitError}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-center mb-8">
            <button
              onClick={handleSubmitSelection}
              disabled={
                !selectedQuestion ||
                submitting ||
                !matchId ||
                !activeUserId ||
                isSelectionComplete ||
                hasSubmitted
              }
              className={`px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 ${
                !selectedQuestion ||
                submitting ||
                !matchId ||
                !activeUserId ||
                isSelectionComplete ||
                hasSubmitted
                  ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:shadow-xl hover:shadow-cyan-500/25"
              }`}
            >
              {isSelectionComplete
                ? "Question Assigned"
                : submitting
                ? "Submitting..."
                : "Submit Selection"}
            </button>
          </div>

          {/* Selection Progress Card */}
          {selectionSummary && (
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-lg mb-8">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Selection Progress</h2>
              
              <div className="space-y-4">
                {/* User Selections */}
                {selectionSummary.selections.length > 0 && (
                  <div className="space-y-3">
                    {selectionSummary.selections.map((selection) => {
                      const question = questionLookup.get(selection.questionId);
                      const isWinner = selection.isWinner;
                      const displayName = resolveUserLabel(selection.userId);
                      
                      return (
                        <div
                          key={selection.userId}
                          className={`flex items-center gap-3 p-4 rounded-xl transition-all ${
                            isWinner
                              ? "bg-gradient-to-r from-emerald-50 to-green-50 border-2 border-emerald-300"
                              : "bg-white/80 border border-slate-200"
                          }`}
                        >
                          <UserAvatar 
                            username={displayName} 
                            size="sm" 
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900">
                                {displayName}
                              </span>
                              {isWinner && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-emerald-500 to-green-500 text-white">
                                  ✓ Final Choice
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-slate-600 truncate mt-1">
                              Selected: <span className="font-semibold">{question?.title ?? selection.questionId}</span>
                            </div>
                            {question && (
                              <div className="flex items-center gap-2 mt-2">
                                <DifficultyBadge difficulty={question.difficulty} />
                                <span className="text-xs text-slate-500">
                                  {question.category.slice(0, 2).join(", ")}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Pending Users */}
                {selectionSummary.pendingUserIds.length > 0 && (
                  <div className="pt-4 border-t border-slate-200">
                    <div className="text-sm font-semibold text-slate-700 mb-3">
                      Waiting for selections:
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {selectionSummary.pendingUserIds.map((userId) => (
                        <div
                          key={userId}
                          className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 border border-slate-200"
                        >
                          <UserAvatar username={resolveUserLabel(userId)} size="sm" />
                          <span className="text-sm font-medium text-slate-700">
                            {resolveUserLabel(userId)}
                          </span>
                          <div className="flex gap-1">
                            <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse" />
                            <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse delay-75" />
                            <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse delay-150" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Questions Grid */}
          <div className="space-y-4">
            {questions.map((question) => {
              const isSelected =
                selectedQuestion === question.id || finalQuestionId === question.id;
              const isFinal = finalQuestionId === question.id;

              return (
                <div
                  key={question.id}
                  onClick={() => {
                    if (isSelectionComplete || hasSubmitted) return;
                    setSelectedQuestion(question.id);
                  }}
                  className={`
                    bg-white/60 backdrop-blur-sm rounded-2xl p-6 border transition-all duration-300
                    ${isFinal 
                      ? "border-emerald-400 border-2 shadow-lg shadow-emerald-500/20" 
                      : isSelected
                      ? "border-cyan-400 border-2 shadow-lg shadow-cyan-500/20"
                      : "border-white/50 hover:border-cyan-200 hover:shadow-lg"
                    }
                    ${!isSelectionComplete && !hasSubmitted ? "cursor-pointer" : "cursor-default"}
                  `}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-slate-900 mb-2">
                        {question.title}
                      </h3>
                      <p className="text-slate-600 mb-3">
                        Topics: {question.category.join(", ")}
                      </p>
                      <div className="flex items-center gap-3">
                        <DifficultyBadge difficulty={question.difficulty} />
                        {isFinal && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-gradient-to-r from-emerald-500 to-green-500 text-white">
                            ✓ Selected Question
                          </span>
                        )}
                      </div>
                    </div>
                    {isSelected && !isFinal && (
                      <div className="flex-shrink-0">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
