const mongoose = require('mongoose');
const { OTP_PURPOSE_VALUES } = require('../../../constants/otp');

const emailOtpsSchema = new mongoose.Schema({
  email: { type: String, required: true, index: true },
  purpose: { type: String, enum: OTP_PURPOSE_VALUES, required: true },
  otpHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

emailOtpsSchema.index({ email: 1, purpose: 1 }, { unique: true });
emailOtpsSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const EmailOtpsModel = mongoose.model('EmailOtps', emailOtpsSchema);

module.exports = EmailOtpsModel;
