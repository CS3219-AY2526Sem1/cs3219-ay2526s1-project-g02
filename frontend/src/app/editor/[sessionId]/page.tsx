"use client";
import { useState } from "react";
import Editor from "@/lib/components/editor";
import { useParams } from "next/navigation";

export default function EditorPage() {
  const { sessionId: sessionIdParam } = useParams();
  const [sessionId] = useState(sessionIdParam as string);

  return (
    <div>
      <h1>Collaborative Editor</h1>
      <p>Session ID: {sessionId}</p>
      <Editor
        height={"90vh"}
        defaultLanguage="javascript"
        sessionId={sessionId}
        wsUrl="ws://localhost:1234"
      />
    </div>
  );
}
