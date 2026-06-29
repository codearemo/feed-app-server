const { z } = require('zod');
const { isMongoObjectId } = require('../files/files.validation');
const {
  MAX_MESSAGE_LENGTH,
  DEFAULT_MESSAGES_PAGE,
  DEFAULT_MESSAGES_LIMIT,
  MAX_MESSAGES_LIMIT,
  DEFAULT_CONVERSATIONS_LIMIT,
  MAX_CONVERSATIONS_LIMIT,
} = require('../../constants/chat');

const createConversationSchema = z.object({
  participantId: z
    .string({ error: 'Participant id is required' })
    .trim()
    .refine(isMongoObjectId, 'Invalid participant id'),
});

const sendMessageSchema = z.object({
  content: z
    .string({ error: 'Message content is required' })
    .trim()
    .min(1, 'Message content is required')
    .max(
      MAX_MESSAGE_LENGTH,
      `Message must be at most ${MAX_MESSAGE_LENGTH} characters`,
    ),
});

const listMessagesQuerySchema = z.object({
  page: z.coerce
    .number()
    .int()
    .min(1)
    .optional()
    .default(DEFAULT_MESSAGES_PAGE),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_MESSAGES_LIMIT)
    .optional()
    .default(DEFAULT_MESSAGES_LIMIT),
});

const listConversationsQuerySchema = z.object({
  page: z.coerce
    .number()
    .int()
    .min(1)
    .optional()
    .default(DEFAULT_MESSAGES_PAGE),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_CONVERSATIONS_LIMIT)
    .optional()
    .default(DEFAULT_CONVERSATIONS_LIMIT),
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

function validateCreateConversation(body) {
  const result = createConversationSchema.safeParse(body);

  if (!result.success) {
    throw formatZodError(result.error);
  }

  return result.data;
}

function validateSendMessage(body) {
  const result = sendMessageSchema.safeParse(body);

  if (!result.success) {
    throw formatZodError(result.error);
  }

  return result.data;
}

function validateListMessagesQuery(query) {
  const result = listMessagesQuerySchema.safeParse(query);

  if (!result.success) {
    throw formatZodError(result.error);
  }

  return result.data;
}

function validateListConversationsQuery(query) {
  const result = listConversationsQuerySchema.safeParse(query);

  if (!result.success) {
    throw formatZodError(result.error);
  }

  return result.data;
}

function validateConversationId(conversationId) {
  if (!isMongoObjectId(conversationId)) {
    const error = new Error('Invalid conversation id');
    error.statusCode = 400;
    throw error;
  }
}

function validateMessageId(messageId) {
  if (!isMongoObjectId(messageId)) {
    const error = new Error('Invalid message id');
    error.statusCode = 400;
    throw error;
  }
}

module.exports = {
  validateCreateConversation,
  validateSendMessage,
  validateListMessagesQuery,
  validateListConversationsQuery,
  validateConversationId,
  validateMessageId,
};
