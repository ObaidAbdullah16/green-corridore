import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { RoadGraph } from '../src/engine/Graph.js';
import { AStarRouter } from '../src/engine/AStarRouter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const graphPath = path.join(__dirname, '../src/data/indore-road-graph.json');
console.log('Loading road graph...');
const graphData = JSON.parse(fs.readFileSync(graphPath, 'utf8'));
const roadGraph = new RoadGraph(graphData);
const router = new AStarRouter(roadGraph);

// Coordinates:
// IET DAVV Indore: 22.6815, 75.8683
// Bhanwarkua Square: 22.6926, 75.8676
console.log('Testing routing from IET DAVV to Bhanwarkua Square...');
const origin = [22.6815, 75.8683];
const destination = [22.6926, 75.8676];

const t0 = performance.now();
const result = router.findRoute(origin, destination);
const t1 = performance.now();

console.log(`Routing took ${(t1 - t0).toFixed(2)} ms`);
console.log('Result status:', result.success);
if (result.success) {
  console.log(`Distance: ${result.distance} meters`);
  console.log(`Duration: ${result.duration} seconds (${(result.duration / 60).toFixed(1)} mins)`);
  console.log(`Geometry points: ${result.geometry.coordinates.length}`);
  console.log('Instructions:');
  result.instructions.forEach(inst => {
    console.log(`  - [${inst.type}] ${inst.text} (${inst.distance}m)`);
  });
} else {
  console.error('Routing failed:', result.message);
}
