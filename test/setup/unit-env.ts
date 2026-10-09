import { applyTestEnv } from './test-env';

applyTestEnv();
process.env.MONGO_URI = 'mongodb://127.0.0.1:1/kp-unit-tests-no-database';
