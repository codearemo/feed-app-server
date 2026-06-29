const express = require('express');
const authRoutes = require('../../modules/auth/auth.routes');
const usersRoutes = require('../../modules/users/users.routes');
const uploadsRoutes = require('../../modules/files/files.routes');
const feedRoutes = require('../../modules/posts/feed.routes');
const postsRoutes = require('../../modules/posts/posts.routes');

const chatRoutes = require('../../modules/chat/chat.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/uploads', uploadsRoutes);
router.use('/feed', feedRoutes);
router.use('/posts', postsRoutes);
router.use('/conversations', chatRoutes);

module.exports = router;
