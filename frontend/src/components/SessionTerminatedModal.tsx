"use client";

interface SessionTerminatedModalProps {
  isOpen: boolean;
  onGoHome: () => void;
}

export function SessionTerminatedModal({
  isOpen,
  onGoHome,
}: SessionTerminatedModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onGoHome}
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
            Session Terminated
          </h2>
          <p className="text-gray-600 mb-6">
            The other user has terminated this session. You will be redirected
            to the home page.
          </p>
          <button
            onClick={onGoHome}
            className="w-full px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-lg hover:from-cyan-700 hover:to-blue-700 transition-colors"
          >
            Go Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
