const express = require('express');
const authenticate = require('../../middleware/authenticate.middleware');
const postsController = require('./posts.controller');

const router = express.Router();

router.get('/', authenticate, postsController.listFeed);

module.exports = router;
