import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Real authentic POIs scattered around Indore IET DAVV / Bhawarkua / IT Park area
const INDORE_POIS = [
  {
    id: 'poi_1',
    name: 'Takshashila Campus Canteen',
    type: 'restaurant',
    coords: [22.6828, 75.8770],
    label: 'Student Canteen & Snacks'
  },
  {
    id: 'poi_2',
    name: 'Choithram Hospital & Research Centre',
    type: 'hospital',
    coords: [22.6845, 75.8480],
    label: 'Super-Specialty Hospital'
  },
  {
    id: 'poi_3',
    name: 'Bhawarkua Food Street (56 Bhog)',
    type: 'restaurant',
    coords: [22.6935, 75.8660],
    label: 'Indori Street Food Hub'
  },
  {
    id: 'poi_4',
    name: 'Apple Hospital Bhawarkua',
    type: 'hospital',
    coords: [22.6950, 75.8672],
    label: 'Multi-speciality Hospital'
  },
  {
    id: 'poi_5',
    name: 'Hotel Sayaji Indore',
    type: 'hotel',
    coords: [22.7530, 75.8920],
    label: 'Luxury Hotel & Suites'
  },
  {
    id: 'poi_6',
    name: 'Crystal IT Park Cafe CCD',
    type: 'cafe',
    coords: [22.6835, 75.8735],
    label: 'Coffee & Work Lounge'
  },
  {
    id: 'poi_7',
    name: 'Indore Marriott Hotel',
    type: 'hotel',
    coords: [22.7485, 75.8950],
    label: '5-Star Hotel'
  },
  {
    id: 'poi_8',
    name: 'Chai Kaapi - Sapna Sangeeta',
    type: 'cafe',
    coords: [22.7005, 75.8640],
    label: 'Popular Indore Tea Room'
  }
];

function createPoiIcon(type) {
  let bgColor = '#F59E0B'; // default amber
  let iconSvg = '';

  switch (type) {
    case 'restaurant':
      bgColor = '#EA580C'; // Orange
      iconSvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2"/><path d="M12 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>`;
      break;
    case 'hotel':
      bgColor = '#2563EB'; // Royal Blue
      iconSvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><circle cx="6" cy="8" r="2"/></svg>`;
      break;
    case 'hospital':
      bgColor = '#DC2626'; // Red with bold H
      iconSvg = `<span style="font-family: -apple-system, sans-serif; font-weight: 900; font-size: 11px; color: white; line-height: 1;">H</span>`;
      break;
    case 'cafe':
      bgColor = '#D97706'; // Amber Coffee
      iconSvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/></svg>`;
      break;
    default:
      bgColor = '#64748B';
      iconSvg = `<span style="font-size: 10px; color: white;">•</span>`;
  }

  return L.divIcon({
    className: 'custom-poi-marker',
    html: `
      <div style="
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background-color: ${bgColor};
        border: 2px solid #ffffff;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s ease;
      "
      onmouseover="this.style.transform='scale(1.2)'"
      onmouseout="this.style.transform='scale(1)'"
      >
        ${iconSvg}
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
  });
}

export function PoiMarkers() {
  return (
    <>
      {INDORE_POIS.map((poi) => (
        <Marker
          key={poi.id}
          position={poi.coords}
          icon={createPoiIcon(poi.type)}
        >
          <Popup>
            <div className="p-1 space-y-1 text-slate-100 min-w-[140px]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
                {poi.type}
              </span>
              <p className="text-xs font-bold text-white">{poi.name}</p>
              <p className="text-[10px] text-slate-300">{poi.label}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}
