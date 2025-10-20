"use client";
import MonacoEditor from "@monaco-editor/react";
interface EditorProps {
  height: string;
  width?: string;
  defaultLanguage: string;
  defaultValue: string;
}
export default function Editor(
  { height, width, defaultLanguage, defaultValue }: EditorProps = {
    height: "100vh",
    width: "100%",
    defaultLanguage: "javascript",
    defaultValue: "console.log('Hello, world!');",
  }
) {
  return (
    <MonacoEditor
      height={height}
      width={width}
      defaultLanguage={defaultLanguage}
      defaultValue={defaultValue}
      theme="vs-dark"
      options={{
        minimap: {
          enabled: false,
        },
      }}
    />
  );
}
