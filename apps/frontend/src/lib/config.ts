import { validateFrontendEnv } from '@fundifyhub/utils';

/**
 * Frontend runtime configuration
 * ------------------------------
 * Server-side: run the shared Zod validator once at import-time so server
 * environments are strictly validated.
 * Client-side: do NOT run the Zod validator (it reads process.env and may
 * throw in the browser). Instead, read the NEXT_PUBLIC_* variables that are
 * statically injected by Next.js at build time.
 * 
 * Build phase: Skip validation during Next.js build to avoid errors when
 * environment variables aren't set. Validation will still run at actual runtime.
 */
let env: Record<string, any>;

// Skip validation during Next.js build phase
const isNextBuild = process.env.NEXT_PHASE === 'phase-production-build' || 
                    process.env.NEXT_PHASE === 'phase-development-build';

if (typeof window === 'undefined' && !isNextBuild) {
  // server/runtime: validate strictly (NOT during build)
  env = validateFrontendEnv();
} else {
  // client or build phase: read safe NEXT_PUBLIC_* values injected by Next.js
  env = {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
    // UploadThing token may be exposed as NEXT_PUBLIC_UPLOADTHING_TOKEN in
    // client builds; fall back to UPLOADTHING_TOKEN if the project exposes it.
    UPLOADTHING_TOKEN: process.env.UPLOADTHING_TOKEN,
    NODE_ENV: process.env.NODE_ENV,
    LOG_LEVEL: process.env.LOG_LEVEL,
  };
}

const config = {
  env,
  public: {
    apiUrl: env.NEXT_PUBLIC_API_URL,
    wsUrl: env.NEXT_PUBLIC_WS_URL,
    uploadthingToken: env.UPLOADTHING_TOKEN,
  },
  nodeEnv: env.NODE_ENV,
  logLevel: env.LOG_LEVEL,
};

export default config;
