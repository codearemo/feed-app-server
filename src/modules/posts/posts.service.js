// ******************************************************
// POSTS SERVICE — feed, posts, comments, and likes
// ******************************************************

const { buildPagination } = require('../../utils/api-response');
const { getEntityId } = require('../../utils/entity-id');
const usersRepository = require('../users/repositories');
const postsRepository = require('./repositories');
const likesRepository = require('./repositories/likes.repository.mongo');
const { assertAssignableImages } = require('./posts.images');
const { toPublicAuthor, toPublicPosts } = require('./posts.utils');
const {
  validateCreatePost,
  validateUpdatePost,
  validateListQuery,
  validatePostId,
  validateCommentId,
} = require('./posts.validation');
const postsSocket = require('./posts.socket');

async function buildPostsContext(records, viewerUserId) {
  const postIds = records.map((record) => getEntityId(record));
  const authorIds = [
    ...new Set(records.map((record) => String(record.authorId))),
  ];
  const topLevelPostIds = records
    .filter(
      (record) => record.parentId === null || record.parentId === undefined,
    )
    .map((record) => getEntityId(record));

  const [authors, likeCountsByPostId, likedPostIds, commentCountsByPostId] =
    await Promise.all([
      usersRepository.findByIds(authorIds),
      likesRepository.countByPostIds(postIds),
      likesRepository.findLikedPostIds(viewerUserId, postIds),
      postsRepository.countActiveCommentsByPostIds(topLevelPostIds),
    ]);

  const publicAuthors = await Promise.all(authors.map(toPublicAuthor));
  const authorsById = new Map(
    publicAuthors.map((author) => [String(author.id), author]),
  );

  return {
    authorsById,
    likeCountsByPostId,
    likedPostIds,
    commentCountsByPostId,
  };
}

async function hydratePost(record, viewerUserId) {
  const context = await buildPostsContext([record], viewerUserId);
  const [post] = await toPublicPosts([record], context);
  return post;
}

async function hydratePosts(records, viewerUserId) {
  const context = await buildPostsContext(records, viewerUserId);
  return toPublicPosts(records, context);
}

function assertAuthor(record, userId) {
  if (String(record.authorId) !== String(userId)) {
    const error = new Error('You can only modify your own content');
    error.statusCode = 403;
    throw error;
  }
}

async function listFeed(viewerUserId, query) {
  const { page, limit } = validateListQuery(query);
  const { items, total } = await postsRepository.listActiveTopLevel({
    page,
    limit,
  });

  const data = await hydratePosts(items, viewerUserId);

  return {
    data,
    pagination: buildPagination({ page, limit, total }),
  };
}

async function createPost(userId, body) {
  const payload = validateCreatePost(body);
  const imageIds = await assertAssignableImages(userId, payload.images);

  const record = await postsRepository.create({
    authorId: userId,
    parentId: null,
    title: payload.title,
    excerpt: payload.excerpt,
    content: payload.content,
    tags: payload.tags,
    imageIds,
  });

  const post = await hydratePost(record, userId);
  postsSocket.emitFeedPostCreated(post);
  return post;
}

async function getPost(viewerUserId, postId) {
  validatePostId(postId);

  const record = await postsRepository.findActiveTopLevelById(postId);

  if (!record) {
    const error = new Error('Post not found');
    error.statusCode = 404;
    throw error;
  }

  return hydratePost(record, viewerUserId);
}

async function updatePost(userId, postId, body) {
  validatePostId(postId);
  const payload = validateUpdatePost(body);

  const record = await postsRepository.findActiveTopLevelById(postId);

  if (!record) {
    const error = new Error('Post not found');
    error.statusCode = 404;
    throw error;
  }

  assertAuthor(record, userId);

  const updateFields = { ...payload };

  if (payload.images !== undefined) {
    updateFields.imageIds = await assertAssignableImages(
      userId,
      payload.images,
    );
  }

  const updated = await postsRepository.updateById(postId, updateFields);

  if (!updated) {
    const error = new Error('Post not found');
    error.statusCode = 404;
    throw error;
  }

  const post = await hydratePost(updated, userId);
  postsSocket.emitFeedPostUpdated(post);
  return post;
}

async function deletePost(userId, postId) {
  validatePostId(postId);

  const record = await postsRepository.findActiveTopLevelById(postId);

  if (!record) {
    const error = new Error('Post not found');
    error.statusCode = 404;
    throw error;
  }

  assertAuthor(record, userId);

  const deleted = await postsRepository.softDeleteById(postId);
  const result = { id: getEntityId(deleted) };
  postsSocket.emitFeedPostDeleted(result);
  return result;
}

async function listComments(viewerUserId, postId, query) {
  validatePostId(postId);
  const { page, limit } = validateListQuery(query);

  const post = await postsRepository.findActiveTopLevelById(postId);

  if (!post) {
    const error = new Error('Post not found');
    error.statusCode = 404;
    throw error;
  }

  const { items, total } = await postsRepository.listActiveCommentsByPostId(
    postId,
    { page, limit },
  );

  const data = await hydratePosts(items, viewerUserId);

  return {
    data,
    pagination: buildPagination({ page, limit, total }),
  };
}

async function createComment(userId, postId, body) {
  validatePostId(postId);
  const payload = validateCreatePost(body);

  const post = await postsRepository.findActiveTopLevelById(postId);

  if (!post) {
    const error = new Error('Post not found');
    error.statusCode = 404;
    throw error;
  }

  const imageIds = await assertAssignableImages(userId, payload.images);

  const record = await postsRepository.create({
    authorId: userId,
    parentId: postId,
    title: payload.title,
    excerpt: payload.excerpt,
    content: payload.content,
    tags: payload.tags,
    imageIds,
  });

  const comment = await hydratePost(record, userId);
  postsSocket.emitCommentCreated(postId, comment);
  postsSocket.notifyPostCommented(post.authorId, userId, { postId, comment });

  const parentPost = await hydratePost(post, userId);
  postsSocket.emitFeedPostUpdated(parentPost);

  return comment;
}

async function getComment(viewerUserId, postId, commentId) {
  validatePostId(postId);
  validateCommentId(commentId);

  const record = await postsRepository.findActiveCommentById(commentId, postId);

  if (!record) {
    const error = new Error('Comment not found');
    error.statusCode = 404;
    throw error;
  }

  return hydratePost(record, viewerUserId);
}

async function updateComment(userId, postId, commentId, body) {
  validatePostId(postId);
  validateCommentId(commentId);
  const payload = validateUpdatePost(body);

  const record = await postsRepository.findActiveCommentById(commentId, postId);

  if (!record) {
    const error = new Error('Comment not found');
    error.statusCode = 404;
    throw error;
  }

  assertAuthor(record, userId);

  const updateFields = { ...payload };

  if (payload.images !== undefined) {
    updateFields.imageIds = await assertAssignableImages(
      userId,
      payload.images,
    );
  }

  const updated = await postsRepository.updateById(commentId, updateFields);

  if (!updated) {
    const error = new Error('Comment not found');
    error.statusCode = 404;
    throw error;
  }

  const comment = await hydratePost(updated, userId);
  postsSocket.emitCommentUpdated(postId, comment);
  return comment;
}

async function deleteComment(userId, postId, commentId) {
  validatePostId(postId);
  validateCommentId(commentId);

  const record = await postsRepository.findActiveCommentById(commentId, postId);

  if (!record) {
    const error = new Error('Comment not found');
    error.statusCode = 404;
    throw error;
  }

  assertAuthor(record, userId);

  const deleted = await postsRepository.softDeleteById(commentId);
  const result = { id: getEntityId(deleted), postId };
  postsSocket.emitCommentDeleted(postId, result);
  return { id: result.id };
}

async function likePost(userId, postId) {
  validatePostId(postId);

  const record = await postsRepository.findActiveTopLevelById(postId);

  if (!record) {
    const error = new Error('Post not found');
    error.statusCode = 404;
    throw error;
  }

  await likesRepository.create(postId, userId);

  const post = await hydratePost(record, userId);
  const likedBy = await toPublicAuthor(await usersRepository.findById(userId));
  const payload = { postId, likeCount: post.likeCount, likedBy };
  postsSocket.emitPostLiked(postId, payload);
  postsSocket.notifyPostLiked(record.authorId, userId, payload);
  postsSocket.emitFeedPostUpdated(post);
  return post;
}

async function unlikePost(userId, postId) {
  validatePostId(postId);

  const record = await postsRepository.findActiveTopLevelById(postId);

  if (!record) {
    const error = new Error('Post not found');
    error.statusCode = 404;
    throw error;
  }

  await likesRepository.remove(postId, userId);

  const post = await hydratePost(record, userId);
  postsSocket.emitPostUnliked(postId, {
    postId,
    likeCount: post.likeCount,
  });
  postsSocket.emitFeedPostUpdated(post);
  return post;
}

async function likeComment(userId, postId, commentId) {
  validatePostId(postId);
  validateCommentId(commentId);

  const record = await postsRepository.findActiveCommentById(commentId, postId);

  if (!record) {
    const error = new Error('Comment not found');
    error.statusCode = 404;
    throw error;
  }

  await likesRepository.create(commentId, userId);

  const comment = await hydratePost(record, userId);
  const likedBy = await toPublicAuthor(await usersRepository.findById(userId));
  const payload = {
    postId,
    commentId,
    likeCount: comment.likeCount,
    likedBy,
  };
  postsSocket.emitCommentLiked(postId, payload);
  postsSocket.notifyCommentLiked(record.authorId, userId, payload);
  return comment;
}

async function unlikeComment(userId, postId, commentId) {
  validatePostId(postId);
  validateCommentId(commentId);

  const record = await postsRepository.findActiveCommentById(commentId, postId);

  if (!record) {
    const error = new Error('Comment not found');
    error.statusCode = 404;
    throw error;
  }

  await likesRepository.remove(commentId, userId);

  const comment = await hydratePost(record, userId);
  postsSocket.emitCommentUnliked(postId, {
    postId,
    commentId,
    likeCount: comment.likeCount,
  });
  return comment;
}

module.exports = {
  listFeed,
  createPost,
  getPost,
  updatePost,
  deletePost,
  listComments,
  createComment,
  getComment,
  updateComment,
  deleteComment,
  likePost,
  unlikePost,
  likeComment,
  unlikeComment,
};
