/**
 * RoadGuard AI - API Client Service
 */

const API_BASE = '/api';

export async function checkHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Backend health check failed');
  return res.json();
}

export async function getStatistics() {
  const res = await fetch(`${API_BASE}/statistics`);
  if (!res.ok) throw new Error('Failed to fetch dashboard statistics');
  return res.json();
}

export async function getDetections(params = {}) {
  const query = new URLSearchParams();
  if (params.severity && params.severity !== 'ALL') query.append('severity', params.severity);
  if (params.search) query.append('search', params.search);
  if (params.limit) query.append('limit', params.limit);
  if (params.offset) query.append('offset', params.offset);

  const res = await fetch(`${API_BASE}/detections?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch detection history');
  return res.json();
}

export async function getDetectionById(id) {
  const res = await fetch(`${API_BASE}/detections/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch detection #${id}`);
  return res.json();
}

export async function deleteDetection(id) {
  const res = await fetch(`${API_BASE}/detections/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`Failed to delete detection #${id}`);
  return res.json();
}

export async function uploadImageForDetection(formData) {
  const res = await fetch(`${API_BASE}/detect/image`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Image detection failed');
  }
  return res.json();
}

export async function uploadVideoForDetection(formData) {
  const res = await fetch(`${API_BASE}/detect/video`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Video detection failed');
  }
  return res.json();
}

export async function getMapLocations(severity = 'ALL') {
  const query = severity && severity !== 'ALL' ? `?severity=${severity}` : '';
  const res = await fetch(`${API_BASE}/map/locations${query}`);
  if (!res.ok) throw new Error('Failed to fetch map locations');
  return res.json();
}

export async function updateLocation(payload) {
  const res = await fetch(`${API_BASE}/location`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to update GPS location');
  return res.json();
}

export function getReportDownloadUrl(detectionId) {
  return `${API_BASE}/reports/${detectionId}`;
}

export function getCsvExportUrl() {
  return `${API_BASE}/export/csv`;
}

export async function getSampleImages() {
  const res = await fetch(`${API_BASE}/sample-images`);
  if (!res.ok) throw new Error('Failed to load sample images');
  return res.json();
}
