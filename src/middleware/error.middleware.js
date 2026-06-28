const { formatErrorResponse } = require('../utils/api-response');
const { mapMongoDuplicateKeyError } = require('../utils/mongo-errors');

function errorHandler(err, req, res, _next) {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      data: null,
      message: 'Request body too large',
    });
  }

  const mappedError = mapMongoDuplicateKeyError(err);
  const { statusCode, body } = formatErrorResponse(mappedError);
  res.status(statusCode).json(body);
}

module.exports = errorHandler;
