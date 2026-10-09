import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

export const dotenvValues = (): Record<string, string> => {
  const file = path.resolve(__dirname, '..', '..', '.env');

  return fs.existsSync(file) ? dotenv.parse(fs.readFileSync(file)) : {};
};

export const assertNotDotenvMongoUri = (uri: string | undefined): void => {
  const dotenvUri = dotenvValues().MONGO_URI;

  if (!uri) {
    throw new Error('MONGO_URI is not set for the e2e tests');
  }

  if (dotenvUri && uri.trim() === dotenvUri.trim()) {
    throw new Error(
      'Refusing to run the e2e tests: MONGO_URI equals the value from .env',
    );
  }

  if (!/^mongodb:\/\/127\.0\.0\.1:\d+\//.test(uri)) {
    throw new Error(
      `Refusing to run the e2e tests: MONGO_URI is not a local in-memory server (${uri})`,
    );
  }
};
