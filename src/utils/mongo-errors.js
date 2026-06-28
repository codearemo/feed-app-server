// ******************************************************
// MONGO ERRORS — map driver errors to HTTP-friendly errors
// ******************************************************

/**
 * Turn a MongoDB duplicate-key error into a 409 Conflict the client can understand.
 *
 * ## Why this exists
 *
 * Fields like `email` and `username` are `unique` on the user schema. If MongoDB
 * rejects an insert because that value already exists, it throws error **code 11000**
 * (duplicate key). Without mapping, that surfaces as a **500 Internal Server Error** —
 * even though the real problem is "this email/username is already taken".
 *
 * ## Register already checks first — so why map 11000?
 *
 * `auth.service.register()` looks up existing email/username before `create()`. That
 * covers the normal path. But two register requests at the **same time** with the same
 * email can both pass those checks (neither user exists yet), then both call `create()`.
 * One wins; the other hits the unique index and gets 11000. This helper is the safety
 * net for that race (and any other code path that inserts without a prior check).
 *
 * ## Where it's used
 *
 * - `auth.service.js` — catch on `usersRepository.create()` during register
 * - `error.middleware.js` — global fallback for any unhandled 11000 from MongoDB
 *
 * @param {Error & { code?: number; keyPattern?: Record<string, number> }} err
 * @returns {Error} A 409 error with a friendly message, or the original error unchanged
 */
function mapMongoDuplicateKeyError(err) {
  // Not a duplicate-key violation — let the normal error handler deal with it.
  if (err?.code !== 11000) {
    return err;
  }

  const error = new Error('Resource already in use');
  error.statusCode = 409;

  // Mongo tells us which unique index fired (e.g. { email: 1 } or { username: 1 }).
  if (err.keyPattern?.email) {
    error.message = 'Email already in use';
  } else if (err.keyPattern?.username) {
    error.message = 'Username already in use';
  }

  return error;
}

module.exports = {
  mapMongoDuplicateKeyError,
};
