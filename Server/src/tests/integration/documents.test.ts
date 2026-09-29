// import request from 'supertest';
// import app from '../../app';
// import { connectTestDB, disconnectTestDB } from './setup';

// process.env.JWT_SECRET = 'test-secret';
// process.env.CLIENT_URL = 'http://localhost:5173';

// let ownerToken: string;
// let viewerToken: string;
// let docId: string;

// beforeAll(async () => {
//   await connectTestDB();

//   // Create owner
//   const r1 = await request(app)
//     .post('/api/auth/signup')
//     .send({ name: 'Owner', email: 'owner@test.com', password: 'secret123' });
//   ownerToken = r1.body.token;

//   // Create viewer
//   const r2 = await request(app)
//     .post('/api/auth/signup')
//     .send({ name: 'Viewer', email: 'viewer@test.com', password: 'secret123' });
//   viewerToken = r2.body.token;
// });

// afterAll(disconnectTestDB);

// describe('POST /api/documents', () => {
//   it('creates a document with an empty AST', async () => {
//     const res = await request(app)
//       .post('/api/documents')
//       .set('Authorization', `Bearer ${ownerToken}`)
//       .send({ title: 'Test Doc' });
//     expect(res.status).toBe(201);
//     expect(res.body.document.title).toBe('Test Doc');
//     expect(res.body.document.version).toBe(0);
//     expect(res.body.document.astSnapshot).toBeDefined();
//     docId = res.body.document._id;
//   });
// });

// describe('GET /api/documents', () => {
//   it('lists owned documents', async () => {
//     const res = await request(app)
//       .get('/api/documents')
//       .set('Authorization', `Bearer ${ownerToken}`);
//     expect(res.status).toBe(200);
//     expect(res.body.documents.length).toBeGreaterThanOrEqual(1);
//   });

//   it('returns 401 without auth', async () => {
//     const res = await request(app).get('/api/documents');
//     expect(res.status).toBe(401);
//   });
// });

// describe('GET /api/documents/:id', () => {
//   it('returns document + astSnapshot for owner', async () => {
//     const res = await request(app)
//       .get(`/api/documents/${docId}`)
//       .set('Authorization', `Bearer ${ownerToken}`);
//     expect(res.status).toBe(200);
//     expect(res.body.document._id).toBe(docId);
//     expect(res.body.document.astSnapshot).toBeDefined();
//     expect(res.body.role).toBe('owner');
//   });

//   it('returns 403 for unauthenticated viewer', async () => {
//     const res = await request(app)
//       .get(`/api/documents/${docId}`)
//       .set('Authorization', `Bearer ${viewerToken}`);
//     expect(res.status).toBe(403);
//   });
// });

// describe('PATCH /api/documents/:id (rename)', () => {
//   it('owner can rename', async () => {
//     const res = await request(app)
//       .patch(`/api/documents/${docId}`)
//       .set('Authorization', `Bearer ${ownerToken}`)
//       .send({ title: 'Renamed Doc' });
//     expect(res.status).toBe(200);
//     expect(res.body.document.title).toBe('Renamed Doc');
//   });

//   it('non-owner cannot rename', async () => {
//     const res = await request(app)
//       .patch(`/api/documents/${docId}`)
//       .set('Authorization', `Bearer ${viewerToken}`)
//       .send({ title: 'Hacked Title' });
//     expect(res.status).toBe(403);
//   });
// });

// describe('POST /api/documents/:id/duplicate', () => {
//   it('creates a copy for the owner', async () => {
//     const res = await request(app)
//       .post(`/api/documents/${docId}/duplicate`)
//       .set('Authorization', `Bearer ${ownerToken}`);
//     expect(res.status).toBe(201);
//     expect(res.body.document.title).toContain('copy');
//     expect(res.body.document.version).toBe(0);
//   });
// });

// describe('GET /api/documents/:id/history', () => {
//   it('returns empty snapshots for a new document', async () => {
//     const res = await request(app)
//       .get(`/api/documents/${docId}/history`)
//       .set('Authorization', `Bearer ${ownerToken}`);
//     expect(res.status).toBe(200);
//     expect(Array.isArray(res.body.snapshots)).toBe(true);
//   });
// });

// describe('DELETE /api/documents/:id', () => {
//   it('non-owner cannot delete', async () => {
//     const res = await request(app)
//       .delete(`/api/documents/${docId}`)
//       .set('Authorization', `Bearer ${viewerToken}`);
//     expect(res.status).toBe(403);
//   });

//   it('owner can delete', async () => {
//     const res = await request(app)
//       .delete(`/api/documents/${docId}`)
//       .set('Authorization', `Bearer ${ownerToken}`);
//     expect(res.status).toBe(204);
//   });

//   it('deleted document is no longer found', async () => {
//     const res = await request(app)
//       .get(`/api/documents/${docId}`)
//       .set('Authorization', `Bearer ${ownerToken}`);
//     expect(res.status).toBe(404);
//   });
// });
