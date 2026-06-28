const { storeFilesWithRollback } = require('../../src/utils/upload-batch');

describe('storeFilesWithRollback', () => {
  it('returns all stored metadata when every upload succeeds', async () => {
    const stored = await storeFilesWithRollback(
      [{ id: 1 }, { id: 2 }],
      async (file) => ({ name: `file-${file.id}` }),
      async () => {},
    );

    expect(stored).toEqual([{ name: 'file-1' }, { name: 'file-2' }]);
  });

  it('rolls back successful uploads when a later upload fails', async () => {
    const rolledBack = [];

    await expect(
      storeFilesWithRollback(
        [{ id: 1 }, { id: 2 }],
        async (file) => {
          if (file.id === 2) {
            throw new Error('upload failed');
          }

          return { name: `file-${file.id}` };
        },
        async (metadata) => {
          rolledBack.push(metadata.name);
        },
      ),
    ).rejects.toThrow('upload failed');

    expect(rolledBack).toEqual(['file-1']);
  });
});
