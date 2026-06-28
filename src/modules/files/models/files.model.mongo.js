const mongoose = require('mongoose');

const filesSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users',
    required: true,
    index: true,
  },
  name: { type: String, required: true, unique: true },
  originalName: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  encoding: { type: String, required: true },
  url: { type: String, required: true },
  provider: {
    type: String,
    enum: ['local', 's3', 'cloudinary'],
    required: true,
  },
  status: {
    type: String,
    enum: ['active', 'archived'],
    default: 'active',
    index: true,
  },
  archivedName: { type: String },
  archivedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const FilesModel = mongoose.model('Files', filesSchema);

module.exports = FilesModel;
