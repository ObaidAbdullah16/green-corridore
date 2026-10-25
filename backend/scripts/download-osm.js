import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Bounding box around IET DAVV Indore (~10km radius coverage area)
// Centered at 22.6815, 75.8683
// S: 22.62, W: 75.80, N: 22.75, E: 75.93
const BBOX = {
  south: 22.6200,
  west: 75.8000,
  north: 22.7500,
  east: 75.9300
};

// Drivable road types in OSM
const query = `
[out:json][timeout:60];
(
  way["highway"~"^(motorway|trunk|primary|secondary|tertiary|residential|unclassified)$"]["motor_vehicle"!~"no"]["access"!~"no|private"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});
);
(._;>;);
out body;
`;

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://z.overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter'
];

export async function downloadOSM() {
  const outputDir = path.join(__dirname, '../src/data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const rawFile = path.join(outputDir, 'indore-osm-raw.json');

  console.log(`Downloading real OSM road network for Indore [${BBOX.south}, ${BBOX.west}, ${BBOX.north}, ${BBOX.east}]...`);

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      console.log(`Trying ${endpoint}...`);
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'NaviHazard/1.0 (ietdavv-navigation-research)'
        },
        body: 'data=' + encodeURIComponent(query)
      });

      if (!response.ok) {
        console.warn(`${endpoint} status ${response.status}`);
        continue;
      }

      const data = await response.json();
      if (!data.elements || data.elements.length === 0) {
        console.warn(`Zero elements from ${endpoint}`);
        continue;
      }

      console.log(`Received ${data.elements.length} elements from OpenStreetMap!`);
      fs.writeFileSync(rawFile, JSON.stringify(data));
      console.log(`Saved raw OSM data to ${rawFile} (${(fs.statSync(rawFile).size / (1024 * 1024)).toFixed(2)} MB)`);
      return true;
    } catch (err) {
      console.warn(`Error connecting to ${endpoint}: ${err.message}`);
    }
  }

  throw new Error('All Overpass mirrors failed.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  downloadOSM()
    .then(() => {
      console.log('OSM download completed successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Download failed:', err.message);
      process.exit(1);
    });
}
