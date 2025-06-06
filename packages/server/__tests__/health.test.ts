import request from 'supertest';
import { jest } from '@jest/globals';

// Mock transformers to avoid loading ESM modules during tests
jest.mock('@xenova/transformers', () => ({
  pipeline: jest.fn(() => async () => []),
}));

import { createApp } from '../src/index';

describe('GET /api/health', () => {
  it('responds with application health info', async () => {
    const app = createApp();
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'healthy');
  });
});
