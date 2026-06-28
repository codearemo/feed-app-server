const { mapMongoDuplicateKeyError } = require('../../src/utils/mongo-errors');

describe('mapMongoDuplicateKeyError', () => {
  it('maps email duplicate key errors to 409', () => {
    const err = mapMongoDuplicateKeyError({
      code: 11000,
      keyPattern: { email: 1 },
    });

    expect(err.statusCode).toBe(409);
    expect(err.message).toBe('Email already in use');
  });

  it('maps username duplicate key errors to 409', () => {
    const err = mapMongoDuplicateKeyError({
      code: 11000,
      keyPattern: { username: 1 },
    });

    expect(err.statusCode).toBe(409);
    expect(err.message).toBe('Username already in use');
  });

  it('returns the original error for non-duplicate errors', () => {
    const original = new Error('Something else');

    expect(mapMongoDuplicateKeyError(original)).toBe(original);
  });
});
