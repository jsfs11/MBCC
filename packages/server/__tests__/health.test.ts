import request from 'supertest';
import { createApp } from '../src/index';

describe('GET /api/health', () => {
  it('responds with application health info', async () => {
    const app = createApp();
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'healthy');
  });
});
