"use client";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface QuestionExplanationProps {
  questionId: string;
}

interface ExplanationResponse {
  questionId: string;
  explanation: string;
  analysis: {
    keyconcepts: string[];
    approaches: string[];
    hints: string[];
    complexity: string;
  };
  timestamp: string;
}

export function QuestionExplanation({ questionId }: QuestionExplanationProps) {
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState<ExplanationResponse | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  const handleGetExplanation = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${
          process.env.NEXT_PUBLIC_LLM_SERVICE_URL || "http://localhost:4005"
        }/llm/explain-question`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ questionId }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to get explanation");
      }

      const data = await response.json();
      setExplanation(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 border-t pt-4 ">
      <button
        onClick={handleGetExplanation}
        disabled={loading}
        className="w-full px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg hover:from-cyan-700 hover:to-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
      >
        {loading ? "Generating Explanation..." : "Get AI Explanation"}
      </button>

      {loading && (
        <div className="mt-4 flex items-center justify-center">
          <div className="h-8 w-8 rounded-full border-4 border-gray-300 border-t-blue-500 animate-spin" />
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {explanation && !loading && (
        <div className="mt-4 space-y-4 overflow-y-auto max-h-[500px] flex flex-col gap-4">
          {/* Main Explanation */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Explanation</h3>
            <div className="text-sm text-blue-800 leading-relaxed prose prose-sm max-w-none prose-headings:text-blue-900 prose-p:text-blue-800 prose-strong:text-blue-900 prose-code:text-blue-900 prose-code:bg-blue-100 prose-pre:bg-blue-100 prose-pre:text-blue-900">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {explanation.explanation}
              </ReactMarkdown>
            </div>
          </div>

          {/* Key Concepts */}
          {explanation.analysis.keyconcepts &&
            explanation.analysis.keyconcepts.length > 0 && (
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <h3 className="font-semibold text-purple-900 mb-2">
                  Key Concepts
                </h3>
                <div className="space-y-2">
                  {explanation.analysis.keyconcepts.map((concept, index) => (
                    <div
                      key={index}
                      className="text-sm text-purple-800 prose prose-sm max-w-none prose-headings:text-purple-900 prose-p:text-purple-800 prose-strong:text-purple-900 prose-code:text-purple-900 prose-code:bg-purple-100 prose-pre:bg-purple-100 prose-pre:text-purple-900"
                    >
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {concept}
                      </ReactMarkdown>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Approaches */}
          {explanation.analysis.approaches &&
            explanation.analysis.approaches.length > 0 && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-2">
                  Possible Approaches
                </h3>
                <div className="space-y-2">
                  {explanation.analysis.approaches.map((approach, index) => (
                    <div
                      key={index}
                      className="text-sm text-green-800 prose prose-sm max-w-none prose-headings:text-green-900 prose-p:text-green-800 prose-strong:text-green-900 prose-code:text-green-900 prose-code:bg-green-100 prose-pre:bg-green-100 prose-pre:text-green-900"
                    >
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {approach}
                      </ReactMarkdown>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Hints */}
          {explanation.analysis.hints &&
            explanation.analysis.hints.length > 0 && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h3 className="font-semibold text-yellow-900 mb-2">Hints</h3>
                <div className="space-y-2">
                  {explanation.analysis.hints.map((hint, index) => (
                    <div
                      key={index}
                      className="text-sm text-yellow-800 prose prose-sm max-w-none prose-headings:text-yellow-900 prose-p:text-yellow-800 prose-strong:text-yellow-900 prose-code:text-yellow-900 prose-code:bg-yellow-100 prose-pre:bg-yellow-100 prose-pre:text-yellow-900"
                    >
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {hint}
                      </ReactMarkdown>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Complexity */}
          {explanation.analysis.complexity && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">
                Time Complexity
              </h3>
              <div className="text-sm text-gray-800 prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-800 prose-strong:text-gray-900 prose-code:text-gray-900 prose-code:bg-gray-100 prose-pre:bg-gray-100 prose-pre:text-gray-900">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {explanation.analysis.complexity}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
