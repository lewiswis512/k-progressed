export const TEST_ENV: Record<string, string> = {
  NODE_ENV: 'test',
  JWT_SECRET: 'test-jwt-secret-not-for-production',
  JWT_EXPIRATION_TIME: '1h',
  EMAIL_HOST: '127.0.0.1',
  EMAIL_PORT: '2',
  EMAIL_SECURE: 'false',
  EMAIL_USER: 'test',
  EMAIL_PASSWORD: 'test',
  EMAIL_FROM: 'K-Progressed Test <test@k-progressed.test>',
  FORGOT_PASSWORD_LINK: 'http://frontend.test/forgot-password',
  FRONTEND_URL: 'http://frontend.test',
  API_URL: 'http://api.test',
  STRIPE_SECRET_KEY: 'sk_test_fake_key_for_tests',
  STRIPE_PUBLISHABLE_KEY: 'pk_test_fake_key_for_tests',
  STRIPE_API_VERSION: '2024-04-10',
  WEBHOOK_STRIPE_SECRET: 'whsec_test_fake_secret_for_tests',
  CLOUDINARY_CLOUD_NAME: 'test-cloud',
  CLOUDINARY_API_KEY: 'test-key',
  CLOUDINARY_API_SECRET: 'test-secret',
  VIMEO_CLIENT_ID: 'test',
  VIMEO_CLIENT_SECRET: 'test',
  VIMEO_TOKEN: 'test',
  STRIPE_API_URL: 'http://stripe.test',
};

export const applyTestEnv = (): void => {
  Object.entries(TEST_ENV).forEach(([key, value]) => {
    process.env[key] = value;
  });
};
