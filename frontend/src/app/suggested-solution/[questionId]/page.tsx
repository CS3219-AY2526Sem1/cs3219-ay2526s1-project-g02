"use client";
import { useQuery } from "@apollo/client";
import { useParams, useRouter } from "next/navigation";
import NavBar from "@/components/NavBar";
import { GET_SUGGESTED_SOLUTIONS } from "@/lib/queries";
import { questionClient } from "@/lib/apollo-client";
import { ArrowLeft, Code2, Clock, Database, Lightbulb } from "lucide-react";

interface SuggestedSolution {
  id: string;
  questionId: string;
  language: string;
  solutionCode: string;
  explanation?: string;
  timeComplexity?: string;
  spaceComplexity?: string;
  createdAt: string;
  updatedAt: string;
}

export default function SuggestedSolutionPage() {
  const params = useParams();
  const router = useRouter();
  const questionId = params.questionId as string;

  const { data, loading, error } = useQuery<{
    suggestedSolutionsForQuestion: SuggestedSolution[];
  }>(GET_SUGGESTED_SOLUTIONS, {
    variables: { questionId },
    client: questionClient,
    fetchPolicy: "network-only",
  });

  const solutions = data?.suggestedSolutionsForQuestion || [];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50 to-blue-50">
        <NavBar />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="h-12 w-12 rounded-full border-4 border-gray-300 border-t-blue-500 animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50 to-blue-50">
        <NavBar />
        <div className="container mx-auto px-6 py-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back</span>
          </button>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-600 font-medium">Failed to load suggested solutions</p>
            <p className="text-red-500 text-sm mt-2">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50 to-blue-50">
      <NavBar />

      <div className="container mx-auto px-6 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back</span>
          </button>
          <h1 className="text-4xl font-bold text-slate-800 mb-2 flex items-center gap-3">
            <Lightbulb className="w-10 h-10 text-yellow-500" />
            Suggested Solutions
          </h1>
          <p className="text-slate-600">
            Review different approaches to solve this problem
          </p>
        </div>

        {/* Empty State */}
        {solutions.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm">
            <Code2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-700 mb-2">
              No Solutions Available
            </h3>
            <p className="text-slate-500">
              There are no suggested solutions for this question yet.
            </p>
          </div>
        )}

        {/* Solutions List */}
        {solutions.length > 0 && (
          <div className="space-y-6">
            {solutions.map((solution, index) => (
              <div
                key={solution.id}
                className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden"
              >
                {/* Solution Header */}
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 px-6 py-4 border-b border-slate-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                      <Code2 className="w-5 h-5 text-blue-600" />
                      Solution {index + 1} - {solution.language}
                    </h2>
                  </div>
                </div>

                {/* Complexity Info */}
                {(solution.timeComplexity || solution.spaceComplexity) && (
                  <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                    <div className="flex gap-6">
                      {solution.timeComplexity && (
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-blue-600" />
                          <span className="text-sm text-slate-600">Time:</span>
                          <code className="text-sm font-mono bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            {solution.timeComplexity}
                          </code>
                        </div>
                      )}
                      {solution.spaceComplexity && (
                        <div className="flex items-center gap-2">
                          <Database className="w-4 h-4 text-green-600" />
                          <span className="text-sm text-slate-600">Space:</span>
                          <code className="text-sm font-mono bg-green-100 text-green-800 px-2 py-1 rounded">
                            {solution.spaceComplexity}
                          </code>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Explanation */}
                {solution.explanation && (
                  <div className="px-6 py-4 border-b border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-800 mb-2 flex items-center gap-2">
                      <Lightbulb className="w-5 h-5 text-yellow-500" />
                      Explanation
                    </h3>
                    <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {solution.explanation}
                    </p>
                  </div>
                )}

                {/* Code */}
                <div className="px-6 py-4">
                  <h3 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
                    <Code2 className="w-5 h-5 text-blue-600" />
                    Code
                  </h3>
                  <div className="rounded-lg overflow-hidden border border-slate-200 bg-slate-900">
                    <pre className="p-6 overflow-x-auto">
                      <code className="text-sm text-slate-100 font-mono leading-relaxed">
                        {solution.solutionCode}
                      </code>
                    </pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
