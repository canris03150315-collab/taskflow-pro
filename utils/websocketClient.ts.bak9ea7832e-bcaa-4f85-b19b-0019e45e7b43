export type WebSocketMessage = {
    type: string;
    payload: any;
};

export class WebSocketClient {
    private url: string;
    private ws: WebSocket | null = null;
    private messageHandlers: ((msg: WebSocketMessage) => void)[] = [];
    private reconnectInterval = 3000;

    constructor(url: string) {
        this.url = url;
    }

    async connect(token?: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const fullUrl = token ? `${this.url}?token=${token}` : this.url;
            this.ws = new WebSocket(fullUrl);

            this.ws.onopen = () => {
                console.log('WS Connected');
                resolve();
            };

            this.ws.onmessage = (event) => {
                try {
                    const parsed: WebSocketMessage = JSON.parse(event.data);
                    this.messageHandlers.forEach(h => h(parsed));
                } catch (e) {
                    console.error('WS Parse Error', e);
                }
            };

            this.ws.onclose = () => {
                console.log('WS Closed');
                setTimeout(() => this.connect(token), this.reconnectInterval);
            };

            this.ws.onerror = (err) => {
                console.error('WS Error', err);
                reject(err);
            };
        });
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    addMessageHandler(handler: (msg: WebSocketMessage) => void) {
        this.messageHandlers.push(handler);
    }

    removeMessageHandler(handler: (msg: WebSocketMessage) => void) {
        this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
    }

    sendMessage(type: string, payload: any) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type, payload }));
        }
    }
}
