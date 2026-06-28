describe('storage driver switch', () => {
  afterEach(() => {
    delete process.env.UPLOAD_DRIVER;
  });

  it('throws for an unsupported UPLOAD_DRIVER', async () => {
    process.env.UPLOAD_DRIVER = 'dropbox';

    const storage = require('../../src/modules/files/storage');

    await expect(storage.storeFiles([])).rejects.toThrow(
      'No storage driver for UPLOAD_DRIVER: "dropbox"',
    );
  });
});
