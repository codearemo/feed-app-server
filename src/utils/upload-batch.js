// ******************************************************
// UPLOAD BATCH — sequential store with rollback on failure
// ******************************************************

/**
 * Store files one at a time. Rolls back successful uploads if any step fails.
 *
 * @param {Array} files
 * @param {(file: object) => Promise<object>} storeOne
 * @param {(stored: object) => Promise<void>} rollbackOne
 */
async function storeFilesWithRollback(files, storeOne, rollbackOne) {
  const stored = [];

  try {
    for (const file of files) {
      const metadata = await storeOne(file);
      stored.push(metadata);
    }

    return stored;
  } catch (error) {
    await Promise.allSettled(stored.map((item) => rollbackOne(item)));
    throw error;
  }
}

module.exports = {
  storeFilesWithRollback,
};
