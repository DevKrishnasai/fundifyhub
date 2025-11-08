import dotenv from 'dotenv';
import path from 'path';

// TODO: need to add validation for env variables if required variables are missing then throw an error so that server doesn't start with invalid config
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const config = {
  services: {
      port: Number(process.env.WS_PORT)
    }
};

export default config;