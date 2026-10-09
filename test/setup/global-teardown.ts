import { IMongodGlobal } from './mongod-global';

export default async function globalTeardown(): Promise<void> {
  const mongod = (globalThis as IMongodGlobal).__MONGOD__;

  if (mongod) {
    await mongod.stop();
  }
}
