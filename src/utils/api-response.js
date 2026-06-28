// ******************************************************
// API RESPONSE — uniform success and error envelope
// ******************************************************

/**
 * Standard success response:
 * { data, message, pagination? }
 *
 * @param {import('express').Response} res
 * @param {object} options
 * @param {number} [options.statusCode=200]
 * @param {string} options.message
 * @param {*} [options.data=null]
 * @param {object} [options.pagination] - include only for paginated list endpoints
 */
function sendSuccess(
  res,
  { statusCode = 200, message, data = null, pagination },
) {
  const body = { data, message };

  if (pagination) {
    body.pagination = pagination;
  }

  return res.status(statusCode).json(body);
}

/**
 * Build pagination metadata for list endpoints.
 *
 * @param {object} params
 * @param {number} params.page - 1-based page number
 * @param {number} params.limit - items per page
 * @param {number} params.total - total matching items in the database
 */
function buildPagination({ page, limit, total }) {
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;

  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

/**
 * Standard error response:
 * { data: null, message, details? }
 *
 * Used by the global error middleware.
 */
function formatErrorResponse(err) {
  const statusCode = err.statusCode || 500;

  let message = err.message || 'Internal Server Error';

  if (statusCode === 500 && process.env.NODE_ENV !== 'development') {
    message = 'Internal Server Error';
  }

  const body = {
    data: null,
    message,
  };

  if (err.details?.length) {
    body.details = err.details;
  }

  return { statusCode, body };
}

module.exports = {
  sendSuccess,
  buildPagination,
  formatErrorResponse,
};
