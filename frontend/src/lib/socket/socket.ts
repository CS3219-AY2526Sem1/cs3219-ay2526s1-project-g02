import { io, Socket } from "socket.io-client";

// Web Socket Event (listen on: matchFound)
export interface MatchFoundData {
    matchId: string;
    matchedUserId: string;
}

// Web Socket Event (listen on: requestExpired)
export interface RequestExpiredData {
    requestId: string;
    message: string;
}

// Web Socket Event (listen on: sessionStarted)
export interface SessionStartedData {
    matchId: string;
    sessionId: string;
}

// What the backend will send to us
interface ServerToClientEvents {
    matchFound: (data: MatchFoundData) => void;
    requestExpired: (data: RequestExpiredData) => void;
    sessionStarted: (data: SessionStartedData) => void;
}

const SOCKET_URL = process.env.NEXT_PUBLIC_MATCHING_SERVICE_URL || 'http://localhost:4003';
const SOCKET_NAMESPACE = 'match';
const FULL_SOCKET_URL = `${SOCKET_URL}/${SOCKET_NAMESPACE}`;

export const matchingSocket: Socket<ServerToClientEvents> = io(FULL_SOCKET_URL, {
    autoConnect: false,
    // TODO: Add auth logic here if needed
});

matchingSocket.on("connect", () => {
    console.log("Connected to matching service WebSocket:", matchingSocket.id);
});

matchingSocket.on("disconnect", () => {
    console.log("Disconnected from matching service WebSocket.");
});
