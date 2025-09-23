import WebSocket, { WebSocketServer } from "ws";
import { createLogger } from "@fundifyhub/logger";
import { appConfig, validateConfig } from "@fundifyhub/utils";

// Create simple logger instance
const logger = createLogger({ serviceName: 'live-sockets' });

// Validate environment configuration on startup
logger.info('Initializing WebSocket server...');
validateConfig();
logger.info('Environment configuration validated');

const PORT = appConfig.services.websocket.port;
let connectionCount = 0;

const wss = new WebSocketServer({ port: Number(PORT) });

wss.on("connection", (ws: WebSocket, req: any) => {
  connectionCount++;
  const connectionId = Math.random().toString(36).substring(7);
  
  logger.info(`New WebSocket connection ${connectionId} from ${req.socket.remoteAddress} (total: ${connectionCount})`);

  ws.on("message", (message: Buffer) => {
    const data = message.toString();
    logger.debug(`Message received from ${connectionId}: ${data.substring(0, 50)}${data.length > 50 ? '...' : ''}`);
    
    // Echo the message back
    ws.send(`Echo: ${data}`);
  });

  ws.on("close", (code: number, reason: Buffer) => {
    connectionCount--;
    logger.info(`WebSocket connection ${connectionId} closed (code: ${code}, remaining: ${connectionCount})`);
  });

  ws.on("error", (error: Error) => {
    logger.error(`WebSocket connection ${connectionId} error`, error);
  });

  // Send welcome message
  const welcomeMessage = {
    type: 'welcome',
    message: 'Welcome to FundifyHub WebSocket server!',
    connectionId,
    timestamp: new Date().toISOString()
  };
  
  ws.send(JSON.stringify(welcomeMessage));
  logger.info(`Welcome message sent to connection ${connectionId}`);
});

wss.on("error", (error: Error) => {
  logger.error("WebSocket server error", error);
});

process.on('SIGINT', () => {
  logger.info('Gracefully shutting down WebSocket server...');
  wss.close(() => {
    logger.info('WebSocket server shut down successfully');
    process.exit(0);
  });
});

logger.info(`WebSocket server running on ws://localhost:${PORT}`);