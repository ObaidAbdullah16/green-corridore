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

const origin = [22.6815, 75.8683]; // IET DAVV
const destination = [22.6926, 75.8676]; // Bhanwarkua

console.log('--- 1. Baseline Route (No hazards) ---');
const baseline = router.findRoute(origin, destination);
console.log(`Baseline Distance: ${baseline.distance}m, Duration: ${baseline.duration}s`);

// Pick an intermediate point from baseline route to place a roadblock hazard
const midPoint = baseline.geometry.coordinates[Math.floor(baseline.geometry.coordinates.length / 2)];
console.log(`Placing Roadblock at intermediate point: [lat: ${midPoint[1]}, lon: ${midPoint[0]}]`);

const testHazard = {
  _id: 'hazard_test_roadblock_1',
  type: 'roadblock',
  severity: 'high',
  description: 'Severe waterlogging / roadblock near IT Park',
  location: {
    type: 'Point',
    coordinates: [midPoint[0], midPoint[1]]
  },
  status: 'active'
};

const affectedEdges = roadGraph.applyHazard(testHazard);
console.log(`Hazard applied to ${affectedEdges} nearby road edges.`);

console.log('--- 2. Hazard-Aware Route (With Roadblock) ---');
const detour = router.findRoute(origin, destination);
console.log(`Detour Distance: ${detour.distance}m, Duration: ${detour.duration}s`);
console.log(`Warning message if any:`, detour.warning || 'None (Alternative route found cleanly!)');

if (detour.distance !== baseline.distance || detour.duration !== baseline.duration) {
  console.log(`SUCCESS: A* algorithm took an alternative route to avoid the roadblock!`);
} else {
  console.log(`Notice: Same distance, checking if penalty was applied.`);
}

console.log('--- 3. Resolving Hazard ---');
roadGraph.removeHazard('hazard_test_roadblock_1');
const restored = router.findRoute(origin, destination);
console.log(`Restored Distance: ${restored.distance}m, Duration: ${restored.duration}s`);
if (restored.distance === baseline.distance && restored.duration === baseline.duration) {
  console.log('SUCCESS: Hazard removal successfully restored original optimal route!');
}
