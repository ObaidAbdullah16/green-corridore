import { PriorityQueue } from './PriorityQueue.js';
import {
  haversineDistance,
  calculateBearing,
  getTurnInstruction,
  distanceToLineString
} from './GeoUtils.js';

const MAX_SPEED_MPS = (80 * 1000) / 3600; // 80 km/h in meters/sec (~22.22 m/s)

export class AStarRouter {
  /**
   * @param {RoadGraph} roadGraph
   */
  constructor(roadGraph) {
    this.graph = roadGraph;
  }

  /**
   * Admissible geographic heuristic for travel time in seconds.
   * h(n) = haversine(n, goal) / MAX_SPEED_MPS
   */
  _heuristic(nodeLat, nodeLon, targetLat, targetLon) {
    const distMeters = haversineDistance(nodeLat, nodeLon, targetLat, targetLon);
    return distMeters / MAX_SPEED_MPS;
  }

  /**
   * Calculate route from origin [lat, lon] to destination [lat, lon].
   * @param {[number, number]} origin [lat, lon]
   * @param {[number, number]} destination [lat, lon]
   * @param {Object} options
   * @returns {Object} Route result
   */
  findRoute(origin, destination, options = {}) {
    const [startLat, startLon] = origin;
    const [endLat, endLon] = destination;

    // Validate coordinates
    if (
      isNaN(startLat) || isNaN(startLon) ||
      isNaN(endLat) || isNaN(endLon) ||
      startLat < -90 || startLat > 90 ||
      endLat < -90 || endLat > 90 ||
      startLon < -180 || startLon > 180 ||
      endLon < -180 || endLon > 180
    ) {
      return {
        success: false,
        error: 'INVALID_COORDINATES',
        message: 'The supplied coordinates are invalid numbers or out of range.'
      };
    }

    // 1. Snap origin and destination to nearest road segments
    const startSnap = this.graph.spatialIndex.findNearestEdge(startLat, startLon, 1500);
    let endSnap = this.graph.spatialIndex.findNearestEdge(endLat, endLon, 1500);

    if (!startSnap) {
      return {
        success: false,
        error: 'START_OUT_OF_BOUNDS',
        message: 'Origin location is outside the supported coverage area around IET DAVV Indore.'
      };
    }

    if (!endSnap) {
      return {
        success: false,
        error: 'DESTINATION_OUT_OF_BOUNDS',
        message: 'Destination location is outside the supported coverage area around IET DAVV Indore.'
      };
    }

    // Safeguard: If destination snaps directly to an impassable roadblock edge,
    // find the closest accessible drivable road adjacent to it.
    let destinationNearRoadblockWarning = null;
    if (this.graph.getEdgeCost(endSnap.edge, false).isImpassable) {
      const passableSnap = this.graph.spatialIndex.findNearestEdge(
        endLat,
        endLon,
        1500,
        (edge) => !this.graph.getEdgeCost(edge, false).isImpassable
      );
      if (passableSnap) {
        endSnap = passableSnap;
        destinationNearRoadblockWarning = 'Destination road is blocked by an active roadblock. Route safely guides you to the nearest accessible access point.';
      }
    }

    const requestedOrigin = [startLon, startLat]; // [lon, lat]
    const requestedDestination = [endLon, endLat]; // [lon, lat]

    // Attempt routing: first without impassable edges, then with impassable fallback if needed
    let routeResult = this._runAStar(startSnap, endSnap, false, requestedOrigin, requestedDestination);

    if (!routeResult && !options.disallowImpassableFallback) {
      // Try again allowing impassable edges with penalty warning
      routeResult = this._runAStar(startSnap, endSnap, true, requestedOrigin, requestedDestination);
      if (routeResult) {
        routeResult.warning = 'Route passes through a reported roadblock or impassable hazard because no alternative road exists.';
      }
    }

    if (routeResult && destinationNearRoadblockWarning && !routeResult.warning) {
      routeResult.warning = destinationNearRoadblockWarning;
    }

    if (!routeResult) {
      return {
        success: false,
        error: 'NO_ROUTE_FOUND',
        message: 'No connected drivable road network exists between the selected origin and destination.'
      };
    }

    return {
      success: true,
      ...routeResult
    };
  }

  /**
   * Run A* algorithm between snapped endpoints.
   */
  _runAStar(startSnap, endSnap, allowImpassable, requestedOrigin = null, requestedDestination = null) {
    const startEdge = startSnap.edge;
    const endEdge = endSnap.edge;

    const startProj = startSnap.projection; // [lon, lat]
    const endProj = endSnap.projection;     // [lon, lat]

    // Check if origin and destination are on the exact same road edge
    if (startEdge.id === endEdge.id) {
      if (startSnap.ratio <= endSnap.ratio) {
        // Simple direct forward segment
        const dist = haversineDistance(startProj[1], startProj[0], endProj[1], endProj[0]);
        const dur = (dist / ((startEdge.speedKmh * 1000) / 3600));
        const edgeCostInfo = this.graph.getEdgeCost(startEdge, allowImpassable);

        return this._buildRouteResponse({
          geometry: [startProj, endProj],
          distance: dist,
          duration: dur,
          edges: [startEdge],
          hazards: edgeCostInfo.hazards,
          requestedOrigin,
          requestedDestination,
          snappedStart: startProj,
          snappedEnd: endProj
        });
      }
    }

    // Set up priority queue and cost maps
    const openSet = new PriorityQueue();
    const gScore = new Map(); // nodeId -> gScore
    const cameFrom = new Map(); // nodeId -> { prevNode, edge }

    const targetLat = endProj[1];
    const targetLon = endProj[0];

    const START_NODE = '__START__';
    const GOAL_NODE = '__GOAL__';

    gScore.set(START_NODE, 0);

    // Initial connections from START_NODE:
    // Forward direction: START -> startEdge.to
    const forwardCost = this.graph.getEdgeCost(startEdge, allowImpassable);
    if (forwardCost.cost !== Infinity) {
      const remainingRatio = 1 - startSnap.ratio;
      const initialDist = startEdge.distance * remainingRatio;
      const initialCost = forwardCost.cost * remainingRatio;

      const toNode = this.graph.getNode(startEdge.to);
      if (toNode) {
        gScore.set(startEdge.to, initialCost);
        cameFrom.set(startEdge.to, {
          prevNode: START_NODE,
          edge: {
            ...startEdge,
            distance: initialDist,
            duration: initialCost,
            geometry: [startProj, [toNode.lon, toNode.lat]]
          }
        });
        const h = this._heuristic(toNode.lat, toNode.lon, targetLat, targetLon);
        openSet.push(startEdge.to, initialCost + h);
      }
    }

    // Check if start edge is two-way (look for reverse edge in adjacency)
    const reverseStartEdges = this.graph.getOutgoingEdges(startEdge.to).filter(e => e.to === startEdge.from);
    if (reverseStartEdges.length > 0) {
      const revEdge = reverseStartEdges[0];
      const revCost = this.graph.getEdgeCost(revEdge, allowImpassable);
      if (revCost.cost !== Infinity) {
        const fromNode = this.graph.getNode(startEdge.from);
        if (fromNode) {
          const initDist = startEdge.distance * startSnap.ratio;
          const initCost = revCost.cost * startSnap.ratio;
          const existingG = gScore.get(startEdge.from) ?? Infinity;

          if (initCost < existingG) {
            gScore.set(startEdge.from, initCost);
            cameFrom.set(startEdge.from, {
              prevNode: START_NODE,
              edge: {
                ...revEdge,
                distance: initDist,
                duration: initCost,
                geometry: [startProj, [fromNode.lon, fromNode.lat]]
              }
            });
            const h = this._heuristic(fromNode.lat, fromNode.lon, targetLat, targetLon);
            openSet.push(startEdge.from, initCost + h);
          }
        }
      }
    }

    let goalReached = false;
    let finalGoalEdge = null;
    let visitedCount = 0;
    const MAX_VISITS = 40000;

    while (!openSet.isEmpty()) {
      const current = openSet.pop();
      visitedCount++;
      if (visitedCount > MAX_VISITS) break;

      const currentG = gScore.get(current);

      // Check if current is the start of endEdge (or reverse of endEdge)
      if (current === endEdge.from) {
        // Can reach destination along endEdge
        const endCost = this.graph.getEdgeCost(endEdge, allowImpassable);
        if (endCost.cost !== Infinity) {
          const finalDist = endEdge.distance * endSnap.ratio;
          const finalDuration = endCost.cost * endSnap.ratio;
          const totalCostToGoal = currentG + finalDuration;

          const existingGoalG = gScore.get(GOAL_NODE) ?? Infinity;
          if (totalCostToGoal < existingGoalG) {
            gScore.set(GOAL_NODE, totalCostToGoal);
            cameFrom.set(GOAL_NODE, {
              prevNode: current,
              edge: {
                ...endEdge,
                distance: finalDist,
                duration: finalDuration,
                geometry: [[this.graph.getNode(current).lon, this.graph.getNode(current).lat], endProj]
              }
            });
            goalReached = true;
          }
        }
      }

      // Check if two-way reaching destination from endEdge.to
      const reverseEndEdges = this.graph.getOutgoingEdges(endEdge.to).filter(e => e.to === endEdge.from);
      if (reverseEndEdges.length > 0 && current === endEdge.to) {
        const revEdge = reverseEndEdges[0];
        const revCost = this.graph.getEdgeCost(revEdge, allowImpassable);
        if (revCost.cost !== Infinity) {
          const finalDist = endEdge.distance * (1 - endSnap.ratio);
          const finalDuration = revCost.cost * (1 - endSnap.ratio);
          const totalCostToGoal = currentG + finalDuration;

          const existingGoalG = gScore.get(GOAL_NODE) ?? Infinity;
          if (totalCostToGoal < existingGoalG) {
            gScore.set(GOAL_NODE, totalCostToGoal);
            cameFrom.set(GOAL_NODE, {
              prevNode: current,
              edge: {
                ...revEdge,
                distance: finalDist,
                duration: finalDuration,
                geometry: [[this.graph.getNode(current).lon, this.graph.getNode(current).lat], endProj]
              }
            });
            goalReached = true;
          }
        }
      }

      // If we already reached the goal and current gScore exceeds goal score, we can stop
      if (goalReached && currentG >= (gScore.get(GOAL_NODE) ?? Infinity)) {
        break;
      }

      const neighbors = this.graph.getOutgoingEdges(current);
      for (const edge of neighbors) {
        const costInfo = this.graph.getEdgeCost(edge, allowImpassable);
        if (costInfo.cost === Infinity) continue;

        const neighbor = edge.to;
        const neighborNode = this.graph.getNode(neighbor);
        if (!neighborNode) continue;

        const tentativeG = currentG + costInfo.cost;
        const existingG = gScore.get(neighbor) ?? Infinity;

        if (tentativeG < existingG) {
          gScore.set(neighbor, tentativeG);
          cameFrom.set(neighbor, {
            prevNode: current,
            edge
          });
          const h = this._heuristic(neighborNode.lat, neighborNode.lon, targetLat, targetLon);
          openSet.push(neighbor, tentativeG + h);
        }
      }
    }

    if (!goalReached || !cameFrom.has(GOAL_NODE)) {
      return null;
    }

    // Reconstruct path
    const pathEdges = [];
    let curr = GOAL_NODE;

    while (curr !== START_NODE) {
      const step = cameFrom.get(curr);
      if (!step) break;
      pathEdges.unshift(step.edge);
      curr = step.prevNode;
    }

    return this._assembleRouteFromEdges(pathEdges, startProj, endProj, requestedOrigin, requestedDestination);
  }

  /**
   * Assemble GeoJSON geometry, distance, duration, turn instructions, and hazard list from edges.
   */
  _assembleRouteFromEdges(edges, startProj, endProj, requestedOrigin = null, requestedDestination = null) {
    let totalDistance = 0;
    let totalDuration = 0;
    const geometry = [];
    const encounteredHazards = new Map();

    // Access leg from user's exact requested origin to the road network entrance
    if (requestedOrigin) {
      const origDist = haversineDistance(requestedOrigin[1], requestedOrigin[0], startProj[1], startProj[0]);
      if (origDist > 0.5) {
        geometry.push(requestedOrigin);
        totalDistance += origDist;
        totalDuration += origDist / 1.4; // access speed ~5 km/h
      }
    }

    geometry.push(startProj);

    for (let i = 0; i < edges.length; i++) {
      const edge = edges[i];
      totalDistance += edge.distance;
      totalDuration += edge.duration;

      // Hazards on edge
      const edgeHazards = this.graph.edgeHazardState.get(edge.id);
      if (edgeHazards && edgeHazards.hazards) {
        for (const h of edgeHazards.hazards) {
          encounteredHazards.set(h.id, h);
        }
      }

      // Edge geometry points
      if (edge.geometry && edge.geometry.length > 0) {
        for (let j = 1; j < edge.geometry.length; j++) {
          geometry.push(edge.geometry[j]);
        }
      } else {
        const toNode = this.graph.getNode(edge.to);
        if (toNode) {
          geometry.push([toNode.lon, toNode.lat]);
        }
      }
    }

    // Ensure road network ends at endProj
    const lastCoord = geometry[geometry.length - 1];
    if (haversineDistance(lastCoord[1], lastCoord[0], endProj[1], endProj[0]) > 0.1) {
      geometry.push(endProj);
    }

    // Exit leg from road network to user's exact requested destination
    if (requestedDestination) {
      const destDist = haversineDistance(endProj[1], endProj[0], requestedDestination[1], requestedDestination[0]);
      if (destDist > 0.5) {
        geometry.push(requestedDestination);
        totalDistance += destDist;
        totalDuration += destDist / 1.4;
      }
    }

    // Generate turn-by-turn navigation instructions
    const instructions = this._generateInstructions(edges, geometry);

    return {
      geometry: {
        type: 'LineString',
        coordinates: geometry
      },
      distance: Math.round(totalDistance), // in meters
      duration: Math.round(totalDuration), // in seconds
      instructions,
      hazards: Array.from(encounteredHazards.values()),
      metadata: {
        edgeCount: edges.length,
        requestedOrigin: requestedOrigin || startProj,
        requestedDestination: requestedDestination || endProj,
        snappedStart: startProj,
        snappedEnd: endProj
      }
    };
  }

  _buildRouteResponse({ geometry, distance, duration, edges, hazards, requestedOrigin = null, requestedDestination = null, snappedStart = null, snappedEnd = null }) {
    const fullGeometry = [];
    let totalDist = distance;
    let totalDur = duration;

    if (requestedOrigin) {
      fullGeometry.push(requestedOrigin);
      const d = haversineDistance(requestedOrigin[1], requestedOrigin[0], geometry[0][1], geometry[0][0]);
      if (d > 0.5) {
        totalDist += d;
        totalDur += d / 1.4;
      }
    }

    for (const pt of geometry) {
      if (fullGeometry.length === 0 || haversineDistance(pt[1], pt[0], fullGeometry[fullGeometry.length - 1][1], fullGeometry[fullGeometry.length - 1][0]) > 0.1) {
        fullGeometry.push(pt);
      }
    }

    if (requestedDestination) {
      const d = haversineDistance(fullGeometry[fullGeometry.length - 1][1], fullGeometry[fullGeometry.length - 1][0], requestedDestination[1], requestedDestination[0]);
      if (d > 0.5) {
        fullGeometry.push(requestedDestination);
        totalDist += d;
        totalDur += d / 1.4;
      }
    }

    return {
      geometry: {
        type: 'LineString',
        coordinates: fullGeometry
      },
      distance: Math.round(totalDist),
      duration: Math.round(totalDur),
      instructions: [
        {
          type: 'depart',
          text: `Depart on ${edges[0]?.name || 'road'}`,
          distance: Math.round(totalDist),
          duration: Math.round(totalDur),
          coordinate: fullGeometry[0]
        },
        {
          type: 'arrive',
          text: 'You have reached your destination',
          distance: 0,
          duration: 0,
          coordinate: fullGeometry[fullGeometry.length - 1]
        }
      ],
      hazards: hazards || [],
      metadata: {
        edgeCount: edges.length,
        requestedOrigin: requestedOrigin || fullGeometry[0],
        requestedDestination: requestedDestination || fullGeometry[fullGeometry.length - 1],
        snappedStart: snappedStart || fullGeometry[0],
        snappedEnd: snappedEnd || fullGeometry[fullGeometry.length - 1]
      }
    };
  }

  /**
   * Generate turn-by-turn navigation instructions from road edges.
   */
  _generateInstructions(edges, geometry) {
    if (!edges || edges.length === 0) return [];

    const instructions = [];

    // Depart instruction
    const firstEdge = edges[0];
    instructions.push({
      step: 1,
      type: 'depart',
      text: `Head ${this._getCompassHeading(geometry[0], geometry[1])} on ${firstEdge.name || 'unnamed road'}`,
      road: firstEdge.name || 'Road',
      distance: Math.round(firstEdge.distance),
      duration: Math.round(firstEdge.duration),
      coordinate: geometry[0]
    });

    let currentRoad = firstEdge.name || '';
    let accumulatedDistance = firstEdge.distance;
    let accumulatedDuration = firstEdge.duration;

    for (let i = 1; i < edges.length; i++) {
      const prevEdge = edges[i - 1];
      const currEdge = edges[i];

      const prevCoords = prevEdge.geometry || [];
      const currCoords = currEdge.geometry || [];

      // Calculate bearings
      let bearing1 = 0;
      let bearing2 = 0;

      if (prevCoords.length >= 2) {
        const pA = prevCoords[prevCoords.length - 2];
        const pB = prevCoords[prevCoords.length - 1];
        bearing1 = calculateBearing(pA[1], pA[0], pB[1], pB[0]);
      }

      if (currCoords.length >= 2) {
        const cA = currCoords[0];
        const cB = currCoords[1];
        bearing2 = calculateBearing(cA[1], cA[0], cB[1], cB[0]);
      }

      const turn = getTurnInstruction(bearing1, bearing2, currEdge.name);

      // Create instruction if significant turn or change of road name
      if (turn.type !== 'continue' || (currEdge.name && currEdge.name !== currentRoad)) {
        instructions.push({
          step: instructions.length + 1,
          type: turn.type,
          text: turn.text,
          road: currEdge.name || currentRoad || 'Road',
          distance: Math.round(currEdge.distance),
          duration: Math.round(currEdge.duration),
          coordinate: currCoords[0] || geometry[i]
        });
        currentRoad = currEdge.name;
        accumulatedDistance = currEdge.distance;
        accumulatedDuration = currEdge.duration;
      } else {
        // Accumulate distance on same road
        accumulatedDistance += currEdge.distance;
        accumulatedDuration += currEdge.duration;
        const lastInst = instructions[instructions.length - 1];
        if (lastInst) {
          lastInst.distance += Math.round(currEdge.distance);
          lastInst.duration += Math.round(currEdge.duration);
        }
      }
    }

    // Arrive instruction
    instructions.push({
      step: instructions.length + 1,
      type: 'arrive',
      text: 'Arrive at destination',
      road: currentRoad,
      distance: 0,
      duration: 0,
      coordinate: geometry[geometry.length - 1]
    });

    return instructions;
  }

  _getCompassHeading(coord1, coord2) {
    if (!coord1 || !coord2) return 'forward';
    const bearing = calculateBearing(coord1[1], coord1[0], coord2[1], coord2[0]);
    if (bearing >= 337.5 || bearing < 22.5) return 'north';
    if (bearing >= 22.5 && bearing < 67.5) return 'northeast';
    if (bearing >= 67.5 && bearing < 112.5) return 'east';
    if (bearing >= 112.5 && bearing < 157.5) return 'southeast';
    if (bearing >= 157.5 && bearing < 202.5) return 'south';
    if (bearing >= 202.5 && bearing < 247.5) return 'southwest';
    if (bearing >= 247.5 && bearing < 292.5) return 'west';
    return 'northwest';
  }
}
