// ******************************************************
// CONFIGURE THE SERVER
// ******************************************************

// Getters read process.env at access time (allows tests to override before connect)

function parseCommaSeparatedList(value) {
  if (!value?.trim()) {
    return [];
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

const config = {
  get port() {
    return Number(process.env.PORT) || 3000;
  },
  get apiPublicUrl() {
    return process.env.API_PUBLIC_URL || 'https://feed-app-server.onrender.com';
  },
  get dbDriver() {
    return process.env.DB_DRIVER || 'mongo';
  },
  get JWT_SECRET() {
    return process.env.JWT_SECRET;
  },
  get JWT_EXPIRES_IN() {
    return process.env.JWT_EXPIRES_IN || '15m';
  },
  get JWT_REFRESH_EXPIRES_IN() {
    return process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  },
  get otp() {
    return {
      expiresMinutes: Number(process.env.OTP_EXPIRES_MINUTES) || 10,
      maxAttempts: Number(process.env.OTP_MAX_ATTEMPTS) || 5,
    };
  },
  get twoFactor() {
    return {
      issuer: process.env.TWO_FACTOR_ISSUER || 'My App',
      challengeExpiresMinutes:
        Number(process.env.TWO_FACTOR_CHALLENGE_EXPIRES_MINUTES) || 5,
      setupExpiresMinutes:
        Number(process.env.TWO_FACTOR_SETUP_EXPIRES_MINUTES) || 10,
      encryptionKey: process.env.TWO_FACTOR_ENCRYPTION_KEY,
    };
  },
  get cors() {
    return {
      origins: parseCommaSeparatedList(process.env.ALLOWED_ORIGINS),
    };
  },
  get socket() {
    return {
      enabled: process.env.SOCKET_ENABLED !== 'false',
      path: process.env.SOCKET_PATH || '/socket.io',
      log: (() => {
        if (process.env.SOCKET_LOG === 'true') {
          return true;
        }

        if (process.env.SOCKET_LOG === 'false') {
          return false;
        }

        return process.env.NODE_ENV === 'development';
      })(),
    };
  },
  get jsonBodyLimit() {
    return process.env.JSON_BODY_LIMIT || '10kb';
  },
  get uploadDriver() {
    return process.env.UPLOAD_DRIVER || 'local';
  },
  get upload() {
    const path = require('path');
    const { DEFAULT_ALLOWED_MIME_TYPES } = require('../constants/upload');

    const allowedFromEnv = parseCommaSeparatedList(
      process.env.UPLOAD_ALLOWED_MIME_TYPES,
    );

    const directory =
      process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');

    return {
      maxFileSize: Number(process.env.UPLOAD_MAX_FILE_SIZE) || 5 * 1024 * 1024,
      maxFiles: Number(process.env.UPLOAD_MAX_FILES) || 10,
      archivePrefix: process.env.UPLOAD_ARCHIVE_PREFIX || '_archive',
      allowedMimeTypes:
        allowedFromEnv.length > 0 ? allowedFromEnv : DEFAULT_ALLOWED_MIME_TYPES,
      publicAccess: (() => {
        if (process.env.UPLOAD_PUBLIC_ACCESS === 'true') {
          return true;
        }

        if (process.env.UPLOAD_PUBLIC_ACCESS === 'false') {
          return false;
        }

        return (
          process.env.NODE_ENV === 'development' ||
          process.env.NODE_ENV === 'test'
        );
      })(),
      local: {
        directory,
        archiveDirectory:
          process.env.UPLOAD_ARCHIVE_DIR ||
          path.join(process.cwd(), 'uploads-archive'),
        baseUrl:
          process.env.UPLOAD_BASE_URL ||
          `http://localhost:${Number(process.env.PORT) || 3000}`,
      },
    };
  },
  get s3() {
    return {
      bucket: process.env.S3_BUCKET,
      region: process.env.S3_REGION || 'us-east-1',
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      publicUrlBase: process.env.S3_PUBLIC_URL_BASE,
    };
  },
  get cloudinary() {
    return {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      apiSecret: process.env.CLOUDINARY_API_SECRET,
      folder: process.env.CLOUDINARY_FOLDER || 'feed-app',
    };
  },
  get rateLimit() {
    const authWindowMs = 5 * 60 * 1000;

    return {
      global: {
        windowMs:
          Number(process.env.RATE_LIMIT_GLOBAL_WINDOW_MS) || 15 * 60 * 1000,
        max: Number(process.env.RATE_LIMIT_GLOBAL_MAX) || 200,
      },
      register: {
        windowMs:
          Number(process.env.RATE_LIMIT_REGISTER_WINDOW_MS) || authWindowMs,
        max: Number(process.env.RATE_LIMIT_REGISTER_MAX) || 10,
      },
      login: {
        windowMs:
          Number(process.env.RATE_LIMIT_LOGIN_WINDOW_MS) || authWindowMs,
        max: Number(process.env.RATE_LIMIT_LOGIN_MAX) || 10,
      },
      forgotPassword: {
        windowMs:
          Number(process.env.RATE_LIMIT_FORGOT_PASSWORD_WINDOW_MS) ||
          authWindowMs,
        max: Number(process.env.RATE_LIMIT_FORGOT_PASSWORD_MAX) || 5,
      },
      resetPassword: {
        windowMs:
          Number(process.env.RATE_LIMIT_RESET_PASSWORD_WINDOW_MS) ||
          authWindowMs,
        max: Number(process.env.RATE_LIMIT_RESET_PASSWORD_MAX) || 10,
      },
      verifyEmail: {
        windowMs:
          Number(process.env.RATE_LIMIT_VERIFY_EMAIL_WINDOW_MS) || authWindowMs,
        max: Number(process.env.RATE_LIMIT_VERIFY_EMAIL_MAX) || 10,
      },
      resendVerification: {
        windowMs:
          Number(process.env.RATE_LIMIT_RESEND_VERIFICATION_WINDOW_MS) ||
          authWindowMs,
        max: Number(process.env.RATE_LIMIT_RESEND_VERIFICATION_MAX) || 5,
      },
      refresh: {
        windowMs:
          Number(process.env.RATE_LIMIT_REFRESH_WINDOW_MS) || authWindowMs,
        max: Number(process.env.RATE_LIMIT_REFRESH_MAX) || 20,
      },
      logout: {
        windowMs:
          Number(process.env.RATE_LIMIT_LOGOUT_WINDOW_MS) || authWindowMs,
        max: Number(process.env.RATE_LIMIT_LOGOUT_MAX) || 20,
      },
      socialLogin: {
        windowMs:
          Number(process.env.RATE_LIMIT_SOCIAL_LOGIN_WINDOW_MS) || authWindowMs,
        max: Number(process.env.RATE_LIMIT_SOCIAL_LOGIN_MAX) || 10,
      },
      twoFactorSetup: {
        windowMs:
          Number(process.env.RATE_LIMIT_TWO_FACTOR_SETUP_WINDOW_MS) ||
          authWindowMs,
        max: Number(process.env.RATE_LIMIT_TWO_FACTOR_SETUP_MAX) || 10,
      },
      twoFactorConfirm: {
        windowMs:
          Number(process.env.RATE_LIMIT_TWO_FACTOR_CONFIRM_WINDOW_MS) ||
          authWindowMs,
        max: Number(process.env.RATE_LIMIT_TWO_FACTOR_CONFIRM_MAX) || 10,
      },
      twoFactorVerify: {
        windowMs:
          Number(process.env.RATE_LIMIT_TWO_FACTOR_VERIFY_WINDOW_MS) ||
          authWindowMs,
        max: Number(process.env.RATE_LIMIT_TWO_FACTOR_VERIFY_MAX) || 10,
      },
      twoFactorDisable: {
        windowMs:
          Number(process.env.RATE_LIMIT_TWO_FACTOR_DISABLE_WINDOW_MS) ||
          authWindowMs,
        max: Number(process.env.RATE_LIMIT_TWO_FACTOR_DISABLE_MAX) || 10,
      },
      upload: {
        windowMs:
          Number(process.env.RATE_LIMIT_UPLOAD_WINDOW_MS) || authWindowMs,
        max: Number(process.env.RATE_LIMIT_UPLOAD_MAX) || 20,
      },
      post: {
        windowMs: Number(process.env.RATE_LIMIT_POST_WINDOW_MS) || authWindowMs,
        max: Number(process.env.RATE_LIMIT_POST_MAX) || 30,
      },
      chat: {
        windowMs: Number(process.env.RATE_LIMIT_CHAT_WINDOW_MS) || authWindowMs,
        max: Number(process.env.RATE_LIMIT_CHAT_MAX) || 60,
      },
    };
  },
  get mail() {
    const user = process.env.SMTP_USER;
    const from =
      process.env.SMTP_FROM || (user && user.includes('@') ? user : undefined);

    return {
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      user,
      pass: process.env.SMTP_PASS,
      from,
    };
  },
  get mongo() {
    return {
      uri: process.env.MONGO_URI || 'mongodb://localhost:27017/feed-app',
    };
  },
  get social() {
    return {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
      },
      apple: {
        clientId: process.env.APPLE_CLIENT_ID,
      },
    };
  },
  get sql() {
    return {
      dialect: process.env.SQL_DIALECT || 'mysql',
      host: process.env.SQL_HOST || 'localhost',
      port: Number(process.env.SQL_PORT) || 3306,
      database: process.env.SQL_DATABASE || 'my_app',
      user: process.env.SQL_USER || 'root',
      password: process.env.SQL_PASSWORD || '',
    };
  },
};

module.exports = config;
module.exports.parseCommaSeparatedList = parseCommaSeparatedList;
