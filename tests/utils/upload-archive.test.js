const {
  buildArchiveKey,
  buildCloudinaryArchiveId,
  isArchivedKey,
} = require('../../src/utils/upload-archive');

describe('upload archive helpers', () => {
  it('builds archive keys for local and S3 drivers', () => {
    const name = 'a1b2c3d4e5f678901234567890abcd12.jpg';

    expect(buildArchiveKey(name, '_archive')).toBe(`_archive/${name}`);
    expect(isArchivedKey(`_archive/${name}`, '_archive')).toBe(true);
  });

  it('rejects path traversal in stored names', () => {
    expect(() => buildArchiveKey('../secret.jpg', '_archive')).toThrow(
      'Invalid file name',
    );
  });

  it('rejects archiving a file that is already archived', () => {
    expect(() =>
      buildArchiveKey('_archive/a1b2c3d4e5f678901234567890abcd12.jpg', '_archive'),
    ).toThrow('File is already archived');
  });

  it('builds Cloudinary archive public_ids under the upload folder', () => {
    const archivedId = buildCloudinaryArchiveId(
      'my-app/a1b2c3d4e5f678901234567890abcd12',
      'my-app',
      '_archive',
    );

    expect(archivedId).toBe(
      'my-app/_archive/a1b2c3d4e5f678901234567890abcd12',
    );
  });
});
