const destroyMock = vi.fn();
const renameMock = vi.fn();
const uploadStreamMock = vi.fn();

const sampleFile = {
  buffer: Buffer.from('image'),
  originalname: 'photo.jpg',
  mimetype: 'image/jpeg',
  size: 5,
  encoding: '7bit',
};

function mockUploadSuccess(publicId = 'my-app/a1b2c3d4e5f678901234567890abcd12') {
  uploadStreamMock.mockImplementationOnce((_options, callback) => ({
    end: () => {
      callback(null, {
        secure_url: `https://res.cloudinary.com/demo/${publicId}.jpg`,
        public_id: publicId,
        bytes: 100,
      });
    },
  }));
}

describe('Cloudinary storage driver', () => {
  let storage;

  beforeEach(() => {
    destroyMock.mockReset();
    renameMock.mockReset();
    uploadStreamMock.mockReset();
    process.env.CLOUDINARY_FOLDER = 'my-app';

    storage = require('../../src/modules/files/storage/storage.cloudinary');
    storage.__setUploaderForTests({
      upload_stream: uploadStreamMock,
      destroy: destroyMock,
      rename: renameMock,
    });
  });

  afterEach(() => {
    storage.__resetUploaderForTests();
    delete process.env.CLOUDINARY_FOLDER;
  });

  it('rolls back successful uploads when a later file fails', async () => {
    mockUploadSuccess('my-app/file-one');
    uploadStreamMock.mockImplementationOnce((_options, callback) => ({
      end: () => {
        callback(new Error('upload failed'));
      },
    }));
    destroyMock.mockResolvedValue({ result: 'ok' });

    await expect(
      storage.storeFiles([sampleFile, { ...sampleFile, originalname: 'two.jpg' }]),
    ).rejects.toThrow('upload failed');

    expect(destroyMock).toHaveBeenCalledWith('my-app/file-one', {
      resource_type: 'auto',
    });
  });

  it('archives a file by renaming it into the archive folder', async () => {
    renameMock.mockResolvedValue({
      public_id: 'my-app/_archive/a1b2c3d4e5f678901234567890abcd12',
    });

    const name = 'my-app/a1b2c3d4e5f678901234567890abcd12';
    const result = await storage.archiveFile(name);

    expect(renameMock).toHaveBeenCalledWith(
      name,
      'my-app/_archive/a1b2c3d4e5f678901234567890abcd12',
      { resource_type: 'auto' },
    );
    expect(result).toEqual({
      name,
      archivedName: 'my-app/_archive/a1b2c3d4e5f678901234567890abcd12',
      provider: 'cloudinary',
    });
  });

  it('maps missing Cloudinary assets to 404 when archiving', async () => {
    const notFound = new Error('Not found');
    notFound.http_code = 404;
    renameMock.mockRejectedValueOnce(notFound);

    await expect(
      storage.archiveFile('my-app/a1b2c3d4e5f678901234567890abcd12'),
    ).rejects.toMatchObject({
      message: 'File not found',
      statusCode: 404,
    });
  });
});
