export interface WebSocketMessage {
  type: string;
  payload?: any;
}

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectInterval: number = 5000;
  private maxReconnectInterval: number = 30000;
  private currentReconnectInterval: number = 5000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private messageHandlers: ((message: WebSocketMessage) => void)[] = [];
  private intentionalClose: boolean = false;
  private isConnecting: boolean = false;

  constructor(url: string) {
    this.url = url;
  }

  connect() {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.intentionalClose = false;
    this.isConnecting = true;

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('[WS] Connected');
        this.isConnecting = false;
        this.currentReconnectInterval = this.reconnectInterval;
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.messageHandlers.forEach(handler => handler(message));
        } catch (error) {
          // silently ignore parse errors
        }
      };

      this.ws.onerror = () => {
        // suppress console error — reconnect will handle recovery
        this.isConnecting = false;
      };

      this.ws.onclose = () => {
        this.isConnecting = false;
        if (!this.intentionalClose) {
          this.scheduleReconnect();
        }
      };
    } catch (error) {
      this.isConnecting = false;
      if (!this.intentionalClose) {
        this.scheduleReconnect();
      }
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer || this.intentionalClose) return;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.intentionalClose) {
        this.connect();
      }
    }, this.currentReconnectInterval);

    // Exponential backoff: 5s → 10s → 20s → 30s (max)
    this.currentReconnectInterval = Math.min(
      this.currentReconnectInterval * 2,
      this.maxReconnectInterval
    );
  }

  disconnect() {
    this.intentionalClose = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  send(message: WebSocketMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  onMessage(handler: (message: WebSocketMessage) => void) {
    this.messageHandlers.push(handler);
  }

  removeMessageHandler(handler: (message: WebSocketMessage) => void) {
    this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
  }
}
