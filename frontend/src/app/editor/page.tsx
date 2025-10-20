"use client";
import MonacoEditor from "@monaco-editor/react";

export default function EditorPage() {
  return (
    <div>
      <h1>Editor</h1>
      <MonacoEditor
        height={"100vh"}
        theme="vs-dark"
        defaultLanguage="javascript"
        defaultValue="console.log('Hello, world!');"
      />
    </div>
  );
}
