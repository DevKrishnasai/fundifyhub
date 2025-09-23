import express from "express";
import { createLogger } from "@fundifyhub/logger";
import { appConfig, validateConfig } from "@fundifyhub/utils";

// Create simple logger instance
const logger = createLogger({ serviceName: 'main-backend' });

// Validate environment configuration on startup
logger.info('Starting application...');
validateConfig();
logger.info('Environment configuration validated');

const app = express();
const PORT = appConfig.services.api.port;

app.use(express.json());

app.get("/", (req, res) => {
  logger.info(`GET / - Processing request`);
  res.json({ message: "API is working 🚀" });
  logger.info("GET / - Response sent successfully");
});

app.get("/health", (req, res) => {
  logger.info("GET /health - Health check requested");
  const healthData = { 
    status: "healthy", 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  };
  res.json(healthData);
  logger.info(`GET /health - Health check completed (uptime: ${Math.floor(healthData.uptime)}s)`);
});

// Error handling middleware
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error(`Unhandled error on ${req.method} ${req.url}`, error);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

app.listen(PORT, () => {
  logger.info(`API Backend running on http://localhost:${PORT}`);
});