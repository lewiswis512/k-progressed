jest.mock('cloudinary', () => {
  const forbidden = () =>
    Promise.reject(new Error('The real Cloudinary SDK must not be called in tests'));

  return {
    v2: {
      config: jest.fn(),
      url: jest.fn(() => 'https://res.cloudinary.com/test-cloud/forbidden'),
      uploader: {
        upload: jest.fn(forbidden),
        upload_stream: jest.fn(() => {
          throw new Error('The real Cloudinary SDK must not be called in tests');
        }),
        destroy: jest.fn(forbidden),
      },
    },
  };
});

jest.mock('../../src/utils/uploads/cloudinary-upload-strategy', () => ({
  CloudinaryUploadStrategy: jest.requireActual('../utils/cloudinary-mock')
    .MockCloudinaryUploadStrategy,
}));

jest.mock('../../src/utils/uploads/cloudinary-video-upload-strategy', () => ({
  CloudinaryVideoUploadStrategy: jest.requireActual('../utils/cloudinary-mock')
    .MockCloudinaryVideoUploadStrategy,
}));

jest.mock('../../src/modules/payment/service/stripe.service', () => {
  const { stripeMock } = jest.requireActual('../utils/stripe-mock');

  class StripeService {
    public stripe = stripeMock;
  }

  return { StripeService };
});
