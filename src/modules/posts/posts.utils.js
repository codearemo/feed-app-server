// ******************************************************
// POSTS UTILS — API shapes for posts and comments
// ******************************************************

const { getEntityId } = require('../../utils/entity-id');
const { resolveProfilePictureForUser } = require('../users/users.profile');
const { toPublicFile } = require('../files/files.utils');
const filesRepository = require('../files/repositories');

function getAuthorInitials(firstName, lastName) {
  const first = firstName?.trim()?.[0] ?? '';
  const last = lastName?.trim()?.[0] ?? '';
  return `${first}${last}`.toUpperCase() || '?';
}

async function toPublicAuthor(user) {
  if (!user) {
    return null;
  }

  const userId = getEntityId(user);

  return {
    id: userId,
    name: `${user.firstName} ${user.lastName}`.trim(),
    avatar: getAuthorInitials(user.firstName, user.lastName),
    profilePicture: await resolveProfilePictureForUser(
      userId,
      user.profilePicture,
    ),
  };
}

async function resolveImages(imageIds) {
  if (!imageIds?.length) {
    return [];
  }

  const images = await Promise.all(
    imageIds.map(async (imageId) => {
      const file = await filesRepository.findActiveById(String(imageId));

      if (!file) {
        return null;
      }

      return toPublicFile(file);
    }),
  );

  return images.filter(Boolean);
}

async function toPublicPost(record, options = {}) {
  const {
    author,
    likeCount = 0,
    likedByMe = false,
    commentCount = 0,
  } = options;

  const images = await resolveImages(record.imageIds);

  const post = {
    id: getEntityId(record),
    title: record.title,
    excerpt: record.excerpt ?? '',
    content: record.content,
    author: author ?? null,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    tags: record.tags ?? [],
    images,
    likeCount,
    likedByMe,
  };

  if (record.parentId === null || record.parentId === undefined) {
    post.commentCount = commentCount;
  }

  return post;
}

async function toPublicPosts(records, context) {
  const {
    authorsById,
    likeCountsByPostId,
    likedPostIds,
    commentCountsByPostId,
  } = context;

  return Promise.all(
    records.map((record) => {
      const id = getEntityId(record);
      const isTopLevel =
        record.parentId === null || record.parentId === undefined;

      return toPublicPost(record, {
        author: authorsById.get(String(record.authorId)) ?? null,
        likeCount: likeCountsByPostId.get(id) ?? 0,
        likedByMe: likedPostIds.has(id),
        commentCount: isTopLevel
          ? (commentCountsByPostId.get(id) ?? 0)
          : undefined,
      });
    }),
  );
}

module.exports = {
  toPublicAuthor,
  toPublicPost,
  toPublicPosts,
};
