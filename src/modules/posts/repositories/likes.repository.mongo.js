// ******************************************************
// LIKES REPOSITORY — MongoDB implementation
// ******************************************************

const LikesModel = require('../models/likes.model.mongo');

async function create(postId, userId) {
  try {
    const doc = await LikesModel.create({ postId, userId });
    return { created: true, id: String(doc._id) };
  } catch (error) {
    if (error.code === 11000) {
      return { created: false };
    }

    throw error;
  }
}

async function remove(postId, userId) {
  const result = await LikesModel.deleteOne({ postId, userId });
  return result.deletedCount > 0;
}

async function countByPostId(postId) {
  return LikesModel.countDocuments({ postId });
}

async function countByPostIds(postIds) {
  if (!postIds.length) {
    return new Map();
  }

  const mongoose = require('mongoose');
  const rows = await LikesModel.aggregate([
    {
      $match: {
        postId: { $in: postIds.map((id) => new mongoose.Types.ObjectId(id)) },
      },
    },
    { $group: { _id: '$postId', count: { $sum: 1 } } },
  ]);

  return new Map(rows.map((row) => [String(row._id), row.count]));
}

async function findLikedPostIds(userId, postIds) {
  if (!postIds.length) {
    return new Set();
  }

  const docs = await LikesModel.find({
    userId,
    postId: { $in: postIds },
  })
    .select('postId')
    .lean();

  return new Set(docs.map((doc) => String(doc.postId)));
}

module.exports = {
  create,
  remove,
  countByPostId,
  countByPostIds,
  findLikedPostIds,
};
