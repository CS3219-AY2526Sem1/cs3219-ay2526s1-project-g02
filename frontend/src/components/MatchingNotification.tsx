import { MatchStatus } from "@/constants/types";

type Notification = {
    message: string;
    status: MatchStatus;
}

interface MatchingNotificationProps {
    notification: Notification | null;
    dismissNotification: () => void;
}

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

export default function MatchingNotification({ notification, dismissNotification }: MatchingNotificationProps) {
    if (!notification) return null;

    return (
        <div className={`p-3 mb-6 rounded-lg text-sm font-medium flex items-center justify-between ${getNotificationColorClasses(notification.status)}`}>
            {/* Message Content */}
            <span>{notification.message}</span>

            {/* Close Button */}
            <button
                onClick={dismissNotification}
                className="ml-4 p-1 rounded-full hover:bg-white hover:bg-opacity-20 transition-colors duration-150"
                aria-label="Close notification"
            >
                {/* 'X' to dismiss */}
                <span className="font-bold text-lg leading-none">&times;</span>
            </button>
        </div>
    )
}