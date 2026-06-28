// ******************************************************
// POSTS REPOSITORY — MongoDB implementation
// ******************************************************

const mongoose = require('mongoose');
const PostsModel = require('../models/posts.model.mongo');
const { withEntityId } = require('../../../utils/entity-id');

function normalize(doc) {
  return withEntityId(doc);
}

async function create(payload) {
  const doc = await PostsModel.create(payload);
  return normalize(doc.toObject());
}

async function findActiveById(id) {
  const doc = await PostsModel.findOne({ _id: id, status: 'active' }).lean();
  return normalize(doc);
}

async function findActiveTopLevelById(id) {
  const doc = await PostsModel.findOne({
    _id: id,
    status: 'active',
    parentId: null,
  }).lean();

  return normalize(doc);
}

async function findActiveCommentById(commentId, postId) {
  const doc = await PostsModel.findOne({
    _id: commentId,
    parentId: postId,
    status: 'active',
  }).lean();

  return normalize(doc);
}

async function listActiveTopLevel({ page, limit }) {
  const skip = (page - 1) * limit;

  const [docs, total] = await Promise.all([
    PostsModel.find({ status: 'active', parentId: null })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    PostsModel.countDocuments({ status: 'active', parentId: null }),
  ]);

  return {
    items: docs.map(normalize),
    total,
  };
}

async function listActiveCommentsByPostId(postId, { page, limit }) {
  const skip = (page - 1) * limit;

  const [docs, total] = await Promise.all([
    PostsModel.find({ status: 'active', parentId: postId })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    PostsModel.countDocuments({ status: 'active', parentId: postId }),
  ]);

  return {
    items: docs.map(normalize),
    total,
  };
}

async function countActiveCommentsByPostId(postId) {
  return PostsModel.countDocuments({ status: 'active', parentId: postId });
}

async function countActiveCommentsByPostIds(postIds) {
  if (!postIds.length) {
    return new Map();
  }

  const rows = await PostsModel.aggregate([
    {
      $match: {
        status: 'active',
        parentId: { $in: postIds.map((id) => new mongoose.Types.ObjectId(id)) },
      },
    },
    { $group: { _id: '$parentId', count: { $sum: 1 } } },
  ]);

  return new Map(rows.map((row) => [String(row._id), row.count]));
}

async function updateById(id, fields) {
  const doc = await PostsModel.findOneAndUpdate(
    { _id: id, status: 'active' },
    { ...fields, updatedAt: new Date() },
    { returnDocument: 'after', runValidators: true },
  ).lean();

  return normalize(doc);
}

async function softDeleteById(id) {
  const doc = await PostsModel.findOneAndUpdate(
    { _id: id, status: 'active' },
    { status: 'deleted', updatedAt: new Date() },
    { returnDocument: 'after' },
  ).lean();

  return normalize(doc);
}

module.exports = {
  create,
  findActiveById,
  findActiveTopLevelById,
  findActiveCommentById,
  listActiveTopLevel,
  listActiveCommentsByPostId,
  countActiveCommentsByPostId,
  countActiveCommentsByPostIds,
  updateById,
  softDeleteById,
};
