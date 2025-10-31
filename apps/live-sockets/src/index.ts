import WebSocket, { WebSocketServer } from "ws";
import { createLogger } from "@fundifyhub/logger";
import { appConfig, validateConfig } from "@fundifyhub/utils";

const logger = createLogger({ serviceName: 'live-sockets' });

const contextLogger = logger.child('[startup]');
contextLogger.info('Initializing WebSocket server');
validateConfig();
contextLogger.info('Environment configuration validated');

const PORT = appConfig.services.websocket.port;
let connectionCount = 0;

const wss = new WebSocketServer({ port: Number(PORT) });

wss.on("connection", (ws: WebSocket, req: any) => {
  connectionCount++;
  const connectionId = Math.random().toString(36).substring(7);
  
  const connLogger = logger.child(`[conn-${connectionId}]`);
  connLogger.info(`Connected from ${req.socket.remoteAddress} (total: ${connectionCount})`);

  ws.on("message", (message: Buffer) => {
    const data = message.toString();
    ws.send(`Echo: ${data}`);
  });

  ws.on("close", (code: number, reason: Buffer) => {
    connectionCount--;
    connLogger.info(`Connection closed (code: ${code}, remaining: ${connectionCount})`);
  });

  ws.on("error", (error: Error) => {
    connLogger.error('Connection error', error);
  });

  const welcomeMessage = {
    type: 'welcome',
    message: 'Welcome to FundifyHub WebSocket server!',
    connectionId,
    timestamp: new Date().toISOString()
  };
  
  ws.send(JSON.stringify(welcomeMessage));
});

wss.on("error", (error: Error) => {
  const contextLogger = logger.child('[server]');
  contextLogger.error('Server error', error);
});

process.on('SIGINT', () => {
  const contextLogger = logger.child('[shutdown]');
  contextLogger.info('Gracefully shutting down');
  wss.close(() => {
    contextLogger.info('Shut down successfully');
    process.exit(0);
  });
});

const serverLogger = logger.child('[server]');
serverLogger.info(`Running on ws://localhost:${PORT}`);