const request = require('supertest');
const app = require('../../src/app');

describe('GET /health', () => {
  it('returns 200 when MongoDB is connected', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'OK',
      database: 'connected',
    });
  });
});
