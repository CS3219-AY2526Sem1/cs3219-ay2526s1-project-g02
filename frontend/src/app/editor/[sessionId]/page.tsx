"use client";
import { useState, useEffect } from "react";
import Editor from "@/lib/components/editor";
import { useParams } from "next/navigation";
import { WebSocketService } from "@/lib/services/web-socket-service";

export default function EditorPage() {
  const { sessionId: sessionIdParam } = useParams();
  const [sessionId] = useState(sessionIdParam as string);
  const [webSocketService, setWebSocketService] =
    useState<WebSocketService | null>(null);

  const onStatusChange = (isConnected: boolean) => {
    const _message = isConnected
      ? "🌎 Connected to server!"
      : "🔴 Connection closed";
    console.log(_message);
  };

  const handleOnSync = (isSynced: boolean) => {
    console.log("🔄 Synced: ", isSynced);
  };

  const handleOnConnectionError = (event: Event) => {
    console.log("❌ Connection error: ", event);
  };

  const handleOnConnectionClosed = () => {
    console.log("🔴 Connection closed");
  };

  // Initialize WebSocketService only on client side
  useEffect(() => {
    const initWebSocket = async () => {
      // Import WebSocketService on client side because it utilises browser APIs and NextJS is using SSR
      const { WebSocketService } = await import(
        "@/lib/services/web-socket-service"
      );
      const WS_URL = process.env.NEXT_PUBLIC_WS_URL;
      if (!WS_URL) throw new Error("NEXT_PUBLIC_WS_URL is not set");
      const service = new WebSocketService(WS_URL, sessionId);
      setWebSocketService(service);
      service.onStatusChange(onStatusChange);
      service.onSync(handleOnSync);
      service.onConnectionError(handleOnConnectionError);
      service.onConnectionClosed(handleOnConnectionClosed);
    };

    initWebSocket();

    return () => {
      webSocketService?.destroy();
    };
  }, [sessionId]);

  return webSocketService ? (
    <div>
      <h1>Collaborative Editor</h1>
      <p>Session ID: {sessionId}</p>
      <Editor
        height={"90vh"}
        defaultLanguage="javascript"
        webSocketService={webSocketService}
      />
    </div>
  ) : (
    <div>Loading...</div>
  );
}
