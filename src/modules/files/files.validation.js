const mongoose = require('mongoose');
const { z } = require('zod');

const fileNameSchema = z
  .string({ error: 'File name is required' })
  .trim()
  .min(1, 'File name is required');

function formatZodError(zodError, field = 'name') {
  const error = new Error('Validation failed');
  error.statusCode = 400;
  error.details = zodError.issues.map((issue) => ({
    field: issue.path.join('.') || field,
    message: issue.message,
  }));
  return error;
}

function validateFileName(name) {
  const result = fileNameSchema.safeParse(name);

  if (!result.success) {
    throw formatZodError(result.error);
  }

  return result.data;
}

function isMongoObjectId(value) {
  if (!value || typeof value !== 'string') {
    return false;
  }

  return (
    mongoose.Types.ObjectId.isValid(value) &&
    String(new mongoose.Types.ObjectId(value)) === value
  );
}

module.exports = {
  validateFileName,
  isMongoObjectId,
};
