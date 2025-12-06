// Load environment variables from repository root `.env` (dev convenience).
// Using a simple relative path as suggested so configs load the root .env
// before validators run. This is intentionally placed in per-app config
// files and not in the shared validator.
export { config as default, type MainBackendConfig, loadMainBackendConfig } from '../config';