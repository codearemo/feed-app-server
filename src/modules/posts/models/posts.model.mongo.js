const mongoose = require('mongoose');
const { POST_STATUSES } = require('../../../constants/posts');

const postsSchema = new mongoose.Schema({
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users',
    required: true,
    index: true,
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Posts',
    default: null,
    index: true,
  },
  title: { type: String, required: true, trim: true },
  excerpt: { type: String, trim: true, default: '' },
  content: { type: String, required: true },
  tags: { type: [String], default: [] },
  imageIds: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Files' }],
    default: [],
  },
  status: {
    type: String,
    enum: POST_STATUSES,
    default: 'active',
    index: true,
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

postsSchema.index({ status: 1, parentId: 1, createdAt: -1 });

const PostsModel = mongoose.model('Posts', postsSchema);

module.exports = PostsModel;
