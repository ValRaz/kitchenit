/**
 * Auth flow tests (signup + login)
 * - Uses in-memory Mongo so tests are hermetic
 */
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let app;
let mongo;

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret';
  mongo = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongo.getUri();
  app = require('../index');
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

describe('Auth', () => {
  it('signup -> returns token', async () => {
    const res = await request(app).post('/api/auth/signup').send({
      email: 'test@example.com',
      password: 'secret123'
    });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
  });

  it('login -> returns token', async () => {
    await request(app).post('/api/auth/signup').send({
      email: 'u@example.com',
      password: 'p@ssw0rd'
    });
    const res = await request(app).post('/api/auth/login').send({
      email: 'u@example.com',
      password: 'p@ssw0rd'
    });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
  });

  it('login fail wrong password', async () => {
    await request(app).post('/api/auth/signup').send({
      email: 'a@b.com',
      password: 'goodpass'
    });
    const res = await request(app).post('/api/auth/login').send({
      email: 'a@b.com',
      password: 'badpass'
    });
    expect(res.status).toBe(400);
  });
});