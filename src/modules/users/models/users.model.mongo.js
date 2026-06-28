const mongoose = require('mongoose');
const {
  SUPPORTED_SOCIAL_PROVIDERS,
} = require('../../../constants/social-auth');

const authProviderSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      enum: SUPPORTED_SOCIAL_PROVIDERS,
      required: true,
    },
    providerId: { type: String, required: true },
  },
  { _id: false },
);

// Define the users schema
const usersSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: false, select: false },
  authProviders: { type: [authProviderSchema], default: [] },
  emailVerified: { type: Boolean, default: false },
  bio: { type: String, required: false },
  profilePicture: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Files',
    required: false,
    default: null,
  },
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorSecret: { type: String, required: false, select: false },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

usersSchema.index(
  { 'authProviders.provider': 1, 'authProviders.providerId': 1 },
  { unique: true, sparse: true },
);

/**
 * Custom transform function to remove sensitive fields (like password)
 * from the user object when it is serialized or converted to a plain object.
 *
 * This ensures that password hashes are never accidentally sent to clients
 * or exposed in logs.
 *
 * Example usage:
 *   const user = await UsersModel.findOne({ username: 'jane' });
 *   const obj = user.toObject(); // will NOT have .password field
 *   const json = user.toJSON(); // will NOT have .password field
 */
function stripSensitiveFields(_doc, ret) {
  delete ret.password;
  delete ret.authProviders;
  delete ret.twoFactorSecret;
  return ret;
}

// Attach the stripping function for both .toJSON() and .toObject()
usersSchema.set('toJSON', { transform: stripSensitiveFields });
usersSchema.set('toObject', { transform: stripSensitiveFields });

// Create the users model
const UsersModel = mongoose.model('Users', usersSchema);

// Export the users model
module.exports = UsersModel;
