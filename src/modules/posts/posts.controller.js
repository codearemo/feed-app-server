const postsService = require('./posts.service');
const { sendSuccess } = require('../../utils/api-response');

async function listFeed(req, res, next) {
  try {
    const result = await postsService.listFeed(req.user.id, req.query);

    sendSuccess(res, {
      message: 'Feed fetched successfully',
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

async function createPost(req, res, next) {
  try {
    const post = await postsService.createPost(req.user.id, req.body);

    sendSuccess(res, {
      statusCode: 201,
      message: 'Post created successfully',
      data: post,
    });
  } catch (error) {
    next(error);
  }
}

async function getPost(req, res, next) {
  try {
    const post = await postsService.getPost(req.user.id, req.params.postId);

    sendSuccess(res, {
      message: 'Post fetched successfully',
      data: post,
    });
  } catch (error) {
    next(error);
  }
}

async function updatePost(req, res, next) {
  try {
    const post = await postsService.updatePost(
      req.user.id,
      req.params.postId,
      req.body,
    );

    sendSuccess(res, {
      message: 'Post updated successfully',
      data: post,
    });
  } catch (error) {
    next(error);
  }
}

async function deletePost(req, res, next) {
  try {
    const result = await postsService.deletePost(
      req.user.id,
      req.params.postId,
    );

    sendSuccess(res, {
      message: 'Post deleted successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function listComments(req, res, next) {
  try {
    const result = await postsService.listComments(
      req.user.id,
      req.params.postId,
      req.query,
    );

    sendSuccess(res, {
      message: 'Comments fetched successfully',
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

async function createComment(req, res, next) {
  try {
    const comment = await postsService.createComment(
      req.user.id,
      req.params.postId,
      req.body,
    );

    sendSuccess(res, {
      statusCode: 201,
      message: 'Comment created successfully',
      data: comment,
    });
  } catch (error) {
    next(error);
  }
}

async function getComment(req, res, next) {
  try {
    const comment = await postsService.getComment(
      req.user.id,
      req.params.postId,
      req.params.commentId,
    );

    sendSuccess(res, {
      message: 'Comment fetched successfully',
      data: comment,
    });
  } catch (error) {
    next(error);
  }
}

async function updateComment(req, res, next) {
  try {
    const comment = await postsService.updateComment(
      req.user.id,
      req.params.postId,
      req.params.commentId,
      req.body,
    );

    sendSuccess(res, {
      message: 'Comment updated successfully',
      data: comment,
    });
  } catch (error) {
    next(error);
  }
}

async function deleteComment(req, res, next) {
  try {
    const result = await postsService.deleteComment(
      req.user.id,
      req.params.postId,
      req.params.commentId,
    );

    sendSuccess(res, {
      message: 'Comment deleted successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function likePost(req, res, next) {
  try {
    const post = await postsService.likePost(req.user.id, req.params.postId);

    sendSuccess(res, {
      message: 'Post liked successfully',
      data: post,
    });
  } catch (error) {
    next(error);
  }
}

async function unlikePost(req, res, next) {
  try {
    const post = await postsService.unlikePost(req.user.id, req.params.postId);

    sendSuccess(res, {
      message: 'Post unliked successfully',
      data: post,
    });
  } catch (error) {
    next(error);
  }
}

async function likeComment(req, res, next) {
  try {
    const comment = await postsService.likeComment(
      req.user.id,
      req.params.postId,
      req.params.commentId,
    );

    sendSuccess(res, {
      message: 'Comment liked successfully',
      data: comment,
    });
  } catch (error) {
    next(error);
  }
}

async function unlikeComment(req, res, next) {
  try {
    const comment = await postsService.unlikeComment(
      req.user.id,
      req.params.postId,
      req.params.commentId,
    );

    sendSuccess(res, {
      message: 'Comment unliked successfully',
      data: comment,
    });
  } catch (error) {
    next(error);
  }
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
