// Import server-only enqueue client (Node.js only - uses bullmq)
// Using direct source path to avoid exposing Node.js dependencies to frontend
import config from "./config";
import redis from "ioredis";

const queueClient = new redis({ host: config.redis.host, port: config.redis.port });

export default queueClient;