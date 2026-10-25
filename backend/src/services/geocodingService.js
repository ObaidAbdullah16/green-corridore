/**
 * Geocoding Service with Local Indore Landmark Pre-Cache and OpenStreetMap Nominatim Fallback
 */

const LOCAL_LANDMARKS = [
  {
    id: 'iet_davv',
    name: 'IET DAVV (Institute of Engineering & Technology)',
    displayName: 'Institute of Engineering & Technology, DAVV Campus, Khandwa Road, Indore',
    lat: 22.6812,
    lon: 75.8796,
    category: 'University / Education'
  },
  {
    id: 'davv_takshashila',
    name: 'DAVV Takshashila Campus',
    displayName: 'Devi Ahilya Vishwavidyalaya, Khandwa Road Entrance, Indore',
    lat: 22.6885,
    lon: 75.8745,
    category: 'University'
  },
  {
    id: 'bhanwarkua_sq',
    name: 'Bhanwarkua Square',
    displayName: 'Bhanwarkuan Square, AB Road / Khandwa Rd, Indore',
    lat: 22.6926,
    lon: 75.8676,
    category: 'Intersection'
  },
  {
    id: 'crystal_it_park',
    name: 'Crystal IT Park',
    displayName: 'Crystal IT Park, IT Park Square, Ring Road, Indore',
    lat: 22.6840,
    lon: 75.8742,
    category: 'Commercial'
  },
  {
    id: 'rajiv_gandhi_sq',
    name: 'Rajiv Gandhi Square',
    displayName: 'Rajiv Gandhi Square, Ring Road / AB Road, Indore',
    lat: 22.6830,
    lon: 75.8575,
    category: 'Intersection'
  },
  {
    id: 'choithram_hospital',
    name: 'Choithram Hospital and Research Centre',
    displayName: 'Choithram Hospital, Manik Bagh Road, Indore',
    lat: 22.6912,
    lon: 75.8495,
    category: 'Hospital'
  },
  {
    id: 'tower_square',
    name: 'Tower Square',
    displayName: 'Tower Square, Khatiwala Tank, Indore',
    lat: 22.7005,
    lon: 75.8615,
    category: 'Intersection'
  },
  {
    id: 'sapna_sangeeta',
    name: 'Sapna Sangeeta Road',
    displayName: 'Sapna Sangeeta Road, Lotus / Inox, Indore',
    lat: 22.7050,
    lon: 75.8675,
    category: 'Commercial'
  },
  {
    id: 'navlakha_sq',
    name: 'Navlakha Square',
    displayName: 'Navlakha Square, AB Road / Chitawad Road, Indore',
    lat: 22.6987,
    lon: 75.8780,
    category: 'Intersection'
  },
  {
    id: 'geeta_bhawan',
    name: 'Geeta Bhawan Square',
    displayName: 'Geeta Bhawan Square, AB Road, Indore',
    lat: 22.7160,
    lon: 75.8820,
    category: 'Intersection'
  },
  {
    id: 'palasia_sq',
    name: 'Palasia Square',
    displayName: 'Palasia Square, AB Road, Indore',
    lat: 22.7245,
    lon: 75.8845,
    category: 'Intersection'
  },
  {
    id: 'rajwada_palace',
    name: 'Rajwada Palace',
    displayName: 'Rajwada Palace, Sarafa, Old Indore, Indore',
    lat: 22.7180,
    lon: 75.8548,
    category: 'Historical'
  },
  {
    id: 'chappan_dukan',
    name: 'Chappan Dukan (56 Dukan)',
    displayName: '56 Dukan Street Food Zone, New Palasia, Indore',
    lat: 22.7245,
    lon: 75.8895,
    category: 'Food Street'
  },
  {
    id: 'sarafa_bazaar',
    name: 'Sarafa Bazaar',
    displayName: 'Sarafa Night Food Market, Rajwada, Indore',
    lat: 22.7185,
    lon: 75.8545,
    category: 'Food Street'
  },
  {
    id: 'indore_station',
    name: 'Indore Junction Railway Station',
    displayName: 'Indore Junction Railway Station, Chhoti Gwaltoli, Indore',
    lat: 22.7175,
    lon: 75.8680,
    category: 'Transit'
  },
  {
    id: 'vijay_nagar',
    name: 'Vijay Nagar Square',
    displayName: 'Vijay Nagar Square, AB Road / MR-10, Indore',
    lat: 22.7533,
    lon: 75.8937,
    category: 'Intersection'
  },
  {
    id: 'annapurna_temple',
    name: 'Annapurna Temple',
    displayName: 'Annapurna Temple, Narendra Tiwari Marg, Indore',
    lat: 22.6970,
    lon: 75.8390,
    category: 'Temple'
  },
  {
    id: 'pipliyahana_sq',
    name: 'Pipliyahana Square',
    displayName: 'Pipliyahana Square / World Cup Square, Ring Road, Indore',
    lat: 22.7100,
    lon: 75.9020,
    category: 'Intersection'
  },
  {
    id: 'khajrana_temple',
    name: 'Khajrana Ganesh Temple',
    displayName: 'Khajrana Ganesh Mandir, Khajrana, Indore',
    lat: 22.7300,
    lon: 75.9080,
    category: 'Temple'
  },
  {
    id: 'rau_circle',
    name: 'Rau Circle',
    displayName: 'Rau Circle, AB Road / Indore Bypass',
    lat: 22.6350,
    lon: 75.8080,
    category: 'Intersection'
  }
];

class GeocodingService {
  /**
   * Search for places by query string.
   * Checks local pre-curated landmarks first, then falls back to OpenStreetMap Nominatim.
   */
  async search(query) {
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return [];
    }

    const clean = query.trim().toLowerCase();
    const results = [];

    // 1. Check local pre-curated landmarks (instant zero-latency)
    for (const landmark of LOCAL_LANDMARKS) {
      const matchScore =
        (landmark.name.toLowerCase().includes(clean) ? 2 : 0) +
        (landmark.displayName.toLowerCase().includes(clean) ? 1 : 0);

      if (matchScore > 0) {
        results.push({
          id: landmark.id,
          name: landmark.name,
          displayName: landmark.displayName,
          lat: landmark.lat,
          lon: landmark.lon,
          category: landmark.category,
          source: 'local'
        });
      }
    }

    // 2. Query OSM Nominatim if query is at least 3 chars
    if (clean.length >= 3) {
      try {
        const nominatimUrl = new URL('https://nominatim.openstreetmap.org/search');
        nominatimUrl.searchParams.set('q', `${query}, Indore, Madhya Pradesh`);
        nominatimUrl.searchParams.set('format', 'json');
        nominatimUrl.searchParams.set('viewbox', '75.78,22.76,75.94,22.61');
        nominatimUrl.searchParams.set('bounded', '1');
        nominatimUrl.searchParams.set('limit', '5');

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);

        const res = await fetch(nominatimUrl.toString(), {
          headers: {
            'User-Agent': 'NaviHazard-Navigation-System/1.0 (contact: student@ietdavv.edu)'
          },
          signal: controller.signal
        });
        clearTimeout(timeout);

        if (res.ok) {
          const data = await res.json();
          for (const item of data) {
            const lat = parseFloat(item.lat);
            const lon = parseFloat(item.lon);

            // Avoid duplicate with local landmarks
            const isDuplicate = results.some(
              r => Math.abs(r.lat - lat) < 0.001 && Math.abs(r.lon - lon) < 0.001
            );

            if (!isDuplicate) {
              results.push({
                id: `osm_${item.osm_id || Math.random()}`,
                name: item.name || item.display_name.split(',')[0],
                displayName: item.display_name,
                lat,
                lon,
                category: item.type || 'place',
                source: 'nominatim'
              });
            }
          }
        }
      } catch (err) {
        // Nominatim timeout or network error is handled gracefully
      }
    }

    return results.slice(0, 8);
  }
}

export const geocodingService = new GeocodingService();
