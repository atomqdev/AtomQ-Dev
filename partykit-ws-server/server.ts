import type * as Party from 'partykit/server';
import QuizServer from './party/quiz';

export default class MainServer implements Party.Server {
  private quizHandlers: Map<string, QuizServer> = new Map();

  constructor(public room: Party.Room) {}

  /**
   * Route connections to appropriate room handlers
   */
  onConnect(connection: Party.Connection, ctx: Party.ConnectionContext): void {
    // The room name determines which handler to use
    const roomName = this.room.id;
    
    // For quiz rooms, delegate to QuizServer
    if (!this.quizHandlers.has(roomName)) {
      this.quizHandlers.set(roomName, new QuizServer(this.room));
    }
    
    const quizHandler = this.quizHandlers.get(roomName);
    if (quizHandler) {
      quizHandler.onConnect(connection, ctx);
      
      // Store handler reference for message routing
      (connection as any).handler = quizHandler;
    }
    
    console.log(`New connection to room: ${roomName}`);
  }

  /**
   * Route messages to appropriate handler
   */
  async onMessage(message: string, sender: Party.Connection): Promise<void> {
    const handler = (sender as any).handler;
    if (handler) {
      await handler.onMessage(message, sender);
    } else {
      console.log('No handler found for connection');
    }
  }

  /**
   * Route close events
   */
  onClose(connection: Party.Connection): void {
    const handler = (connection as any).handler;
    if (handler) {
      handler.onClose(connection);
    }
    
    // Clean up handler if no connections left
    const roomName = this.room.id;
    // Note: PartyKit might have a different way to get connections count
    // This is a simplified version
    setTimeout(() => {
      if (this.quizHandlers.has(roomName)) {
        // Check if there are any active connections for this room
        // You might need to implement this check differently based on PartyKit's API
        this.quizHandlers.delete(roomName);
        console.log(`Cleaned up handler for room: ${roomName}`);
      }
    }, 5000); // Delay cleanup to allow reconnections
  }

  /**
   * Handle room removal
   */
  onRemove(): void {
    console.log(`Room ${this.room.id} is being removed`);
    // Clean up all handlers for this room
    this.quizHandlers.forEach(handler => {
      if (handler) {
        // Call any cleanup method if needed
        (handler as any).onRemove?.();
      }
    });
    this.quizHandlers.clear();
  }
}