import request from 'supertest';
import { jest } from '@jest/globals';

// Mock transformers to avoid loading ESM modules during tests
jest.mock('@xenova/transformers', () => ({
  pipeline: jest.fn(() => async () => [{ label: 'POSITIVE', score: 0.9 }]),
}));

import { createApp } from '../src/index';

describe('Sentiment API', () => {
  it('returns sentiment analysis result for valid text', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/sentiment')
      .send({ text: 'Great' });
    expect(res.status).toBe(200);
    expect(res.body.sentiment).toBe('positive');
    expect(res.body.text).toBe('Great');
    expect(res.body).toHaveProperty('confidence');
  });

  it('returns 400 when text is missing', async () => {
    const app = createApp();
    const res = await request(app).post('/api/sentiment').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation Error');
  });

  it('returns 400 when text is empty', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/sentiment')
      .send({ text: ' ' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation Error');
  });

  it('returns 400 when text exceeds limit', async () => {
    const app = createApp();
    const longText = 'a'.repeat(1001);
    const res = await request(app)
      .post('/api/sentiment')
      .send({ text: longText });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation Error');
  });
});
