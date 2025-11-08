import { Button } from "./ui/button";
import { DifficultyBadge } from "./ui";

interface Question {
  id: string;
  title: string;
  difficulty: string;
  category: string[];
  description?: string;
}

interface SelectionStatusModalProps {
  status: "waiting" | "complete" | "timeout";
  finalQuestion?: Question | null;
  onNavigate?: () => void;
  timeoutMessage?: string;
}

export function SelectionStatusModal({
  status,
  finalQuestion,
  onNavigate,
  timeoutMessage,
}: SelectionStatusModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative z-10 w-full max-w-lg mx-4">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-white/50">
          {/* Waiting State */}
          {status === "waiting" && (
            <div className="text-center">
              <div className="mb-6">
                <div className="w-20 h-20 mx-auto bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center animate-pulse">
                  <svg
                    className="w-10 h-10 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                </div>
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-3">
                Waiting for Partner
              </h2>
              <p className="text-lg text-slate-600 mb-4">
                Your partner is still making their selection...
              </p>
              <div className="flex justify-center gap-2 mt-6">
                <span className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce delay-75" />
                <span className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce delay-150" />
              </div>
            </div>
          )}

          {/* Complete State */}
          {status === "complete" && finalQuestion && (
            <div className="text-center">
              <div className="mb-6">
                <div className="w-20 h-20 mx-auto bg-gradient-to-r from-emerald-500 to-green-500 rounded-full flex items-center justify-center">
                  <svg
                    className="w-10 h-10 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-3">
                Question Selected!
              </h2>
              <p className="text-lg text-slate-600 mb-6">
                Here's the challenge you'll be solving together:
              </p>

              {/* Question Card */}
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-6 mb-6 text-left border border-slate-200">
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  {finalQuestion.title}
                </h3>
                <div className="flex items-center gap-3 mb-3">
                  <DifficultyBadge difficulty={finalQuestion.difficulty} />
                </div>
                <p className="text-sm text-slate-600">
                  Topics: {finalQuestion.category.join(", ")}
                </p>
              </div>

              <Button
                onClick={onNavigate}
                className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold py-3 rounded-xl hover:shadow-xl hover:shadow-cyan-500/25 transition-all duration-300"
              >
                Start Coding Session
              </Button>
            </div>
          )}

          {/* Timeout State */}
          {status === "timeout" && (
            <div className="text-center">
              <div className="mb-6">
                <div className="w-20 h-20 mx-auto bg-gradient-to-r from-amber-500 to-orange-500 rounded-full flex items-center justify-center">
                  <svg
                    className="w-10 h-10 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-3">
                Selection Timeout
              </h2>
              <p className="text-lg text-slate-600 mb-6">
                {timeoutMessage ||
                  "Your partner didn't make a selection in time. Returning to matching page..."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
