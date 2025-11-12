import { createRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "@/lib/uploadthing/uploadthing";

// Force Node.js runtime for this route (logger requires Node.js APIs)
export const runtime = 'nodejs';

export const { GET, POST } = createRouteHandler({
  router: ourFileRouter,
});