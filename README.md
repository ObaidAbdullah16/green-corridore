# Intelligent Hazard-Aware Navigation System

A full-stack MERN geospatial navigation web application covering an approximately 10 km radius around **IET DAVV, Indore, Madhya Pradesh, India** (Center: `22.6815° N, 75.8683° E`).

The application provides a Google Maps-grade turn-by-turn navigation experience powered by a **custom A* search algorithm** executed directly over a real OpenStreetMap road-network graph (76,578 nodes, 165,666 edges), integrating dynamic hazard avoidance, real-time WebSocket rerouting, GPS location tracking, and off-route deviation recalculation.

---

## 🌟 Key Features

1. **Custom A\* Routing Engine on Real OSM Topology**:
   - Built from authentic OpenStreetMap highway data (ways, nodes, one-way tags, maxspeeds, classifications).
   - Strict topological connectivity (respects roundabouts, dual carriageways, and one-way streets).
   - Mathematically admissible heuristic: $h(n) = \frac{\text{haversine}(n, \text{goal})}{v_{\max}}$ with binary Min-Heap priority queue ($O((|V| + |E|) \log |V|)$).
   - Sub-30 millisecond route calculation across Indore.
   - Precise snapping of origin and destination to the nearest road segment via a $100 \times 100$ spatial grid index.

2. **Dynamic Hazard-Aware Cost Modeling**:
   - Cost function: $\text{edgeCost} = \text{travelCost} + \text{hazardPenalty}$.
   - Supports 5 hazard categories: **Pothole**, **Road Construction**, **Roadblock**, **Accident**, and **Other**.
   - Severity levels: Minor, Moderate, Severe, Impassable.
   - Roadblocks and impassable hazards dynamically trigger detours around blocked segments.
   - If no detour exists, provides emergency route with explicit warning.

3. **Real-Time Hazard Rerouting via Socket.IO**:
   - Real-time bidirectional WebSocket event stream.
   - Targeted spatial route-intersection check: when a new hazard is reported, the backend tests whether any active driver's route passes within 60 meters of the hazard.
   - If impacted, automatically recalculates a safe detour and delivers updated route geometry to the client without page reload or duplicate map layers.

4. **Turn-by-Turn Navigation & GPS Tracking**:
   - Live location tracking with compass heading arrow and animated aura.
   - Turn-by-turn maneuvers (e.g., *"Turn left onto Ring Road in 200m"*).
   - Off-route deviation detection: automatically triggers rerouting when the user takes a wrong turn (> 45m deviation for consecutive observations).
   - **GPS Drive Simulator**: built-in test simulator that moves the vehicle along the planned path at 40 km/h so you can test active navigation and live rerouting from your computer.

5. **Place Search & Autocomplete**:
   - Pre-curated local Indore landmark index (IET DAVV, Bhanwarkua, Rajiv Gandhi Square, Crystal IT Park, Choithram Hospital, Rajwada Palace, Navlakha, Vijay Nagar, 56 Dukan, etc.).
   - Integrated OpenStreetMap Nominatim search fallback with debouncing.

6. **Hazard Lifecycle & Expiration**:
   - Automated server-side expiration runner cleans up expired reports (e.g. accidents expire after 3h, roadblocks after 24h, potholes after 7d).
   - One-click "Mark as Cleared" resolution feature that immediately lifts road penalties and restores optimal paths.

---

## 🏗️ Architecture & Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Tailwind CSS, Lucide Icons, Vite |
| **Map Rendering** | Leaflet, React-Leaflet, CARTO Voyager & OSM Tiles |
| **Backend** | Node.js (v22), Express.js |
| **Database** | MongoDB with Mongoose (with automated resilient in-memory fallback) |
| **Real-Time Sockets** | Socket.IO (v4) |
| **Routing Algorithm** | Custom A* (`AStarRouter.js`, `RoadGraph.js`, `PriorityQueue.js`, `SpatialIndex.js`) |
| **Geospatial Data** | Real OpenStreetMap raw data extract processed into topological graph JSON |

---

## 📁 Repository Structure

```
MajorProject/
├── package.json                 # Root package manager
├── README.md                    # System architecture & setup documentation
├── backend/
│   ├── .env.example             # Example environment variables
│   ├── package.json             # Backend dependencies & scripts
│   ├── src/
│   │   ├── server.js            # Entrypoint (HTTP, Socket.IO, DB, Workers)
│   │   ├── app.js               # Express application configuration
│   │   ├── config/
│   │   │   └── db.js            # Mongoose DB connector with fallback
│   │   ├── engine/
│   │   │   ├── AStarRouter.js   # Custom A* search engine
│   │   │   ├── Graph.js         # RoadGraph with dynamic hazard weights
│   │   │   ├── PriorityQueue.js # Binary Min-Heap
│   │   │   ├── SpatialIndex.js  # Uniform grid index for O(1) snapping
│   │   │   └── GeoUtils.js      # Haversine, bearing, projection, line proximity
│   │   ├── models/
│   │   │   └── Hazard.js        # Mongoose schema with 2dsphere index
│   │   ├── routes/
│   │   │   ├── routeRoutes.js   # POST /api/route
│   │   │   ├── hazardRoutes.js  # GET, POST, POST /:id/resolve
│   │   │   └── geocodeRoutes.js # GET /api/geocode/search
│   │   ├── services/
│   │   │   ├── roadNetworkService.js # Graph singleton & impact checker
│   │   │   ├── hazardService.js      # Reporting, deduplication, resolution, expiration
│   │   │   └── geocodingService.js   # Landmark search & Nominatim
│   │   ├── sockets/
│   │   │   └── socketHandler.js      # Socket.IO active navigation manager
│   │   └── data/
│   │       ├── indore-osm-raw.json   # 94,807 raw OSM elements around Indore
│   │       └── indore-road-graph.json# 76,578 nodes, 165,666 directed edges
│   ├── scripts/
│   │   ├── download-osm.js      # Overpass API downloader for Indore BBOX
│   │   ├── build-graph.js       # Topological graph generator
│   │   └── seed-hazards.js      # Realistic hazard seeder
│   └── tests/
│       ├── astar.test.js        # Routing correctness, snapping, validation
│       ├── hazard-reroute.test.js # Roadblock detour, penalty restoration
│       └── api.test.js          # Supertest API endpoints test
└── frontend/
    ├── package.json             # Frontend dependencies
    ├── vite.config.js           # Vite dev server with /api and /socket.io proxy
    ├── tailwind.config.js       # Tailwind CSS configuration
    ├── index.html               # Main HTML with Leaflet CSS
    └── src/
        ├── App.jsx              # Main application coordinator
        ├── main.jsx             # React entrypoint
        ├── index.css            # Styles & custom Leaflet pulse markers
        ├── hooks/
        │   ├── useSocket.js     # Real-time WebSocket event listener
        │   └── useGeolocation.js# GPS tracking & route drive simulator
        ├── services/
        │   └── api.js           # REST API client
        └── components/
            ├── Common/
            │   ├── Header.jsx   # Top status bar
            │   └── AlertToast.jsx # Rerouting notification toast
            ├── Map/
            │   ├── MapView.jsx  # Leaflet container & controllers
            │   ├── RoutePolyline.jsx # Dual-layer route geometry
            │   ├── HazardMarkers.jsx # Custom SVG pins & popups
            │   └── NavigationMarker.jsx # GPS user marker with heading
            ├── Search/
            │   └── SearchBar.jsx # Dual search with autocomplete & quick chips
            ├── Navigation/
            │   ├── RouteCard.jsx       # Route metrics & Start Navigation
            │   ├── TurnByTurnPanel.jsx # Maneuver drawer
            │   └── ActiveNavOverlay.jsx # Google Maps style HUD
            └── Hazards/
                ├── ReportHazardModal.jsx # Map / GPS hazard reporting form
                └── HazardLegend.jsx     # Routing cost explanation modal
```

---

## 🚀 Installation & Quick Start

### 1. Prerequisites
- **Node.js**: v18+ (tested on Node v22)
- **npm**: v9+
- *(Optional)* **MongoDB**: If running locally at `mongodb://127.0.0.1:27017/hazard_nav`, it connects automatically; if no local MongoDB service is installed, the application automatically boots into resilient in-memory mode with full feature parity!

### 2. Install Dependencies

In the root directory or respective subdirectories:

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
cd ..
```

### 3. Run Automated Tests

To run the automated test suite verifying custom A* routing, one-way enforcement, snapping, hazard penalties, detours, and REST APIs:

```bash
npm --prefix backend test
```

Expected result: **13 passing tests**, 0 failures.

### 4. Start the Application

Open two terminal windows:

**Terminal 1: Start Backend**
```bash
cd backend
npm start
```
*(Server runs at `http://localhost:5000`)*

**Terminal 2: Start Frontend**
```bash
cd frontend
npm run dev
```
*(Frontend opens at `http://localhost:5173`)*

---

## 🧪 Testing the Core Features

1. **Route Calculation**:
   - Open `http://localhost:5173` in your browser.
   - The map loads centered on **IET DAVV, Indore**.
   - Click any quick destination chip (e.g. **Bhanwarkua**, **Rajiv Gandhi Sq**, **Crystal IT Park**, or **Rajwada Palace**).
   - Notice the instant (< 30ms) blue route polyline along real roads with turn directions and distance.

2. **Active Navigation & GPS Simulation**:
   - Click the green **Start Navigation** button.
   - The HUD switches to Google Maps-style navigation with next turn banner.
   - Click **Start Drive** in the bottom simulator bar to watch the vehicle drive smoothly along the street geometry with live speed and heading!

3. **Dynamic Hazard Detour & Rerouting**:
   - In another browser tab or on the map, click **Report Hazard** and place a **Roadblock** on the planned road.
   - Watch the active navigation tab instantly receive a WebSocket notification: *"Hazard Detected Ahead! Rerouting..."*
   - Notice the blue route automatically re-paths itself around the roadblock!

4. **Clearing Hazards**:
   - Click on any hazard marker pin on the map.
   - Click **Mark as Cleared**.
   - The penalty is immediately removed from the road network, restoring original optimal travel paths.

---

## 📐 Algorithmic Details

### Geographic Snapping & Virtual Nodes
To connect arbitrary source $S = (lat_S, lon_S)$ and destination $D = (lat_D, lon_D)$ coordinates to the road network:
1. The spatial grid identifies candidate segments within a 500m bounding cell.
2. The coordinate is projected orthogonally onto the segment $[A, B]$:
   $$t = \text{clamp}\left(\frac{(P - A) \cdot (B - A)}{\|B - A\|^2}, 0, 1\right)$$
3. Virtual start node $S^*$ connects forward to $B$ with distance $(1 - t) \cdot d(A, B)$.
4. If the segment is two-way, $S^*$ also connects backward to $A$ with distance $t \cdot d(A, B)$.
5. If the segment is one-way, backward motion is strictly disallowed, guaranteeing legal street departure.

### A* Cost Model & Admissibility
The traversal cost for an edge $e$ is:
$$\text{Cost}(e) = \frac{\text{length}(e)}{v(e)} + \text{Penalty}_{\text{hazard}}(e)$$
Heuristic function:
$$h(n) = \frac{\text{haversine}(n, \text{goal})}{v_{\max}}$$
Because $v(e) \le v_{\max} = 80 \text{ km/h} \approx 22.22 \text{ m/s}$ and straight-line Haversine distance is the geometric infimum of any path between two points on the sphere:
$$h(n) \le \text{true remaining travel time}(n)$$
Thus $h(n)$ is strictly **admissible** and **monotonic** (consistent), guaranteeing mathematically optimal pathfinding without invalid shortcuts across non-road geometries.
