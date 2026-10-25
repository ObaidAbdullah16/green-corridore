import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { RoadGraph } from '../src/engine/Graph.js';
import { AStarRouter } from '../src/engine/AStarRouter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const graphPath = path.join(__dirname, '../src/data/indore-road-graph.json');
const graphData = JSON.parse(fs.readFileSync(graphPath, 'utf8'));
const roadGraph = new RoadGraph(graphData);
const router = new AStarRouter(roadGraph);

test('A* Routing Engine - Basic Route Calculation', () => {
  const origin = [22.6815, 75.8683]; // IET DAVV Indore
  const destination = [22.6926, 75.8676]; // Bhanwarkua Square

  const result = router.findRoute(origin, destination);

  assert.equal(result.success, true, 'Route should succeed');
  assert.ok(result.distance > 500, 'Distance should be positive and realistic');
  assert.ok(result.duration > 0, 'Duration should be positive');
  assert.ok(result.geometry.coordinates.length >= 2, 'Route should have multiple geometry points');
  assert.ok(result.instructions.length >= 2, 'Route should have turn instructions');

  // Verify GeoJSON format [longitude, latitude]
  const firstPoint = result.geometry.coordinates[0];
  assert.ok(firstPoint[0] > 70 && firstPoint[0] < 80, 'First coordinate should be longitude');
  assert.ok(firstPoint[1] > 20 && firstPoint[1] < 25, 'Second coordinate should be latitude');
});

test('A* Routing Engine - Snapping Mechanism', () => {
  // Coordinate slightly off the road center
  const origin = [22.6817, 75.8686];
  const snap = roadGraph.spatialIndex.findNearestEdge(origin[0], origin[1], 500);

  assert.ok(snap !== null, 'Snapping should find a valid road segment');
  assert.ok(snap.distance >= 0, 'Snap distance should be valid');
  assert.ok(snap.projection.length === 2, 'Projection should return [lon, lat]');
});

test('A* Routing Engine - Rejects Invalid Coordinates', () => {
  const invalidResult = router.findRoute([999, 999], [22.6926, 75.8676]);
  assert.equal(invalidResult.success, false);
  assert.equal(invalidResult.error, 'INVALID_COORDINATES');
});

test('A* Routing Engine - Handles Out of Bounds Coordinates', () => {
  // Delhi coordinates (far outside Indore coverage)
  const outOfBoundsResult = router.findRoute([28.6139, 77.2090], [22.6926, 75.8676]);
  assert.equal(outOfBoundsResult.success, false);
  assert.equal(outOfBoundsResult.error, 'START_OUT_OF_BOUNDS');
});

test('A* Routing Engine - Produces Multiple Connected Road Segments', () => {
  const origin = [22.6815, 75.8683]; // IET DAVV
  const destination = [22.7196, 75.8577]; // Rajwada Palace (~5 km away)

  const result = router.findRoute(origin, destination);
  assert.equal(result.success, true);
  assert.ok(result.metadata.edgeCount >= 5, 'Path should consist of multiple connected road edges');
  assert.ok(result.distance > 4000, 'Distance from IET DAVV to Rajwada should be at least 4km');
});
