const { z } = require('zod');
const { isMongoObjectId } = require('../files/files.validation');

const profilePictureField = z.union([
  z.null(),
  z
    .string({ error: 'Profile picture id is required' })
    .trim()
    .refine(isMongoObjectId, 'Invalid profile picture id'),
]);

const updateProfileSchema = z
  .object({
    firstName: z
      .string({ error: 'First name is required' })
      .trim()
      .min(1, 'First name is required')
      .optional(),
    lastName: z
      .string({ error: 'Last name is required' })
      .trim()
      .min(1, 'Last name is required')
      .optional(),
    username: z
      .string({ error: 'Username is required' })
      .trim()
      .min(3, 'Username must be at least 3 characters')
      .max(30, 'Username must be at most 30 characters')
      .optional(),
    bio: z
      .string()
      .trim()
      .max(500, 'Bio must be at most 500 characters')
      .optional(),
    profilePicture: profilePictureField.optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    'At least one profile field is required',
  );

function formatZodError(zodError) {
  const details = zodError.issues.map((issue) => ({
    field: issue.path.join('.') || 'body',
    message: issue.message,
  }));

  const error = new Error(details[0]?.message || 'Validation failed');
  error.statusCode = 400;
  error.details = details;

  return error;
}

function validateUpdateProfile(body) {
  const result = updateProfileSchema.safeParse(body);

  if (!result.success) {
    throw formatZodError(result.error);
  }

  return result.data;
}

function validateUserId(userId) {
  if (!isMongoObjectId(userId)) {
    const error = new Error('Invalid user id');
    error.statusCode = 400;
    throw error;
  }
}

module.exports = {
  validateUpdateProfile,
  validateUserId,
};
