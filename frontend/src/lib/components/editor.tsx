"use client";
import { useEffect, useRef, useState } from "react";
import MonacoEditor, { OnMount } from "@monaco-editor/react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { MonacoBinding } from "y-monaco";
import type { editor } from "monaco-editor";
import { WebSocketService } from "@/lib/services/web-socket-service";
interface EditorProps {
  height: string;
  webSocketService: WebSocketService;
  width?: string;
  defaultLanguage: string;
  defaultValue?: string;
}

export default function Editor({
  height = "100vh",
  width = "100%",
  defaultLanguage = "javascript",
  defaultValue = "",
  webSocketService,
}: EditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const [binding, setBinding] = useState<MonacoBinding | null>(null);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    if (!editor) throw new Error("Editor not found");
    if (!webSocketService) throw new Error("WebSocket service not provided");

    editorRef.current = editor;

    // Clean up existing binding before creating new one
    binding?.destroy();

    webSocketService.connect();
    const newBinding = webSocketService.bindToEditor(editor);
    if (!newBinding) throw new Error("Failed to bind to editor");

    setBinding(newBinding);
  };

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
