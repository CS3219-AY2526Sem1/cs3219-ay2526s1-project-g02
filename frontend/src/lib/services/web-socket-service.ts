import { MonacoBinding } from "y-monaco";
import { WebsocketProvider } from "y-websocket";    
import * as Y from "yjs";
import { editor } from "monaco-editor";

export class WebSocketService {
  private provider: WebsocketProvider;

  constructor(url: string, sessionId: string) {
    this.provider = new WebsocketProvider(url, sessionId, this.createDocument());
  }

  public connect() {
    this.provider.connect();
  }

  public disconnect() {
    this.provider.disconnect();
  }

  public destroy() {
    this.provider.destroy();
  }

  public createDocument() {
    return new Y.Doc();
  }

  public bindToEditor(editor: editor.IStandaloneCodeEditor) {
    const model = editor.getModel();
    if (!model) {
      throw new Error("Editor model not found");
    }
    const monacoBinding = new MonacoBinding(
      this.provider.doc.getText("monaco"),
      model,
      new Set([editor]),
      this.provider.awareness
    );
    return monacoBinding;
  }
}