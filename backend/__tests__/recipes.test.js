/**
 * Recipes tests
 * - Mocks Spoonacular via nock
 * - Verifies ingredients are present and instructions exist
 */
const request = require('supertest');
const nock = require('nock');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
let app, mongo, token;

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret';
  process.env.SPOONACULAR_API_KEY = 'fake';
  mongo = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongo.getUri();
  app = require('../index');

  // Create a user + token
  const signup = await request(app).post('/api/auth/signup').send({
    email: 't@t.com',
    password: 'secret123'
  });
  token = signup.body.token;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
  nock.cleanAll();
});

describe('Search + Save', () => {
  it('search returns items with ingredients & instructions', async () => {
    // Mock complexSearch -> returns IDs
    nock('https://api.spoonacular.com')
      .get('/recipes/complexSearch')
      .query(true)
      .reply(200, { results: [{ id: 111, title: 'Pasta', image: 'http://img/p.jpg' }] });

    // Mock informationBulk -> returns full info including extendedIngredients + instructions
    nock('https://api.spoonacular.com')
      .get('/recipes/informationBulk')
      .query(true)
      .reply(200, [{
        id: 111,
        title: 'Pasta',
        image: 'http://img/p.jpg',
        sourceUrl: 'http://src',
        readyInMinutes: 20,
        servings: 2,
        extendedIngredients: [
          { name: 'pasta', amount: 200, unit: 'g', original: '200 g pasta' },
          { name: 'salt', amount: 1, unit: 'tsp', original: '1 tsp salt' }
        ],
        instructions: 'Boil water. Cook pasta.'
      }]);

    const res = await request(app).get('/api/recipes/search?q=pasta');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].ingredients.length).toBeGreaterThan(0);
    expect(res.body[0].instructions).toMatch(/pasta/i);
  });

  it('save requires ingredients & instructions', async () => {
    const recipe = {
      apiId: 111,
      title: 'Pasta',
      image: 'http://img/p.jpg',
      ingredients: [{ name: 'pasta', original: '200 g pasta' }],
      instructions: 'Cook.'
    };
    const res = await request(app)
      .post('/api/recipes/save')
      .set('Authorization', `Bearer ${token}`)
      .send(recipe);
    expect(res.status).toBe(200);
    expect(res.body.id).toBeTruthy();
  });
});