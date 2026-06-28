const mongoose = require('mongoose');

const twoFactorSetupsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users',
    required: true,
    unique: true,
  },
  encryptedSecret: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

twoFactorSetupsSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const TwoFactorSetupsModel = mongoose.model(
  'TwoFactorSetups',
  twoFactorSetupsSchema,
);

module.exports = TwoFactorSetupsModel;
