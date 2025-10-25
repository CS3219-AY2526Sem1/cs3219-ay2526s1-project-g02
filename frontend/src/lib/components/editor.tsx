"use client";
import { useEffect, useRef, useState } from "react";
import MonacoEditor, { OnMount } from "@monaco-editor/react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { MonacoBinding } from "y-monaco";
import type { editor } from "monaco-editor";

interface EditorProps {
  height: string;
  width?: string;
  defaultLanguage: string;
  defaultValue?: string;
  sessionId: string;
  wsUrl?: string;
}

export default function Editor({
  height = "100vh",
  width = "100%",
  defaultLanguage = "javascript",
  defaultValue = "",
  sessionId,
  wsUrl = "ws://localhost:1234",
}: EditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);
  const [binding, setBinding] = useState<MonacoBinding | null>(null);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Create Y.js document
    const ydoc = new Y.Doc();
    const ytext = ydoc.getText("monaco");

    // Connect to Y.js WebSocket server
    const wsProvider = new WebsocketProvider(wsUrl, sessionId, ydoc, {
      connect: true,
    });

    wsProvider.on("status", (event: { status: string }) => {
      console.log("WebSocket status:", event.status);
    });

    wsProvider.on("sync", (isSynced: boolean) => {
      console.log("Document synced:", isSynced);
    });

    // Create Monaco binding
    const monacoBinding = new MonacoBinding(
      ytext,
      editor.getModel()!,
      new Set([editor]),
      wsProvider.awareness
    );

    setProvider(wsProvider);
    setBinding(monacoBinding);
  };

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      binding?.destroy();
      provider?.destroy();
    };
  }, [binding, provider]);

  return (
    <MonacoEditor
      height={height}
      width={width}
      defaultLanguage={defaultLanguage}
      defaultValue={defaultValue}
      theme="vs-dark"
      onMount={handleEditorDidMount}
      options={{
        minimap: {
          enabled: false,
        },
      }}
    />
  );
}
