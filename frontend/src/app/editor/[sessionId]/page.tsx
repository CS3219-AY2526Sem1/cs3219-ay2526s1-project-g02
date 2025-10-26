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

  // Initialize WebSocketService only on client side
  useEffect(() => {
    const service = new WebSocketService(
      process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:1234",
      sessionId
    );
    setWebSocketService(service);

    return () => {
      service.destroy();
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
