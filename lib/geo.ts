/** Straight-line distance between two GPS points, in metres (haversine). */
export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = (d: number) => (d * Math.PI) / 180, R = 6371000
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

export const DEFAULT_OFFICE_RADIUS_M = 150

/**
 * Reads a latitude/longitude from what an admin pastes: "12.9175, 77.6238", "12.9175 77.6238", or a Google Maps link
 * (…/@12.9175,77.6238,17z or …!3d12.9175!4d77.6238 or ?q=12.9175,77.6238). Returns null when there isn't a valid pair.
 */
export function parseLatLng(text: string): { lat: number; lng: number } | null {
  const s = decodeURIComponent(String(text ?? "")).trim()
  const m = s.match(/@(-?\d{1,3}\.\d+),\s*(-?\d{1,3}\.\d+)/) || s.match(/!3d(-?\d{1,3}\.\d+)!4d(-?\d{1,3}\.\d+)/) || s.match(/[?&](?:q|ll|query)=(-?\d{1,3}\.\d+),\s*(-?\d{1,3}\.\d+)/) || s.match(/^\(?\s*(-?\d{1,3}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)\s*\)?$/)
  if (!m) return null
  const lat = Number(m[1]), lng = Number(m[2])
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null
}
