import { projectPointOnSegment, haversineDistance } from './GeoUtils.js';

/**
 * Grid-based Spatial Index for O(1) nearest-road snapping and hazard proximity queries.
 */
export class SpatialIndex {
  constructor(bbox, cellSizeDegrees = 0.005) { // ~500m cells
    this.bbox = bbox; // { south, west, north, east }
    this.cellSize = cellSizeDegrees;
    this.grid = new Map(); // key "cellX,cellY" -> array of items
    this.edgeLookup = new Map(); // edgeId -> edge object
  }

  _getCellKey(lon, lat) {
    const x = Math.floor((lon - this.bbox.west) / this.cellSize);
    const y = Math.floor((lat - this.bbox.south) / this.cellSize);
    return `${x},${y}`;
  }

  _getCellCoords(lon, lat) {
    const x = Math.floor((lon - this.bbox.west) / this.cellSize);
    const y = Math.floor((lat - this.bbox.south) / this.cellSize);
    return { x, y };
  }

  /**
   * Index all road edges in the graph.
   * @param {Array} edges list of edge objects
   * @param {Object} nodes map of nodeId -> { id, lat, lon }
   */
  buildIndex(edges, nodes) {
    this.grid.clear();
    this.edgeLookup.clear();

    for (const edge of edges) {
      this.edgeLookup.set(edge.id, edge);

      const uNode = nodes[edge.from];
      const vNode = nodes[edge.to];
      if (!uNode || !vNode) continue;

      const minLon = Math.min(uNode.lon, vNode.lon);
      const maxLon = Math.max(uNode.lon, vNode.lon);
      const minLat = Math.min(uNode.lat, vNode.lat);
      const maxLat = Math.max(uNode.lat, vNode.lat);

      const minCell = this._getCellCoords(minLon, minLat);
      const maxCell = this._getCellCoords(maxLon, maxLat);

      const item = {
        edgeId: edge.id,
        from: edge.from,
        to: edge.to,
        uLat: uNode.lat,
        uLon: uNode.lon,
        vLat: vNode.lat,
        vLon: vNode.lon,
        edge
      };

      for (let cx = minCell.x; cx <= maxCell.x; cx++) {
        for (let cy = minCell.y; cy <= maxCell.y; cy++) {
          const key = `${cx},${cy}`;
          if (!this.grid.has(key)) {
            this.grid.set(key, []);
          }
          this.grid.get(key).push(item);
        }
      }
    }
  }

  /**
   * Find nearest road segment to a given coordinate.
   * @param {number} lat
   * @param {number} lon
   * @param {number} maxRadiusMeters
   * @param {Function} [filterFn] optional filter function (edge) => boolean
   * @returns {{ edge: Object, projection: [number, number], distance: number, ratio: number } | null}
   */
  findNearestEdge(lat, lon, maxRadiusMeters = 1000, filterFn = null) {
    const center = this._getCellCoords(lon, lat);
    let bestResult = null;
    let minDistance = Infinity;

    // Search expanding rings of cells until nearest edge is found or max radius exceeded
    const maxRing = Math.ceil((maxRadiusMeters / 111000) / this.cellSize) + 1;
    const checkedEdgeIds = new Set();

    for (let ring = 0; ring <= maxRing; ring++) {
      let foundInThisRing = false;

      for (let dx = -ring; dx <= ring; dx++) {
        for (let dy = -ring; dy <= ring; dy++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;

          const key = `${center.x + dx},${center.y + dy}`;
          const items = this.grid.get(key);
          if (!items) continue;

          for (const item of items) {
            if (checkedEdgeIds.has(item.edgeId)) continue;
            checkedEdgeIds.add(item.edgeId);

            if (filterFn && !filterFn(item.edge)) continue;

            const proj = projectPointOnSegment(lat, lon, item.uLat, item.uLon, item.vLat, item.vLon);

            // Favor named/major roads when distances are very close
            const isNamed = item.edge.name && item.edge.name.length > 0;
            const qualityBonus = isNamed ? 0.85 : 1.0;
            const effectiveDist = proj.distance * qualityBonus;

            if (effectiveDist < (bestResult ? bestResult.effectiveDist : Infinity)) {
              minDistance = proj.distance;
              bestResult = {
                edge: item.edge,
                projection: proj.projection,
                distance: proj.distance,
                effectiveDist,
                ratio: proj.ratio
              };
              foundInThisRing = true;
            }
          }
        }
      }

      // Check at least ring 0 and ring 1 before terminating early
      if (ring >= 1 && foundInThisRing && minDistance <= (ring * this.cellSize * 111000 * 0.6)) {
        break;
      }
    }

    if (!bestResult || bestResult.distance > maxRadiusMeters) return null;
    return bestResult;
  }

  /**
   * Find all edges within a radius of a hazard coordinate (for associating hazard with road segments).
   * @param {number} lat
   * @param {number} lon
   * @param {number} radiusMeters
   * @returns {Array<{ edge: Object, distance: number }>}
   */
  findEdgesNearPoint(lat, lon, radiusMeters = 40) {
    const center = this._getCellCoords(lon, lat);
    const ringRadius = Math.ceil((radiusMeters / 111000) / this.cellSize) + 1;
    const checkedEdgeIds = new Set();
    const results = [];

    for (let dx = -ringRadius; dx <= ringRadius; dx++) {
      for (let dy = -ringRadius; dy <= ringRadius; dy++) {
        const key = `${center.x + dx},${center.y + dy}`;
        const items = this.grid.get(key);
        if (!items) continue;

        for (const item of items) {
          if (checkedEdgeIds.has(item.edgeId)) continue;
          checkedEdgeIds.add(item.edgeId);

          const proj = projectPointOnSegment(lat, lon, item.uLat, item.uLon, item.vLat, item.vLon);
          if (proj.distance <= radiusMeters) {
            results.push({
              edge: item.edge,
              distance: proj.distance
            });
          }
        }
      }
    }

    return results;
  }
}
