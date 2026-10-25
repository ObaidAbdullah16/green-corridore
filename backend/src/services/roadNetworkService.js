import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { RoadGraph } from '../engine/Graph.js';
import { AStarRouter } from '../engine/AStarRouter.js';
import { distanceToLineString } from '../engine/GeoUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class RoadNetworkService {
  constructor() {
    this.graph = null;
    this.router = null;
    this.isReady = false;
  }

  async initialize() {
    if (this.isReady) return;

    const graphFile = path.join(__dirname, '../data/indore-road-graph.json');
    if (!fs.existsSync(graphFile)) {
      throw new Error(`Road graph file not found at ${graphFile}. Please run 'npm run build-graph' first.`);
    }

    console.log('Loading Indore road-network graph into memory...');
    const startTime = performance.now();
    const rawData = fs.readFileSync(graphFile, 'utf8');
    const graphData = JSON.parse(rawData);
    this.graph = new RoadGraph(graphData);
    this.router = new AStarRouter(this.graph);
    this.isReady = true;
    const loadTime = Math.round(performance.now() - startTime);
    console.log(`Road network initialized in ${loadTime} ms (${this.graph.edges.length} edges, ${Object.keys(this.graph.nodes).length} nodes).`);
  }

  getRouter() {
    if (!this.isReady) throw new Error('Road network not yet initialized.');
    return this.router;
  }

  getGraph() {
    if (!this.isReady) throw new Error('Road network not yet initialized.');
    return this.graph;
  }

  calculateRoute(origin, destination, options = {}) {
    return this.getRouter().findRoute(origin, destination, options);
  }

  applyHazard(hazard) {
    if (!this.isReady) return 0;
    return this.graph.applyHazard(hazard);
  }

  removeHazard(hazardId) {
    if (!this.isReady) return;
    this.graph.removeHazard(hazardId);
  }

  syncHazards(hazards) {
    if (!this.isReady) return;
    this.graph.syncHazards(hazards);
  }

  /**
   * Check if a hazard point impacts a specific route's LineString geometry.
   * @param {[number, number]} point [lon, lat]
   * @param {Array<[number, number]>} routeCoordinates [[lon, lat], ...]
   * @param {number} thresholdMeters
   * @returns {{ isImpacted: boolean, distance: number }}
   */
  checkRouteImpact(point, routeCoordinates, thresholdMeters = 50) {
    const res = distanceToLineString(point, routeCoordinates, thresholdMeters);
    return {
      isImpacted: res.isNear,
      distance: Math.round(res.minDistance)
    };
  }
}

export const roadNetworkService = new RoadNetworkService();
