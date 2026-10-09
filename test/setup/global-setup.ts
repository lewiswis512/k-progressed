import { MongoMemoryServer } from 'mongodb-memory-server';
import { IMongodGlobal } from './mongod-global';
import { assertNotDotenvMongoUri } from './dotenv-values';
import { applyTestEnv } from './test-env';

export default async function globalSetup(): Promise<void> {
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();

  (globalThis as IMongodGlobal).__MONGOD__ = mongod;

  applyTestEnv();
  process.env.MONGO_MEMORY_URI = uri;
  process.env.MONGO_URI = uri;

  assertNotDotenvMongoUri(process.env.MONGO_URI);
}
