const { z } = require('zod');
const { isMongoObjectId } = require('../files/files.validation');
const {
  DEFAULT_FEED_PAGE,
  DEFAULT_FEED_LIMIT,
  MAX_FEED_LIMIT,
  MAX_POST_IMAGES,
  MAX_POST_TAGS,
} = require('../../constants/posts');

const tagField = z
  .string()
  .trim()
  .min(1, 'Tag cannot be empty')
  .max(50, 'Tag must be at most 50 characters');

const contentFields = {
  title: z
    .string({ error: 'Title is required' })
    .trim()
    .min(1, 'Title is required')
    .max(200, 'Title must be at most 200 characters'),
  excerpt: z
    .string()
    .trim()
    .max(500, 'Excerpt must be at most 500 characters')
    .optional(),
  content: z
    .string({ error: 'Content is required' })
    .trim()
    .min(1, 'Content is required'),
  tags: z
    .array(tagField)
    .max(MAX_POST_TAGS, `At most ${MAX_POST_TAGS} tags are allowed`)
    .optional(),
  images: z
    .array(
      z
        .object({
          id: z
            .string({ error: 'Image id is required' })
            .trim()
            .refine(isMongoObjectId, 'Invalid image id'),
        })
        .passthrough(),
    )
    .max(MAX_POST_IMAGES, `At most ${MAX_POST_IMAGES} images are allowed`)
    .optional(),
};

const createPostSchema = z.object(contentFields);

const updatePostSchema = z
  .object({
    title: contentFields.title.optional(),
    excerpt: contentFields.excerpt,
    content: contentFields.content.optional(),
    tags: contentFields.tags,
    images: contentFields.images,
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    'At least one field is required',
  );

const listQuerySchema = z.object({
  page: z.coerce
    .number()
    .int()
    .min(1, 'Page must be at least 1')
    .optional()
    .default(DEFAULT_FEED_PAGE),
  limit: z.coerce
    .number()
    .int()
    .min(1, 'Limit must be at least 1')
    .max(MAX_FEED_LIMIT, `Limit must be at most ${MAX_FEED_LIMIT}`)
    .optional()
    .default(DEFAULT_FEED_LIMIT),
});

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

function validateCreatePost(body) {
  const result = createPostSchema.safeParse(body);

  if (!result.success) {
    throw formatZodError(result.error);
  }

  return {
    ...result.data,
    excerpt: result.data.excerpt ?? '',
    tags: result.data.tags ?? [],
    images: result.data.images ?? [],
  };
}

function validateUpdatePost(body) {
  const result = updatePostSchema.safeParse(body);

  if (!result.success) {
    throw formatZodError(result.error);
  }

  return result.data;
}

function validateListQuery(query) {
  const result = listQuerySchema.safeParse(query);

  if (!result.success) {
    throw formatZodError(result.error);
  }

  return result.data;
}

function validatePostId(postId) {
  if (!isMongoObjectId(postId)) {
    const error = new Error('Invalid post id');
    error.statusCode = 400;
    throw error;
  }
}

function validateCommentId(commentId) {
  if (!isMongoObjectId(commentId)) {
    const error = new Error('Invalid comment id');
    error.statusCode = 400;
    throw error;
  }
}

module.exports = {
  validateCreatePost,
  validateUpdatePost,
  validateListQuery,
  validatePostId,
  validateCommentId,
};
