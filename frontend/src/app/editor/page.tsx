import Editor from "@/lib/components/editor";

export default function EditorPage() {
  return (
    <div>
      <h1>Editor</h1>
      <Editor
        height={"100vh"}
        defaultLanguage="javascript"
        defaultValue="console.log('Hello, world!');"
      />
    </div>
  );
}
