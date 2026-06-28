// ******************************************************
// POST CONSTANTS
// ******************************************************

const POST_STATUSES = ['active', 'deleted'];

const POST_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

const DEFAULT_FEED_PAGE = 1;
const DEFAULT_FEED_LIMIT = 20;
const MAX_FEED_LIMIT = 50;
const MAX_POST_IMAGES = 10;
const MAX_POST_TAGS = 20;

module.exports = {
  POST_STATUSES,
  POST_IMAGE_MIME_TYPES,
  DEFAULT_FEED_PAGE,
  DEFAULT_FEED_LIMIT,
  MAX_FEED_LIMIT,
  MAX_POST_IMAGES,
  MAX_POST_TAGS,
};
