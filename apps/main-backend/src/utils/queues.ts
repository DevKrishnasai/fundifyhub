// Import server-only enqueue client (Node.js only - uses bullmq)
// Using direct source path to avoid exposing Node.js dependencies to frontend
import { createEnqueueClient } from "@fundifyhub/utils/server";
import config from "./config";

const queueClient = createEnqueueClient({ host: config.redis.host, port: config.redis.port });

export default queueClient;