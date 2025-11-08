import dotenv from 'dotenv';
import path from 'path';
import { validateLiveSocketsEnv } from '@fundifyhub/utils';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

// Validate and get typed environment variables
const env = validateLiveSocketsEnv();

const config = {
  services: {
      port: env.WS_PORT
    }
};

export default config;