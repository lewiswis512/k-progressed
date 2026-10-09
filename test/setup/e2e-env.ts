import { randomBytes } from 'crypto';
import { assertNotDotenvMongoUri } from './dotenv-values';
import { applyTestEnv } from './test-env';

const memoryUri = process.env.MONGO_MEMORY_URI;

if (!memoryUri) {
  throw new Error(
    'MONGO_MEMORY_URI is missing: run the e2e tests with test/jest-e2e.json',
  );
}

applyTestEnv();

const baseUri = memoryUri.endsWith('/') ? memoryUri : `${memoryUri}/`;

process.env.MONGO_URI = `${baseUri}kp-e2e-${randomBytes(6).toString('hex')}`;

assertNotDotenvMongoUri(process.env.MONGO_URI);
