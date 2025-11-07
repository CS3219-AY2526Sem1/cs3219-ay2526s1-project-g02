"use client";
import { useQuery } from "@apollo/client";
import { useAuth } from "@/components/providers/AuthProvider";
import NavBar from "@/components/NavBar";
import { GET_QUESTION_ATTEMPTS } from "@/lib/queries";
import { questionClient } from "@/lib/apollo-client";
import { useRouter } from "next/navigation";
import { Calendar, Code2, FileQuestion, ArrowLeft, RefreshCw, ExternalLink } from "lucide-react";

interface Question {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  category: string[];
}

interface QuestionAttempt {
  id: string;
  userId: string;
  questionId: string;
  matchId: string;
  attemptedAt: string;
  createdAt: string;
  question: Question;
}

export default function AttemptHistoryPage() {
  const { session, loading: authLoading } = useAuth();
  const router = useRouter();
  const userId = session?.user?.id;

  const { data, loading, error, refetch } = useQuery<{
    questionAttemptsByUser: QuestionAttempt[];
  }>(GET_QUESTION_ATTEMPTS, {
    variables: { userId },
    skip: !userId,
    client: questionClient,
    fetchPolicy: "cache-and-network", // Use cache first, then update from network
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50 to-blue-50">
        <NavBar />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="h-12 w-12 rounded-full border-4 border-gray-300 border-t-blue-500 animate-spin" />
        </div>
      </div>
    );
  }

  if (!session) {
    router.push("/login");
    return null;
  }

  const attempts = data?.questionAttemptsByUser || [];

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case "easy":
        return "text-green-600 bg-green-50 border-green-200";
      case "medium":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "hard":
        return "text-red-600 bg-red-50 border-red-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50 to-blue-50">
      <NavBar />

      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back</span>
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-slate-800 mb-2 flex items-center gap-3">
                <FileQuestion className="w-10 h-10 text-blue-600" />
                Attempt History
              </h1>
              <p className="text-slate-600">
                View all the questions you've attempted in your collaboration sessions
              </p>
            </div>
            <button
              onClick={() => refetch()}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="font-medium">Refresh</span>
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="h-12 w-12 rounded-full border-4 border-gray-300 border-t-blue-500 animate-spin" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-600 font-medium">Failed to load attempt history</p>
            <p className="text-red-500 text-sm mt-2">{error.message}</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && attempts.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm">
            <FileQuestion className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-700 mb-2">
              No Attempts Yet
            </h3>
            <p className="text-slate-500">
              Start matching and collaborating to build your attempt history!
            </p>
          </div>
        )}

        {/* Attempts List */}
        {!loading && !error && attempts.length > 0 && (
          <div className="space-y-4">
            {attempts.map((attempt) => (
              <div
                key={attempt.id}
                className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-slate-800 mb-2 flex items-center gap-2">
                      <Code2 className="w-5 h-5 text-blue-600" />
                      {attempt.question.title}
                    </h3>
                    <p className="text-slate-600 text-sm line-clamp-2 mb-3">
                      {attempt.question.description}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium border ${getDifficultyColor(
                      attempt.question.difficulty
                    )}`}
                  >
                    {attempt.question.difficulty}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-6 text-sm text-slate-500 border-t border-slate-100 pt-4">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(attempt.attemptedAt)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex flex-wrap gap-1">
                        {attempt.question.category.slice(0, 3).map((cat, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs"
                          >
                            {cat}
                          </span>
                        ))}
                        {attempt.question.category.length > 3 && (
                          <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs">
                            +{attempt.question.category.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => router.push(`/suggested-solution/${attempt.question.id}`)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Solution
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats Summary */}
        {!loading && !error && attempts.length > 0 && (
          <div className="mt-8 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-4">
                <p className="text-sm text-slate-600 mb-1">Total Attempts</p>
                <p className="text-3xl font-bold text-blue-600">{attempts.length}</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4">
                <p className="text-sm text-slate-600 mb-1">Easy Problems</p>
                <p className="text-3xl font-bold text-green-600">
                  {
                    attempts.filter(
                      (a) => a.question.difficulty.toLowerCase() === "easy"
                    ).length
                  }
                </p>
              </div>
              <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg p-4">
                <p className="text-sm text-slate-600 mb-1">Medium Problems</p>
                <p className="text-3xl font-bold text-yellow-600">
                  {
                    attempts.filter(
                      (a) => a.question.difficulty.toLowerCase() === "medium"
                    ).length
                  }
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
