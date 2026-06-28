const filesRepository = require('../../src/modules/files/repositories');
const filesService = require('../../src/modules/files/files.service');
const storage = require('../../src/modules/files/storage');

describe('files service consistency', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rolls back storage when createMany fails', async () => {
    const storedFiles = [
      {
        name: 'a1b2c3d4e5f678901234567890abcd12.jpg',
        url: 'http://localhost/uploads/a1b2c3d4e5f678901234567890abcd12.jpg',
        originalName: 'photo.jpg',
        mimeType: 'image/jpeg',
        size: 10,
        encoding: '7bit',
        provider: 'local',
      },
    ];

    vi.spyOn(storage, 'storeFiles').mockResolvedValue(storedFiles);
    vi.spyOn(storage, 'removeFiles').mockResolvedValue();
    vi.spyOn(filesRepository, 'createMany').mockRejectedValue(
      new Error('db failed'),
    );

    await expect(
      filesService.processUploadedFiles('664a1b2c3d4e5f678901234567', [
        { originalname: 'photo.jpg' },
      ]),
    ).rejects.toThrow('db failed');

    expect(storage.removeFiles).toHaveBeenCalledWith(storedFiles);
  });

  it('restores storage when markArchived fails', async () => {
    const fileRecord = {
      id: '664a1b2c3d4e5f678901234567',
      name: 'a1b2c3d4e5f678901234567890abcd12.jpg',
    };
    const archived = {
      name: fileRecord.name,
      archivedName: '_archive/a1b2c3d4e5f678901234567890abcd12.jpg',
      provider: 'local',
    };

    vi.spyOn(filesRepository, 'findActiveByNameAndUserId').mockResolvedValue(
      fileRecord,
    );
    vi.spyOn(storage, 'archiveFile').mockResolvedValue(archived);
    vi.spyOn(storage, 'restoreArchived').mockResolvedValue();
    vi.spyOn(filesRepository, 'markArchived').mockRejectedValue(
      new Error('db failed'),
    );

    await expect(
      filesService.archiveUploadedFile(
        '664a1b2c3d4e5f678901234567',
        fileRecord.name,
      ),
    ).rejects.toThrow('db failed');

    expect(storage.restoreArchived).toHaveBeenCalledWith(archived);
  });
});
