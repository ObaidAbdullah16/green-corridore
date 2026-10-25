const API_BASE = '/api';

let activeRole = typeof window !== 'undefined' && localStorage.getItem('navi_user_role')
  ? localStorage.getItem('navi_user_role')
  : 'citizen';

export function getApiRole() {
  return activeRole;
}

export function setApiRole(role) {
  activeRole = role;
  if (typeof window !== 'undefined') {
    localStorage.setItem('navi_user_role', role);
  }
}

function getHeaders(customHeaders = {}) {
  return {
    'Content-Type': 'application/json',
    'x-user-role': activeRole,
    ...customHeaders
  };
}

export async function fetchRoute(origin, destination, options = {}) {
  const response = await fetch(`${API_BASE}/route`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ origin, destination, options })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Route calculation failed');
  }
  return data;
}

export async function fetchHazards(status = 'active', bbox = null) {
  let url = `${API_BASE}/hazards?status=${encodeURIComponent(status)}`;
  if (bbox) {
    url += `&bbox=${bbox.south},${bbox.west},${bbox.north},${bbox.east}`;
  }

  const response = await fetch(url, {
    headers: getHeaders()
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch hazards');
  }
  return data.hazards || [];
}

export async function fetchHazardById(id) {
  const response = await fetch(`${API_BASE}/hazards/${id}`, {
    headers: getHeaders()
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch hazard details');
  }
  return data.hazard;
}

export async function confirmHazard(id) {
  const response = await fetch(`${API_BASE}/hazards/${id}/confirm`, {
    method: 'POST',
    headers: getHeaders()
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to confirm hazard');
  }
  return data;
}

export async function reportHazard(payload) {
  const response = await fetch(`${API_BASE}/hazards`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to report hazard');
  }
  return data;
}

export async function resolveHazard(id, reason = 'Resolved and road cleared by traffic authority') {
  const response = await fetch(`${API_BASE}/hazards/${id}/resolve`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ reason })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to resolve hazard');
  }
  return data;
}

export async function verifyAuthorityPasscodeApi(passcode) {
  const response = await fetch(`${API_BASE}/hazards/authority/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ passcode })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Invalid authority passcode');
  }
  return data;
}

export async function searchPlaces(query) {
  if (!query || query.trim().length === 0) return [];
  const response = await fetch(`${API_BASE}/geocode/search?q=${encodeURIComponent(query)}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to search places');
  }
  return data.results || [];
}

export async function checkHealth() {
  const response = await fetch(`${API_BASE}/health`);
  return await response.json();
}

export async function analyzeHazardImage(payload) {
  const response = await fetch(`${API_BASE}/ai/analyze-hazard`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Vision analysis failed');
  }
  return data.detection;
}
