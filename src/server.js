// ******************************************************
// START THE SERVER
// ******************************************************

// Load environment variables
require('dotenv').config();

const http = require('http');

// Import the app and config
const app = require('./app');
const config = require('./config');
const { initSocket } = require('./socket');

// Import the database connection
const { connect } = require('./database');

function validateEnv() {
  if (!config.JWT_SECRET) {
    throw new Error('JWT_SECRET is required. Set it in your .env file.');
  }

  if (config.uploadDriver === 's3') {
    const { bucket, accessKeyId, secretAccessKey } = config.s3;

    if (!bucket || !accessKeyId || !secretAccessKey) {
      throw new Error(
        'UPLOAD_DRIVER=s3 requires S3_BUCKET, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY.',
      );
    }
  }

  if (config.uploadDriver === 'cloudinary') {
    const { cloudName, apiKey, apiSecret } = config.cloudinary;

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error(
        'UPLOAD_DRIVER=cloudinary requires CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.',
      );
    }
  }
}

// Start the server
async function start() {
  validateEnv();

  // Connect to the database
  await connect();

  const server = http.createServer(app);

  if (config.socket.enabled) {
    initSocket(server);
  }

  server.listen(config.port, () => {
    console.log(`Server is running on port ${config.port}`);

    if (config.socket.enabled) {
      console.log(`WebSocket server ready at path ${config.socket.path}`);
    }

    if (config.socket.log) {
      console.log('Socket event logging enabled');
    }
  });
}

// Start the server and handle errors
start().catch((error) => {
  console.error('Failed to start server:', error.message);
  process.exit(1);
});
