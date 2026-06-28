const express = require('express');
const request = require('supertest');
const { createRateLimiter } = require('../../src/middleware/rate-limit.middleware');

describe('rate limit middleware', () => {
  it('returns 429 with the uniform error envelope when the limit is exceeded', async () => {
    const app = express();
    const limiter = createRateLimiter({
      limit: 2,
      windowMs: 60_000,
      message: 'Too many login attempts, please try again later',
      skip: () => false,
    });

    app.post('/login', limiter, (_req, res) => {
      res.status(200).json({ data: { ok: true }, message: 'ok' });
    });

    await request(app).post('/login').expect(200);
    await request(app).post('/login').expect(200);

    const response = await request(app).post('/login').expect(429);

    expect(response.body).toEqual({
      data: null,
      message: 'Too many login attempts, please try again later',
    });
  });

  it('uses the global message for the baseline limiter', async () => {
    const app = express();
    const limiter = createRateLimiter({
      limit: 1,
      windowMs: 60_000,
      message: 'Too many requests, please try again later',
      skip: () => false,
    });

    app.get('/health', limiter, (_req, res) => {
      res.status(200).json({ status: 'OK' });
    });

    await request(app).get('/health').expect(200);

    const response = await request(app).get('/health').expect(429);

    expect(response.body).toEqual({
      data: null,
      message: 'Too many requests, please try again later',
    });
  });
});
