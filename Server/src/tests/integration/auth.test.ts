// import request from 'supertest';
// import app from '../../app';
// import { connectTestDB, disconnectTestDB } from './setup';

// process.env.JWT_SECRET = 'test-secret';
// process.env.CLIENT_URL = 'http://localhost:5173';

// beforeAll(connectTestDB);
// afterAll(disconnectTestDB);

// describe('POST /api/auth/signup', () => {
//   it('creates a new user and returns a token', async () => {
//     const res = await request(app)
//       .post('/api/auth/signup')
//       .send({ name: 'Alice', email: 'alice@test.com', password: 'secret123' });
//     expect(res.status).toBe(201);
//     expect(res.body.token).toBeTruthy();
//     expect(res.body.user.email).toBe('alice@test.com');
//     expect(res.body.user.passwordHash).toBeUndefined();
//   });

//   it('returns 409 for duplicate email', async () => {
//     const res = await request(app)
//       .post('/api/auth/signup')
//       .send({ name: 'Alice2', email: 'alice@test.com', password: 'secret123' });
//     expect(res.status).toBe(409);
//   });

//   it('returns 422 for invalid email', async () => {
//     const res = await request(app)
//       .post('/api/auth/signup')
//       .send({ name: 'Bad', email: 'not-an-email', password: 'secret123' });
//     expect(res.status).toBe(422);
//   });

//   it('returns 422 for short password', async () => {
//     const res = await request(app)
//       .post('/api/auth/signup')
//       .send({ name: 'Bad', email: 'bad@test.com', password: '123' });
//     expect(res.status).toBe(422);
//   });
// });

// describe('POST /api/auth/login', () => {
//   it('returns a token for valid credentials', async () => {
//     const res = await request(app)
//       .post('/api/auth/login')
//       .send({ email: 'alice@test.com', password: 'secret123' });
//     expect(res.status).toBe(200);
//     expect(res.body.token).toBeTruthy();
//   });

//   it('returns 401 for wrong password', async () => {
//     const res = await request(app)
//       .post('/api/auth/login')
//       .send({ email: 'alice@test.com', password: 'wrongpassword' });
//     expect(res.status).toBe(401);
//   });

//   it('returns 401 for unknown email', async () => {
//     const res = await request(app)
//       .post('/api/auth/login')
//       .send({ email: 'nobody@test.com', password: 'secret123' });
//     expect(res.status).toBe(401);
//   });
// });

// describe('GET /api/auth/me', () => {
//   let token: string;

//   beforeAll(async () => {
//     const res = await request(app)
//       .post('/api/auth/login')
//       .send({ email: 'alice@test.com', password: 'secret123' });
//     token = res.body.token;
//   });

//   it('returns the current user', async () => {
//     const res = await request(app)
//       .get('/api/auth/me')
//       .set('Authorization', `Bearer ${token}`);
//     expect(res.status).toBe(200);
//     expect(res.body.user.email).toBe('alice@test.com');
//   });

//   it('returns 401 without token', async () => {
//     const res = await request(app).get('/api/auth/me');
//     expect(res.status).toBe(401);
//   });
// });
