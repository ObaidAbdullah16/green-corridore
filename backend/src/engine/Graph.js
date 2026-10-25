import { SpatialIndex } from './SpatialIndex.js';

export const HAZARD_PENALTIES = {
  pothole: {
    low: 15,       // +15s delay
    medium: 45,    // +45s delay
    high: 120,     // +2 min delay
    critical: 240  // +4 min delay
  },
  construction: {
    low: 30,
    medium: 90,
    high: 300,
    critical: 'impassable'
  },
  accident: {
    low: 60,
    medium: 200,
    high: 600,
    critical: 'impassable'
  },
  roadblock: {
    low: 180,
    medium: 600,
    high: 'impassable',
    critical: 'impassable'
  },
  other: {
    low: 20,
    medium: 60,
    high: 180,
    critical: 400
  }
};

export class RoadGraph {
  constructor(graphData) {
    this.metadata = graphData.metadata || {};
    this.nodes = graphData.nodes || {};
    this.adjacency = graphData.adjacency || {};

    // Collect all unique edges for spatial index
    const edges = [];
    for (const fromId in this.adjacency) {
      for (const edge of this.adjacency[fromId]) {
        edges.push(edge);
      }
    }
    this.edges = edges;

    // Active hazard penalties: edgeId -> { penaltySeconds: number, isImpassable: boolean, hazards: Array }
    this.edgeHazardState = new Map();

    // Initialize spatial index
    const bbox = {
      south: 22.5800,
      west: 75.7600,
      north: 22.7800,
      east: 75.9600
    };
    this.spatialIndex = new SpatialIndex(bbox, 0.005);
    this.spatialIndex.buildIndex(this.edges, this.nodes);
    console.log(`Spatial index built with ${edges.length} edges.`);
  }

  /**
   * Apply an active hazard to the road graph.
   * Finds all edges within the hazard radius (default 35m) and registers penalty/impassable status.
   * @param {Object} hazard
   */
  applyHazard(hazard) {
    const lat = hazard.location.coordinates[1];
    const lon = hazard.location.coordinates[0];
    const type = (hazard.type || 'other').toLowerCase();
    const severity = (hazard.severity || 'medium').toLowerCase();

    const penaltyConfig = (HAZARD_PENALTIES[type] && HAZARD_PENALTIES[type][severity]) ?? 60;
    const isImpassable = penaltyConfig === 'impassable';
    const penaltySeconds = isImpassable ? 10000 : penaltyConfig;

    const nearbyEdges = this.spatialIndex.findEdgesNearPoint(lat, lon, 40);

    for (const { edge } of nearbyEdges) {
      let state = this.edgeHazardState.get(edge.id);
      if (!state) {
        state = {
          penaltySeconds: 0,
          isImpassable: false,
          hazards: []
        };
        this.edgeHazardState.set(edge.id, state);
      }

      state.hazards.push({
        id: hazard._id ? hazard._id.toString() : hazard.id,
        type,
        severity,
        description: hazard.description,
        penaltySeconds,
        isImpassable
      });

      // Accumulate penalty, escalate to impassable if any hazard is impassable
      state.penaltySeconds += penaltySeconds;
      if (isImpassable) {
        state.isImpassable = true;
      }
    }

    return nearbyEdges.length;
  }

  /**
   * Remove a resolved or expired hazard from the road graph.
   * @param {string} hazardId
   */
  removeHazard(hazardId) {
    const targetId = hazardId.toString();

    for (const [edgeId, state] of this.edgeHazardState.entries()) {
      const remainingHazards = state.hazards.filter(h => h.id !== targetId);

      if (remainingHazards.length === 0) {
        this.edgeHazardState.delete(edgeId);
      } else {
        let totalPenalty = 0;
        let impassable = false;
        for (const h of remainingHazards) {
          totalPenalty += h.penaltySeconds;
          if (h.isImpassable) impassable = true;
        }
        state.hazards = remainingHazards;
        state.penaltySeconds = totalPenalty;
        state.isImpassable = impassable;
      }
    }
  }

  /**
   * Synchronize active hazards in bulk.
   * @param {Array} hazards
   */
  syncHazards(hazards) {
    this.edgeHazardState.clear();
    for (const h of hazards) {
      if (h.status === 'active') {
        this.applyHazard(h);
      }
    }
  }

  /**
   * Calculate edge traversal cost.
   * @param {Object} edge
   * @param {boolean} allowImpassable - whether to allow traversing impassable edges with huge penalty when no detour exists
   * @returns {{ cost: number, hazardPenalty: number, isImpassable: boolean, hazards: Array }}
   */
  getEdgeCost(edge, allowImpassable = false) {
    const baseDuration = edge.duration; // seconds
    const hazardState = this.edgeHazardState.get(edge.id);

    if (!hazardState) {
      return {
        cost: baseDuration,
        hazardPenalty: 0,
        isImpassable: false,
        hazards: []
      };
    }

    if (hazardState.isImpassable && !allowImpassable) {
      return {
        cost: Infinity,
        hazardPenalty: Infinity,
        isImpassable: true,
        hazards: hazardState.hazards
      };
    }

    return {
      cost: baseDuration + hazardState.penaltySeconds,
      hazardPenalty: hazardState.penaltySeconds,
      isImpassable: hazardState.isImpassable,
      hazards: hazardState.hazards
    };
  }

  /**
   * Get node by ID.
   */
  getNode(nodeId) {
    return this.nodes[nodeId] || null;
  }

  /**
   * Get outgoing edges for a node.
   */
  getOutgoingEdges(nodeId) {
    return this.adjacency[nodeId] || [];
  }
}
