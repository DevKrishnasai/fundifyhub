import express from "express";
import cors from "cors";
import { createLogger } from "@fundifyhub/logger";
import { appConfig, validateConfig } from "@fundifyhub/utils";
import { 
  getDashboardStats, 
  getUsers, 
  getPayments, 
  getUserById, 
  getDatabaseHealth 
} from "./data-service";

// Create simple logger instance
const logger = createLogger({ serviceName: 'main-backend' });

// Validate environment configuration on startup
logger.info('🚀 Starting application...');
validateConfig();
logger.info('✅ Environment configuration validated');

const app = express();
const PORT = appConfig.services.api.port;

// Enable CORS for frontend communication using centralized environment URLs
const allowedOrigins = [
  process.env.FRONTEND_URL || "http://localhost:3000",
  process.env.FRONTEND_URL_ALT || "http://127.0.0.1:3000",
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001", // For API calls from frontend
  // Add production URLs when available
  ...(process.env.NODE_ENV === 'production' 
    ? [process.env.PRODUCTION_FRONTEND_URL].filter(Boolean) 
    : [])
].filter((url): url is string => Boolean(url));

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  exposedHeaders: ["X-Total-Count", "X-Page-Count"]
}));

logger.info(`🔗 CORS enabled for origins: ${allowedOrigins.join(', ')}`);

app.use(express.json());

app.get("/", (req, res) => {
  logger.info(`GET / - Processing request`);
  res.json({ 
    message: "FundifyHub API is working 🚀",
    version: "1.0.0",
    endpoints: {
      health: "/health",
      database: "/db-health", 
      dashboard: "/dashboard",
      users: "/users",
      payments: "/payments",
      userProfile: "/users/:id"
    }
  });
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

// Database and data endpoints
app.get("/db-health", getDatabaseHealth);
app.get("/dashboard", getDashboardStats);
app.get("/users", getUsers);
app.get("/users/:id", getUserById);
app.get("/payments", getPayments);

// Error handling middleware
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error(`Unhandled error on ${req.method} ${req.url}`, error);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

app.listen(PORT, () => {
  const serverUrl = process.env.API_URL || `http://localhost:${PORT}`;
  logger.info(`🌟 API Backend running on ${serverUrl}`);
  logger.info(`📊 Available endpoints: /health, /db-health, /dashboard, /users, /payments`);
  logger.info(`🌍 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
});