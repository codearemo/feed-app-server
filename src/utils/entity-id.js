// ******************************************************
// ENTITY ID — normalize database primary keys to `id`
// ******************************************************

/**
 * Resolve a stable string id from a repository record.
 * Accepts either `id` (SQL / normalized) or `_id` (Mongo lean docs).
 *
 * @param {object | null | undefined} record
 * @returns {string | undefined}
 */
function getEntityId(record) {
  if (!record) {
    return undefined;
  }

  if (record.id !== null && record.id !== undefined && record.id !== '') {
    return String(record.id);
  }

  if (record._id !== null && record._id !== undefined && record._id !== '') {
    return String(record._id);
  }

  return undefined;
}

/**
 * Return a copy of a record with `id` set and `_id` removed.
 *
 * @param {object | null | undefined} record
 * @returns {object | null}
 */
function withEntityId(record) {
  if (!record) {
    return null;
  }

  const { _id, ...rest } = record;
  const id = getEntityId(record);

  if (id === undefined) {
    return { ...rest };
  }

  return { ...rest, id };
}

module.exports = {
  getEntityId,
  withEntityId,
};
