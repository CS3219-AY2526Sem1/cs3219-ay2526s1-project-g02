import { WebSocketServer, WebSocket } from 'ws';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import { CollaborationService } from './collaboration.service';

const messageSync = 0;
const messageAwareness = 1;

/**
 * YjsServer - WebSocket server for real-time collaborative editing using Yjs
 * 
 * WRITE POLICY (Efficient Supabase Persistence):
 * ================================================
 * To minimize database writes while ensuring data durability, documents are saved to Supabase:
 * 
 * 1. **On Last User Disconnect**: When the last user disconnects from a session, the document 
 *    is immediately saved to prevent data loss.
 * 
 * 2. **Debounced Autosave**: Changes trigger a debounced save (5 seconds after last edit).
 *    This provides crash recovery without excessive writes during active editing.
 * 
 * 3. **On Session Termination**: When a session is explicitly ended via endSession mutation,
 *    the document is saved before the session status is updated.
 * 
 * 4. **On Server Shutdown**: All active documents are saved when the server closes gracefully.
 * 
 * The document is marked as "dirty" when updated and only saved if there are unsaved changes.
 */
export class YjsServer {
  private wss: WebSocketServer;
  private documents: Map<string, Y.Doc> = new Map();
  private awareness: Map<string, awarenessProtocol.Awareness> = new Map();
  private connections: Map<string, Set<WebSocket>> = new Map(); // Track connections per session
  private saveTimers: Map<string, NodeJS.Timeout> = new Map(); // Debounce timers
  private isDirty: Map<string, boolean> = new Map(); // Track if document has unsaved changes
  private collaborationService: CollaborationService;

  constructor(port: number, collaborationService: CollaborationService) {
    this.wss = new WebSocketServer({ port });
    this.collaborationService = collaborationService;
    console.log(`Y.js WebSocket server running on port ${port}`);

    this.wss.on('connection', async (conn: WebSocket, req) => {
      const sessionId = req.url?.slice(1);
      if (!sessionId) {
        conn.close();
        return;
      }

      // Get or create document, ensuring data is loaded before proceeding
      let doc = this.documents.get(sessionId);
      if (!doc) {
        doc = await this.createSessionDocument(sessionId);
      }
      
      const awareness = this.awareness.get(sessionId) || this.createAwareness(sessionId, doc);
      
      // Track this connection
      if (!this.connections.has(sessionId)) {
        this.connections.set(sessionId, new Set());
      }
      this.connections.get(sessionId)!.add(conn);

      // Send sync step 1
      const encoderSync = encoding.createEncoder();
      encoding.writeVarUint(encoderSync, messageSync);
      syncProtocol.writeSyncStep1(encoderSync, doc);
      conn.send(encoding.toUint8Array(encoderSync), { binary: true });

      // Broadcast awareness states
      const awarenessStates = awareness.getStates();
      if (awarenessStates.size > 0) {
        const encoderAwareness = encoding.createEncoder();
        encoding.writeVarUint(encoderAwareness, messageAwareness);
        encoding.writeVarUint8Array(
          encoderAwareness,
          awarenessProtocol.encodeAwarenessUpdate(awareness, Array.from(awarenessStates.keys()))
        );
        conn.send(encoding.toUint8Array(encoderAwareness), { binary: true });
      }

      // Listen for document updates and broadcast to other clients
      const updateHandler = (update: Uint8Array, origin: any) => {
        if (origin !== conn) {
          const encoder = encoding.createEncoder();
          encoding.writeVarUint(encoder, messageSync);
          syncProtocol.writeUpdate(encoder, update);
          conn.send(encoding.toUint8Array(encoder), { binary: true });
        }
        
        // Mark document as dirty and schedule a debounced save
        this.isDirty.set(sessionId, true);
        this.scheduleDebouncedSave(sessionId);
      };
      doc.on('update', updateHandler);

      // Listen for awareness updates
      const awarenessUpdateHandler = ({ added, updated, removed }: any, origin: any) => {
        const changedClients = added.concat(updated).concat(removed);
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, messageAwareness);
        encoding.writeVarUint8Array(
          encoder,
          awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients)
        );
        conn.send(encoding.toUint8Array(encoder), { binary: true });
      };
      awareness.on('update', awarenessUpdateHandler);

      conn.on('message', (message: Buffer) => {
        try {
          const decoder = decoding.createDecoder(message);
          const messageType = decoding.readVarUint(decoder);

          if (messageType === messageSync) {
            const encoder = encoding.createEncoder();
            encoding.writeVarUint(encoder, messageSync);
            const syncMessageType = syncProtocol.readSyncMessage(decoder, encoder, doc, null);
            if (encoding.length(encoder) > 1) {
              conn.send(encoding.toUint8Array(encoder), { binary: true });
            }
          } else if (messageType === messageAwareness) {
            awarenessProtocol.applyAwarenessUpdate(
              awareness,
              decoding.readVarUint8Array(decoder),
              conn
            );
          }
        } catch (err) {
          console.error('Error handling message:', err);
        }
      });

      conn.on('close', async () => {
        doc.off('update', updateHandler);
        awareness.off('update', awarenessUpdateHandler);
        awarenessProtocol.removeAwarenessStates(awareness, [doc.clientID], null);
        
        // Remove this connection
        const sessionConnections = this.connections.get(sessionId);
        if (sessionConnections) {
          sessionConnections.delete(conn);
          
          // If this was the last connection, save the document to Supabase
          if (sessionConnections.size === 0) {
            console.log(`Last user disconnected from session ${sessionId}, saving to Supabase`);
            await this.saveDocumentToSupabase(sessionId);
            this.connections.delete(sessionId);
            
            // Clear any pending save timers
            const timer = this.saveTimers.get(sessionId);
            if (timer) {
              clearTimeout(timer);
              this.saveTimers.delete(sessionId);
            }
          }
        }
      });
    });

    this.wss.on('error', (error) => {
      console.error('Y.js WebSocket server error:', error);
    });
  }

  private createAwareness(sessionId: string, doc: Y.Doc): awarenessProtocol.Awareness {
    const awareness = new awarenessProtocol.Awareness(doc);
    this.awareness.set(sessionId, awareness);
    return awareness;
  }

  /**
   * Schedule a debounced save to Supabase
   * Saves will only happen 5 seconds after the last update
   */
  private scheduleDebouncedSave(sessionId: string) {
    // Clear existing timer
    const existingTimer = this.saveTimers.get(sessionId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Schedule new save after 5 seconds of inactivity
    const timer = setTimeout(async () => {
      await this.saveDocumentToSupabase(sessionId);
      this.saveTimers.delete(sessionId);
    }, 5000);

    this.saveTimers.set(sessionId, timer);
  }

  /**
   * Extract code content from a Yjs document
   */
  private extractCodeFromDocument(doc: Y.Doc): string {
    const yText = doc.getText('monaco');
    return yText.toString();
  }

  /**
   * Save the current document state to Supabase
   */
  private async saveDocumentToSupabase(sessionId: string): Promise<void> {
    const doc = this.documents.get(sessionId);
    if (!doc || !this.isDirty.get(sessionId)) {
      return; // Nothing to save
    }

    try {
      const code = this.extractCodeFromDocument(doc);
      await this.collaborationService.updateCode(sessionId, code);
      this.isDirty.set(sessionId, false);
      console.log(`Saved document for session ${sessionId} to Supabase (${code.length} chars)`);
    } catch (error) {
      console.error(`Failed to save document for session ${sessionId}:`, error);
    }
  }

  /**
   * Create a new YJS document for a session
   * Loads existing code from Supabase before returning
   */
  async createSessionDocument(sessionId: string): Promise<Y.Doc> {
    if (this.documents.has(sessionId)) {
      console.log(`YJS document already exists for session ${sessionId}`);
      return this.documents.get(sessionId)!;
    }

    const doc = new Y.Doc();
    this.documents.set(sessionId, doc);
    console.log(`Created YJS document for session ${sessionId}`);
    
    // Load existing session data before returning
    await this.loadSessionData(sessionId, doc);
    
    return doc;
  }

  /**
   * Load existing session data from Supabase and initialize the Yjs document
   */
  private async loadSessionData(sessionId: string, doc: Y.Doc): Promise<void> {
    try {
      const session = await this.collaborationService.getSession(sessionId);
      if (session?.code) {
        const yText = doc.getText('monaco');
        // Only initialize if the document is empty
        if (yText.length === 0) {
          yText.insert(0, session.code);
          console.log(`Loaded existing code for session ${sessionId} (${session.code.length} chars)`);
        }
      }
    } catch (error) {
      console.error(`Failed to load session data for ${sessionId}:`, error);
    }
  }

  /**
   * Get an existing YJS document
   */
  getSessionDocument(sessionId: string): Y.Doc | undefined {
    return this.documents.get(sessionId);
  }

  /**
   * Manually trigger a save for a session
   * Useful for explicit save operations (e.g., before ending a session)
   */
  async saveSession(sessionId: string): Promise<void> {
    await this.saveDocumentToSupabase(sessionId);
  }

  /**
   * Remove a YJS document (saves to Supabase first)
   */
  async removeSessionDocument(sessionId: string): Promise<boolean> {
    const doc = this.documents.get(sessionId);
    const awareness = this.awareness.get(sessionId);
    
    if (doc) {
      // Save before removing
      await this.saveDocumentToSupabase(sessionId);
      
      doc.destroy();
      this.documents.delete(sessionId);
      
      if (awareness) {
        awareness.destroy();
        this.awareness.delete(sessionId);
      }
      
      // Clean up tracking data
      this.connections.delete(sessionId);
      this.isDirty.delete(sessionId);
      
      const timer = this.saveTimers.get(sessionId);
      if (timer) {
        clearTimeout(timer);
        this.saveTimers.delete(sessionId);
      }
      
      console.log(`Removed YJS document for session ${sessionId}`);
      return true;
    }
    return false;
  }

  async close() {
    // Save all documents before closing
    const savePromises: Promise<void>[] = [];
    for (const sessionId of this.documents.keys()) {
      savePromises.push(this.saveDocumentToSupabase(sessionId));
    }
    await Promise.all(savePromises);
    
    // Clean up all documents and awareness
    for (const [sessionId, doc] of this.documents.entries()) {
      doc.destroy();
      console.log(`Destroyed YJS document for session ${sessionId}`);
    }
    for (const [sessionId, awareness] of this.awareness.entries()) {
      awareness.destroy();
      console.log(`Destroyed awareness for session ${sessionId}`);
    }
    
    // Clear all timers
    for (const timer of this.saveTimers.values()) {
      clearTimeout(timer);
    }
    
    this.documents.clear();
    this.awareness.clear();
    this.connections.clear();
    this.saveTimers.clear();
    this.isDirty.clear();
    this.wss.close();
  }
}

