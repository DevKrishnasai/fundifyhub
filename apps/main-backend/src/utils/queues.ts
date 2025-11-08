import { createEnqueueClient } from "@fundifyhub/utils";
import config from "./config";

const queueClient = createEnqueueClient({ host: config.redis.host, port: config.redis.port });

export default queueClient;
