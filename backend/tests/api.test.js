import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { roadNetworkService } from '../src/services/roadNetworkService.js';

test('Setup Road Network for API tests', async () => {
  await roadNetworkService.initialize();
  assert.equal(roadNetworkService.isReady, true);
});

test('API - Health Check', async () => {
  const res = await request(app).get('/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'ok');
  assert.equal(res.body.roadNetworkReady, true);
});

test('Frontend - Serves Web Application on GET /', async () => {
  const res = await request(app).get('/');
  assert.equal(res.status, 200);
  assert.ok(res.text.includes('<div id="root"></div>'));
});

test('API - Route Calculation POST /api/route', async () => {
  const payload = {
    origin: [22.6815, 75.8683], // IET DAVV
    destination: [22.6926, 75.8676] // Bhanwarkua
  };

  const res = await request(app)
    .post('/api/route')
    .send(payload);

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(res.body.distance > 0);
  assert.ok(res.body.duration > 0);
  assert.equal(res.body.geometry.type, 'LineString');
  assert.ok(res.body.geometry.coordinates.length > 2);
  assert.ok(Array.isArray(res.body.instructions));
});

test('API - Route Calculation Rejects Missing Coordinates', async () => {
  const res = await request(app)
    .post('/api/route')
    .send({});

  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.equal(res.body.error, 'MISSING_COORDINATES');
});

test('API - Geocode Search GET /api/geocode/search', async () => {
  const res = await request(app)
    .get('/api/geocode/search?q=DAVV');

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(res.body.results.length > 0);
  assert.ok(res.body.results[0].name.toLowerCase().includes('davv'));
});

test('API - Role-Based Access Control (Citizen & Authority)', async () => {
  // 1. Citizen reports new hazard (Allowed)
  const newHazardPayload = {
    type: 'construction',
    severity: 'medium',
    description: 'Metro line construction work near ring road',
    coordinates: [75.8750, 22.6880]
  };

  const createRes = await request(app)
    .post('/api/hazards')
    .set('x-user-role', 'citizen')
    .send(newHazardPayload);

  assert.equal(createRes.status, 201);
  assert.equal(createRes.body.success, true);
  assert.equal(createRes.body.reportedByRole, 'citizen');
  const hazardId = createRes.body.hazard._id || createRes.body.hazard.id;

  // 2. Citizen views hazards (Allowed)
  const getRes = await request(app)
    .get('/api/hazards')
    .set('x-user-role', 'citizen');
  assert.equal(getRes.status, 200);
  assert.ok(getRes.body.hazards.some(h => (h._id || h.id).toString() === hazardId.toString()));

  // 3. Citizen attempts to resolve hazard (FORBIDDEN - 403)
  const forbiddenRes = await request(app)
    .post(`/api/hazards/${hazardId}/resolve`)
    .set('x-user-role', 'citizen')
    .send({ reason: 'Citizen tried to clear this' });

  assert.equal(forbiddenRes.status, 403);
  assert.equal(forbiddenRes.body.success, false);
  assert.equal(forbiddenRes.body.error, 'FORBIDDEN_ROLE');

  // 4. Authority passcode verification
  const verifyRes = await request(app)
    .post('/api/hazards/authority/verify')
    .send({ passcode: 'admin123' });

  assert.equal(verifyRes.status, 200);
  assert.equal(verifyRes.body.success, true);
  assert.equal(verifyRes.body.role, 'authority');

  // 5. Authority resolves hazard (ALLOWED - 200)
  const authorityResolveRes = await request(app)
    .post(`/api/hazards/${hazardId}/resolve`)
    .set('x-user-role', 'authority')
    .send({ reason: 'Construction work completed and road cleared by municipal crew' });

  assert.equal(authorityResolveRes.status, 200);
  assert.equal(authorityResolveRes.body.success, true);
  assert.equal(authorityResolveRes.body.resolvedByRole, 'authority');
  assert.equal(authorityResolveRes.body.hazard.status, 'resolved');
});

test('API - Hazard Details, Image, Landmark, Confirmation & Directory Filtering', async () => {
  // 1. Citizen reports a hazard with landmark and image
  const hazardPayload = {
    type: 'pothole',
    severity: 'high',
    landmark: 'Opposite Takshashila Campus Gate',
    roadName: 'Khandwa Road',
    description: 'Deep road fissure hazardous for two-wheelers',
    imageUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800',
    coordinates: [75.8785, 22.6820]
  };

  const createRes = await request(app)
    .post('/api/hazards')
    .set('x-user-role', 'citizen')
    .send(hazardPayload);

  assert.equal(createRes.status, 201);
  const created = createRes.body.hazard;
  const hazardId = created._id || created.id;
  assert.equal(created.landmark, 'Opposite Takshashila Campus Gate');
  assert.ok(created.imageUrl.includes('unsplash.com'));

  // 2. Fetch complete details by ID (GET /api/hazards/:id)
  const detailRes = await request(app).get(`/api/hazards/${hazardId}`);
  assert.equal(detailRes.status, 200);
  assert.equal(detailRes.body.success, true);
  assert.equal(detailRes.body.hazard.landmark, 'Opposite Takshashila Campus Gate');
  assert.equal(detailRes.body.hazard.type, 'pothole');
  assert.equal(detailRes.body.hazard.severity, 'high');
  assert.equal(detailRes.body.hazard.confirmations, 1);

  // 3. Citizen confirms hazard (POST /api/hazards/:id/confirm)
  const confirmRes = await request(app).post(`/api/hazards/${hazardId}/confirm`);
  assert.equal(confirmRes.status, 200);
  assert.equal(confirmRes.body.success, true);
  assert.equal(confirmRes.body.confirmations, 2);

  // 4. Query status filters (?status=all, ?status=active)
  const activeRes = await request(app).get('/api/hazards?status=active');
  assert.equal(activeRes.status, 200);
  assert.ok(activeRes.body.hazards.some(h => (h._id || h.id).toString() === hazardId.toString()));

  // 5. Authority resolves it
  await request(app)
    .post(`/api/hazards/${hazardId}/resolve`)
    .set('x-user-role', 'authority')
    .send({ reason: 'Patched with cold asphalt mix' });

  // 6. Verify resolved status filter
  const resolvedRes = await request(app).get('/api/hazards?status=resolved');
  assert.equal(resolvedRes.status, 200);
  assert.ok(resolvedRes.body.hazards.some(h => (h._id || h.id).toString() === hazardId.toString()));

  const allRes = await request(app).get('/api/hazards?status=all');
  assert.equal(allRes.status, 200);
  assert.ok(allRes.body.hazards.some(h => (h._id || h.id).toString() === hazardId.toString()));
});
