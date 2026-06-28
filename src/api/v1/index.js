const express = require('express');
const authRoutes = require('../../modules/auth/auth.routes');
const usersRoutes = require('../../modules/users/users.routes');
const uploadsRoutes = require('../../modules/files/files.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/uploads', uploadsRoutes);

module.exports = router;
