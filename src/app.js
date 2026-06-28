// ******************************************************
// SETUP THE EXPRESS APP AND MIDDLEWARE
// ******************************************************

// Import the express module
const express = require('express');

// Create the express app
const app = express();

// Import versioned API routes
const v1Routes = require('./api/v1');
const config = require('./config');
const errorHandler = require('./middleware/error.middleware');
const { globalLimiter } = require('./middleware/rate-limit.middleware');
const {
  helmetMiddleware,
  corsMiddleware,
} = require('./middleware/security.middleware');
const swaggerUi = require('swagger-ui-express');
const { getSwaggerSpec } = require('./docs/swagger');
const { checkDatabaseHealth } = require('./utils/health');

app.use(helmetMiddleware);
app.use(corsMiddleware);

// JSON body parser with explicit size cap (see JSON_BODY_LIMIT in .env)
app.use(express.json({ limit: config.jsonBodyLimit }));

// Baseline per-IP rate limit for every route (auth routes also have stricter limits)
if (process.env.NODE_ENV !== 'test') {
  app.use(globalLimiter);
}

// Local disk files — only served directly when UPLOAD_PUBLIC_ACCESS=true
if (config.uploadDriver === 'local') {
  const localUploadsStatic = express.static(config.upload.local.directory);

  app.use('/uploads', (req, res, next) => {
    if (!config.upload.publicAccess) {
      next();
      return;
    }

    localUploadsStatic(req, res, next);
  });
}

// Swagger UI — rebuilds spec on each request so paths.js edits show after refresh
app.use('/api-docs', swaggerUi.serve, (req, res, next) => {
  swaggerUi.setup(getSwaggerSpec())(req, res, next);
});

// Raw OpenAPI JSON — always fresh; use with npm run postman:build
app.get('/api-docs.json', (_req, res) => {
  res.json(getSwaggerSpec());
});

// API v1 (e.g. POST /api/v1/auth/register)
app.use('/api/v1', v1Routes);

// Health check — verifies MongoDB is reachable (503 if not)
app.get('/health', async (_req, res) => {
  try {
    const { ok, database } = await checkDatabaseHealth();

    if (!ok) {
      return res.status(503).json({ status: 'ERROR', database });
    }

    res.status(200).json({ status: 'OK', database });
  } catch {
    res.status(503).json({ status: 'ERROR', database: 'unavailable' });
  }
});

// Global error handler — must be registered after all routes
app.use(errorHandler);

// Export the app
module.exports = app;
