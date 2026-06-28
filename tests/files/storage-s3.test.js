const sendMock = vi.fn();

const sampleFile = {
  buffer: Buffer.from('image'),
  originalname: 'photo.jpg',
  mimetype: 'image/jpeg',
  size: 5,
  encoding: '7bit',
};

describe('S3 storage driver', () => {
  let storage;

  beforeEach(() => {
    sendMock.mockReset();
    process.env.S3_BUCKET = 'test-bucket';
    process.env.S3_REGION = 'us-east-1';
    process.env.S3_ACCESS_KEY_ID = 'test-key';
    process.env.S3_SECRET_ACCESS_KEY = 'test-secret';

    storage = require('../../src/modules/files/storage/storage.s3');
    storage.__setClientForTests({ send: sendMock });
  });

  afterEach(() => {
    storage.__resetClientForTests();
    delete process.env.S3_BUCKET;
    delete process.env.S3_REGION;
    delete process.env.S3_ACCESS_KEY_ID;
    delete process.env.S3_SECRET_ACCESS_KEY;
  });

  it('rolls back successful uploads when a later file fails', async () => {
    const { PutObjectCommand, DeleteObjectCommand } =
      require('@aws-sdk/client-s3');

    sendMock
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('upload failed'))
      .mockResolvedValueOnce({});

    await expect(
      storage.storeFiles([sampleFile, { ...sampleFile, originalname: 'two.jpg' }]),
    ).rejects.toThrow('upload failed');

    expect(sendMock).toHaveBeenCalledTimes(3);
    expect(sendMock.mock.calls[0][0]).toBeInstanceOf(PutObjectCommand);
    expect(sendMock.mock.calls[2][0]).toBeInstanceOf(DeleteObjectCommand);
  });

  it('archives a file by copying to the archive prefix and deleting the active key', async () => {
    const { CopyObjectCommand, DeleteObjectCommand } =
      require('@aws-sdk/client-s3');

    sendMock.mockResolvedValue({});

    const name = 'a1b2c3d4e5f678901234567890abcd12.jpg';
    const result = await storage.archiveFile(name);

    expect(sendMock).toHaveBeenCalledTimes(2);
    expect(sendMock.mock.calls[0][0]).toBeInstanceOf(CopyObjectCommand);
    expect(sendMock.mock.calls[0][0].input).toEqual({
      Bucket: 'test-bucket',
      CopySource: `test-bucket/${name}`,
      Key: `_archive/${name}`,
    });
    expect(sendMock.mock.calls[1][0]).toBeInstanceOf(DeleteObjectCommand);
    expect(sendMock.mock.calls[1][0].input).toEqual({
      Bucket: 'test-bucket',
      Key: name,
    });
    expect(result).toEqual({
      name,
      archivedName: `_archive/${name}`,
      provider: 's3',
    });
  });

  it('maps missing S3 objects to 404 when archiving', async () => {
    const notFound = new Error('Not found');
    notFound.name = 'NoSuchKey';
    sendMock.mockRejectedValueOnce(notFound);

    await expect(
      storage.archiveFile('a1b2c3d4e5f678901234567890abcd12.jpg'),
    ).rejects.toMatchObject({
      message: 'File not found',
      statusCode: 404,
    });
  });

  it('removes the archive copy when deleting the active key fails', async () => {
    const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
    const name = 'a1b2c3d4e5f678901234567890abcd12.jpg';

    sendMock
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('delete failed'))
      .mockResolvedValueOnce({});

    await expect(storage.archiveFile(name)).rejects.toThrow('delete failed');

    expect(sendMock).toHaveBeenCalledTimes(3);
    expect(sendMock.mock.calls[2][0]).toBeInstanceOf(DeleteObjectCommand);
    expect(sendMock.mock.calls[2][0].input).toEqual({
      Bucket: 'test-bucket',
      Key: `_archive/${name}`,
    });
  });

  it('restores an archived object back to the active key', async () => {
    const { CopyObjectCommand, DeleteObjectCommand } =
      require('@aws-sdk/client-s3');

    sendMock.mockResolvedValue({});

    await storage.restoreArchived({
      name: 'a1b2c3d4e5f678901234567890abcd12.jpg',
      archivedName: '_archive/a1b2c3d4e5f678901234567890abcd12.jpg',
    });

    expect(sendMock).toHaveBeenCalledTimes(2);
    expect(sendMock.mock.calls[0][0]).toBeInstanceOf(CopyObjectCommand);
    expect(sendMock.mock.calls[1][0]).toBeInstanceOf(DeleteObjectCommand);
  });
});
