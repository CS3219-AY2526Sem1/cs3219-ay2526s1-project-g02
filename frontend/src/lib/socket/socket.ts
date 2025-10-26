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

// What the backend will send to us
interface ServerToClientEvents {
    matchFound: (data: MatchFoundData) => void;
    requestExpired: (data: RequestExpiredData) => void;
}

const SOCKET_URL = process.env.NEXT_PUBLIC_MATCHING_WS_URL || 'http://localhost:4003';
const SOCKET_NAMESPACE = process.env.NEXT_PUBLIC_MATCHING_WS_NAMESPACE || 'match';
const FULL_SOCKET_URL = `${SOCKET_URL}/${SOCKET_NAMESPACE}`;

export const socket: Socket<ServerToClientEvents> = io(FULL_SOCKET_URL, {
    autoConnect: false,
    // TODO: Add auth logic here if needed
});

socket.on("connect", () => {
    console.log("Connected to matching service WebSocket:", socket.id);
});

socket.on("disconnect", () => {
    console.log("Disconnected from matching service WebSocket.");
});