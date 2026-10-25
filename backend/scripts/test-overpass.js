const query = `
[out:json][timeout:45];
(
  way["highway"~"^(motorway|trunk|primary|secondary|tertiary|residential)$"](22.65,75.83,22.73,75.92);
);
(._;>;);
out body;
`;

const mirrors = [
  'https://overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://z.overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter'
];

async function testMirrors() {
  for (const url of mirrors) {
    try {
      console.log(`Testing ${url}...`);
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'NaviHazard/1.0 (test@ietdavv.edu)'
        },
        body: 'data=' + encodeURIComponent(query)
      });
      console.log(`Status from ${url}:`, res.status);
      if (res.ok) {
        const data = await res.json();
        console.log(`Success! Elements count:`, data.elements ? data.elements.length : 0);
        return data;
      }
    } catch (e) {
      console.log(`Error from ${url}:`, e.message);
    }
  }
}

testMirrors();
