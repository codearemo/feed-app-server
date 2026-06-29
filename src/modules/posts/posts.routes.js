const express = require('express');
const authenticate = require('../../middleware/authenticate.middleware');
const { postLimiter } = require('../../middleware/rate-limit.middleware');
const postsController = require('./posts.controller');

const router = express.Router();

router.post('/', authenticate, postLimiter, postsController.createPost);
router.get('/:postId', authenticate, postsController.getPost);
router.patch('/:postId', authenticate, postLimiter, postsController.updatePost);
router.delete(
  '/:postId',
  authenticate,
  postLimiter,
  postsController.deletePost,
);

router.post(
  '/:postId/likes',
  authenticate,
  postLimiter,
  postsController.likePost,
);
router.delete(
  '/:postId/likes',
  authenticate,
  postLimiter,
  postsController.unlikePost,
);

router.get('/:postId/comments', authenticate, postsController.listComments);
router.post(
  '/:postId/comments',
  authenticate,
  postLimiter,
  postsController.createComment,
);
router.get(
  '/:postId/comments/:commentId',
  authenticate,
  postsController.getComment,
);
router.patch(
  '/:postId/comments/:commentId',
  authenticate,
  postLimiter,
  postsController.updateComment,
);
router.delete(
  '/:postId/comments/:commentId',
  authenticate,
  postLimiter,
  postsController.deleteComment,
);
router.post(
  '/:postId/comments/:commentId/likes',
  authenticate,
  postLimiter,
  postsController.likeComment,
);
router.delete(
  '/:postId/comments/:commentId/likes',
  authenticate,
  postLimiter,
  postsController.unlikeComment,
);

module.exports = router;
