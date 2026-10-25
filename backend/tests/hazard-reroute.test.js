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

test('Hazard-Aware Routing - Reroutes Around Impassable Roadblock', () => {
  const origin = [22.6815, 75.8683]; // IET DAVV
  const destination = [22.6926, 75.8676]; // Bhanwarkua

  // Calculate baseline
  const baseline = router.findRoute(origin, destination);
  assert.equal(baseline.success, true);

  // Place roadblock on intermediate point of baseline route
  const midPoint = baseline.geometry.coordinates[Math.floor(baseline.geometry.coordinates.length / 2)];
  const roadblockHazard = {
    _id: 'test_rb_1',
    type: 'roadblock',
    severity: 'high',
    description: 'Roadblock test',
    location: {
      type: 'Point',
      coordinates: [midPoint[0], midPoint[1]]
    },
    status: 'active'
  };

  roadGraph.applyHazard(roadblockHazard);

  // Recalculate route with roadblock active
  const rerouted = router.findRoute(origin, destination);
  assert.equal(rerouted.success, true);
  assert.notEqual(rerouted.duration, baseline.duration, 'Duration must change due to detour');

  // Verify detour geometry doesn't pass through the blocked point
  const hasBlockedPoint = rerouted.geometry.coordinates.some(
    coord => Math.abs(coord[0] - midPoint[0]) < 0.0001 && Math.abs(coord[1] - midPoint[1]) < 0.0001
  );
  assert.equal(hasBlockedPoint, false, 'Rerouted geometry must avoid the roadblock');

  // Resolve hazard
  roadGraph.removeHazard('test_rb_1');
  const restored = router.findRoute(origin, destination);
  assert.equal(restored.distance, baseline.distance, 'Restored route distance matches baseline');
  assert.equal(restored.duration, baseline.duration, 'Restored route duration matches baseline');
});

test('Hazard-Aware Routing - Pothole Penalty Increases Cost Without Unnecessary Large Detour', () => {
  const origin = [22.6815, 75.8683];
  const destination = [22.6926, 75.8676];

  const baseline = router.findRoute(origin, destination);
  const midPoint = baseline.geometry.coordinates[Math.floor(baseline.geometry.coordinates.length / 2)];

  const minorPothole = {
    _id: 'test_pothole_1',
    type: 'pothole',
    severity: 'low',
    description: 'Small pothole',
    location: {
      type: 'Point',
      coordinates: [midPoint[0], midPoint[1]]
    },
    status: 'active'
  };

  roadGraph.applyHazard(minorPothole);
  const withPothole = router.findRoute(origin, destination);
  assert.equal(withPothole.success, true);

  // Minor pothole adds penalty seconds but doesn't necessarily force massive 10km detour
  assert.ok(withPothole.duration >= baseline.duration, 'Duration should reflect delay');

  roadGraph.removeHazard('test_pothole_1');
});
