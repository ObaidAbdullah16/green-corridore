import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { haversineDistance } from '../src/engine/GeoUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SPEED_BY_HIGHWAY = {
  motorway: 80,
  motorway_link: 50,
  trunk: 60,
  trunk_link: 45,
  primary: 50,
  primary_link: 40,
  secondary: 40,
  secondary_link: 30,
  tertiary: 35,
  tertiary_link: 25,
  residential: 25,
  unclassified: 25,
  living_street: 15
};

export function buildRoadGraph(rawOsmFilePath, outputGraphPath) {
  console.log(`Loading raw OSM data from ${rawOsmFilePath}...`);
  const rawData = JSON.parse(fs.readFileSync(rawOsmFilePath, 'utf8'));

  const nodes = new Map();
  const ways = [];

  for (const el of rawData.elements) {
    if (el.type === 'node') {
      nodes.set(el.id, {
        id: el.id,
        lat: el.lat,
        lon: el.lon
      });
    } else if (el.type === 'way') {
      ways.push(el);
    }
  }

  console.log(`Parsed ${nodes.size} nodes and ${ways.length} ways.`);

  // Graph adjacency list: nodeId -> array of outgoing edges
  const adjacency = {};
  const graphNodes = {};
  const allEdges = [];

  let edgeCount = 0;

  for (const way of ways) {
    const tags = way.tags || {};
    const highway = tags.highway || 'residential';
    const name = tags.name || tags.ref || '';
    const speedKmh = parseFloat(tags.maxspeed) || SPEED_BY_HIGHWAY[highway] || 30;

    let oneway = false;
    let reversed = false;

    if (tags.oneway === 'yes' || tags.oneway === '1' || tags.oneway === 'true') {
      oneway = true;
    } else if (tags.oneway === '-1') {
      oneway = true;
      reversed = true;
    } else if (tags.junction === 'roundabout' || highway === 'motorway') {
      oneway = true;
    }

    const wayNodes = way.nodes;
    if (!wayNodes || wayNodes.length < 2) continue;

    for (let i = 0; i < wayNodes.length - 1; i++) {
      const uId = wayNodes[i];
      const vId = wayNodes[i + 1];

      const uNode = nodes.get(uId);
      const vNode = nodes.get(vId);

      if (!uNode || !vNode) continue;

      const dist = haversineDistance(uNode.lat, uNode.lon, vNode.lat, vNode.lon);
      if (dist < 0.05) continue; // skip degenerate duplicates

      const speedMps = (speedKmh * 1000) / 3600;
      const durationSec = dist / speedMps;

      // Register nodes in graph
      if (!graphNodes[uId]) graphNodes[uId] = { id: uId, lat: uNode.lat, lon: uNode.lon };
      if (!graphNodes[vId]) graphNodes[vId] = { id: vId, lat: vNode.lat, lon: vNode.lon };

      if (!adjacency[uId]) adjacency[uId] = [];
      if (!adjacency[vId]) adjacency[vId] = [];

      const createEdge = (fromId, toId, coords) => {
        const edgeId = `e_${way.id}_${fromId}_${toId}`;
        const edge = {
          id: edgeId,
          from: fromId,
          to: toId,
          distance: Math.round(dist * 100) / 100, // meters
          duration: Math.round(durationSec * 10) / 10, // seconds
          speedKmh,
          highway,
          name,
          wayId: way.id,
          geometry: coords // [[lon, lat], [lon, lat]]
        };
        adjacency[fromId].push(edge);
        allEdges.push(edge);
        edgeCount++;
      };

      const forwardCoords = [
        [uNode.lon, uNode.lat],
        [vNode.lon, vNode.lat]
      ];
      const reverseCoords = [
        [vNode.lon, vNode.lat],
        [uNode.lon, uNode.lat]
      ];

      if (reversed) {
        // Only v -> u
        createEdge(vId, uId, reverseCoords);
      } else if (oneway) {
        // Only u -> v
        createEdge(uId, vId, forwardCoords);
      } else {
        // Both directions u -> v and v -> u
        createEdge(uId, vId, forwardCoords);
        createEdge(vId, uId, reverseCoords);
      }
    }
  }

  const graphData = {
    metadata: {
      createdAt: new Date().toISOString(),
      nodeCount: Object.keys(graphNodes).length,
      edgeCount,
      coverageArea: 'Indore (approx 10km radius around IET DAVV)'
    },
    nodes: graphNodes,
    adjacency,
    edges: allEdges
  };

  console.log(`Graph built: ${graphData.metadata.nodeCount} connected nodes, ${edgeCount} directed edges.`);
  fs.writeFileSync(outputGraphPath, JSON.stringify(graphData));
  console.log(`Saved graph to ${outputGraphPath} (${(fs.statSync(outputGraphPath).size / (1024 * 1024)).toFixed(2)} MB)`);
  return graphData;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const rawFile = path.join(__dirname, '../src/data/indore-osm-raw.json');
  const graphFile = path.join(__dirname, '../src/data/indore-road-graph.json');
  buildRoadGraph(rawFile, graphFile);
}
