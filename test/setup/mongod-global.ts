import { MongoMemoryServer } from 'mongodb-memory-server';

export type IMongodGlobal = typeof globalThis & {
  __MONGOD__?: MongoMemoryServer;
};
