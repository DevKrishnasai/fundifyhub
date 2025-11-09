// Import the server-only enqueue implementation directly to avoid exposing server-only
// dependencies to the frontend bundle via the shared package index.
import { createEnqueueClient } from "@fundifyhub/utils/src/enqueue";
import config from "./config";

const queueClient = createEnqueueClient({ host: config.redis.host, port: config.redis.port });

export default queueClient;
