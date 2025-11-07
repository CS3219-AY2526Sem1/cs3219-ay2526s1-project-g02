import { MonacoBinding } from "y-monaco";
import { WebsocketProvider } from "y-websocket";    
import * as Y from "yjs";
import type { editor } from "monaco-editor";

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: number;
}

export class WebSocketService {
  private provider: WebsocketProvider;
  private binding: MonacoBinding | null = null;
  private document: Y.Doc;
  private isSynced: boolean = false;
  
  constructor(url: string, sessionId: string) {
    this.document = this.createDocument();
    this.provider = new WebsocketProvider(url, sessionId, this.document);
  }
  

  public connect() {
    this.provider.connect();
  }

  public disconnect() {
    this.provider.disconnect();
  }

  public destroy() {
    this.disconnect();
    this.provider.destroy();
    this.document.destroy();
    this.destroyBinding();
  }

  public createDocument() {
    return new Y.Doc();
  }

  public onStatusChange(callback: (isConnected: boolean) => void) {
    this.provider.on("status", (event: {status: string}) => {
      callback(event.status === "connected");
    });
  }

  public onSync(callback: (isSynced: boolean) => void) {
    this.provider.on("sync", (isSynced: boolean) => {
      if (isSynced) {
        this.isSynced = true;
      }
      callback(isSynced);
    });
  }

  public waitForSync(): Promise<void> {
    return new Promise((resolve) => {
      if (this.isSynced) {
        resolve();
        return;
      }
      const handler = (synced: boolean) => {
        if (synced) {
          this.isSynced = true;
          this.provider.off("sync", handler);
          resolve();
        }
      };
      this.provider.on("sync", handler);
    });
  }

  public onConnectionError(callback: (event: Event) => void) {
    this.provider.on("connection-error", (event: Event) => {
      callback(event);
    });
  }

  public onConnectionClosed(callback: () => void) {
    this.provider.on("connection-close", () => {
      callback();
    });
  }

  public bindToEditor(editor: editor.IStandaloneCodeEditor) {
    const model = editor.getModel();
    if (!model) {
      throw new Error("Editor model not found");
    }
    const monacoBinding = new MonacoBinding(
      this.document.getText("monaco"),
      model,
      new Set([editor]),
      this.provider.awareness
    );

    this.binding = monacoBinding;
    return monacoBinding;
  }

  public destroyBinding() {
    this.binding?.destroy();
    this.binding = null;
  }

  public setLocalState(state: any) {
    // Set local awareness state (shared with other clients)
    this.provider.awareness.setLocalState(state);
  }

  public getAwareness() {
    return this.provider.awareness;
  }

  public onAwarenessChange(callback: (states: Map<number, any>) => void) {
    this.provider.awareness.on("change", () => {
      callback(this.provider.awareness.getStates());
    });
  }

  public broadcastSessionEvent(event: { type: string; data: any }) {
    // Broadcast session-level event through awareness
    const currentState = this.provider.awareness.getLocalState() || {};
    this.setLocalState({
      ...currentState,
      sessionEvent: {
        ...event,
        timestamp: Date.now(),
      },
    });
  }

  public getCurrentCode(): string {
    // Get current code from Y.js document
    return this.document.getText("monaco").toString();
  }

  /**
   * Get the chat messages array from Yjs document
   */
  public getChatMessages(): Y.Array<ChatMessage> {
    return this.document.getArray<ChatMessage>("chat");
  }

  /**
   * Send a chat message
   */
  public sendChatMessage(userId: string, userName: string, content: string) {
    const chat = this.getChatMessages();
    const message: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      userId,
      userName,
      content,
      timestamp: Date.now(),
    };
    chat.push([message]);
  }

  /**
   * Listen for chat message changes
   */
  public onChatChange(callback: (messages: ChatMessage[]) => void) {
    const chat = this.getChatMessages();
    const handler = () => {
      callback(chat.toArray());
    };
    chat.observe(handler);
    // Return initial state
    callback(chat.toArray());
    return () => chat.unobserve(handler);
  }
}