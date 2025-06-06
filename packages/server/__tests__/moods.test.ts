import request from 'supertest';
import { createApp } from '../src/index';

describe('GET /api/moods', () => {
  it('should respect limit and offset query parameters even when zero', async () => {
    const app = createApp();
    const res = await request(app).get('/api/moods?limit=0&offset=0');
    expect(res.status).toBe(200);
    expect(res.body.limit).toBe(0);
    expect(res.body.offset).toBe(0);
    expect(Array.isArray(res.body.moods)).toBe(true);
    expect(res.body.moods.length).toBe(0);
  });
});
