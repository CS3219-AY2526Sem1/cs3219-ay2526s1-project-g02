"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@apollo/client";
import {
  GET_QUESTIONS,
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
import { PageHeader, PageLayout } from "@/components/layout";
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
  } = useQuery(GET_QUESTIONS, {
    client: questionClient,
  });

  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
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
      pollInterval: 5000,
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

  const questions: Question[] = questionsData?.questions || [];

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
    <PageLayout header={<PageHeader title="No Clue" />}>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-8">
        {selectionError && (
          <div className="rounded bg-red-100 border border-red-300 text-red-700 px-3 py-2 text-sm">
            Failed to load selection status: {selectionError?.message ?? "Unknown error"}
          </div>
        )}

        {submitError && (
          <div className="rounded bg-red-100 border border-red-300 text-red-700 px-3 py-2 text-sm">
            {submitError}
          </div>
        )}

        <div className="flex justify-end">
          <Button
            onClick={handleSubmitSelection}
            disabled={
              !selectedQuestion ||
              submitting ||
              !matchId ||
              !activeUserId ||
              isSelectionComplete ||
              hasSubmitted
            }
          >
            {isSelectionComplete
              ? "Question Assigned"
              : submitting
              ? "Submitting..."
              : "Submit Selection"}
          </Button>
        </div>

        {selectionSummary && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Selection Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* User Selections */}
                {selectionSummary.selections.length > 0 && (
                  <div className="space-y-3">
                    {selectionSummary.selections.map((selection) => {
                      const question = questionLookup.get(selection.questionId);
                      const isCurrentUser = selection.userId === activeUserId;
                      const isWinner = selection.isWinner;
                      const displayName = resolveUserLabel(selection.userId);
                      
                      return (
                        <div
                          key={selection.userId}
                          className={`flex items-center gap-3 p-3 rounded-lg border ${
                            isWinner
                              ? "bg-green-50 border-green-200"
                            : "bg-white border-slate-200"
                          }`}
                        >
                          <UserAvatar 
                            username={displayName} 
                            size="sm" 
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm text-slate-900">
                                {displayName}
                              </span>
                              {isWinner && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                  ✓ Final Choice
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-slate-600 truncate">
                              Selected: <span className="font-medium">{question?.title ?? selection.questionId}</span>
                            </div>
                            {question && (
                              <div className="flex items-center gap-2 mt-1">
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
                      <div className="pt-3 border-t border-slate-200">
                        <div className="text-sm font-medium text-slate-700 mb-2">
                          Waiting for selections:
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {selectionSummary.pendingUserIds.map((userId) => (
                            <div
                              key={userId}
                              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200"
                            >
                              <UserAvatar username={resolveUserLabel(userId)} size="sm" />
                              <span className="text-xs font-medium text-slate-700">
                                {resolveUserLabel(userId)}
                              </span>
                              <div className="flex gap-1">
                                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-pulse" />
                                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-pulse delay-75" />
                                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-pulse delay-150" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {questions.map((question) => {
            const isSelected =
              selectedQuestion === question.id || finalQuestionId === question.id;

            return (
              <Card
                key={question.id}
                onClick={() => {
                  if (isSelectionComplete || hasSubmitted) return;
                  setSelectedQuestion(question.id);
                }}
                selected={isSelected}
                className={
                  finalQuestionId === question.id
                    ? "border-green-500 border-2"
                    : undefined
                }
              >
                <CardHeader>
                  <CardTitle>{question.title}</CardTitle>
                  <CardContent>
                    <span className="font-normal">
                      Topics: {question.category.join(", ")}
                    </span>
                  </CardContent>
                  <div className="flex items-center gap-2">
                    <DifficultyBadge difficulty={question.difficulty} />
                    {finalQuestionId === question.id && (
                      <span className="text-green-600 text-xs font-semibold uppercase">
                        Selected
                      </span>
                    )}
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>
    </PageLayout>
  );
}
