const mongoose = require('mongoose');

const likesSchema = new mongoose.Schema({
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Posts',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users',
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
});

likesSchema.index({ postId: 1, userId: 1 }, { unique: true });
likesSchema.index({ postId: 1 });

const LikesModel = mongoose.model('Likes', likesSchema);

module.exports = LikesModel;
