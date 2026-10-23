export const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));

export const SMILE_ZONES = Object.freeze({ rain: .05, laugh: .45, rainExit: .04, laughExit: .40 });

// One input only: bilateral smile intensity. Small boundary hysteresis avoids flicker.
export class ExpressionController {
  constructor() { this.reset(); }
  reset() { this.state = 'neutral'; this.smile = 0; this.lastTime = null; this.candidate = 'neutral'; this.since = 0; }
  sample(smile, now) {
    const dt = this.lastTime === null ? 50 : clamp(now - this.lastTime, 1, 150);
    this.lastTime = now;
    this.smile += (clamp(smile) - this.smile) * (1 - Math.exp(-dt / 65));
    let next;
    if (Math.round(this.smile*100)/100 >= (this.state === 'laugh' ? SMILE_ZONES.laughExit : SMILE_ZONES.laugh)) next = 'laugh';
    else if (this.smile >= (this.state === 'smile' ? SMILE_ZONES.rainExit : SMILE_ZONES.rain) - 1e-9) next = 'smile';
    else next = 'neutral';
    if (next !== this.candidate) { this.candidate = next; this.since = now; }
    const previous = this.state;
    if (now - this.since >= (next === 'laugh' ? 80 : this.state === 'laugh' ? 200 : next === 'neutral' ? 110 : 140)) this.state = next;
    return { state: this.state, changed: previous !== this.state, smile: this.smile };
  }
}

/** Same transform as a horizontally mirrored object-fit:cover video. */
export function coverPoint(point, videoWidth, videoHeight, width, height) {
  const scale = Math.max(width / videoWidth, height / videoHeight);
  const x = point.x * videoWidth * scale + (width - videoWidth * scale) / 2;
  return { x: width - x, y: point.y * videoHeight * scale + (height - videoHeight * scale) / 2 };
}

export const FACE_OVAL = [10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109];

export function headPolygon(landmarks, vw, vh, width, height) {
  if (!landmarks?.length || !vw || !vh) return null;
  const raw = FACE_OVAL.map(i => coverPoint(landmarks[i], vw, vh, width, height));
  const center = raw.reduce((a, p) => ({ x: a.x + p.x / raw.length, y: a.y + p.y / raw.length }), { x: 0, y: 0 });
  // A face-based approximation of the head, extended slightly beyond the facial oval.
  return raw.map(p => ({ x: center.x + (p.x - center.x) * 1.10, y: center.y + (p.y - center.y) * (p.y < center.y ? 1.24 : 1.04) }));
}

export function previewHead(width, height, x = .5, y = .52) {
  const rx = Math.min(width * .135, height * .18), ry = rx * 1.3;
  return Array.from({ length: 40 }, (_, i) => { const a = i / 40 * Math.PI * 2; return { x: width * x + Math.cos(a) * rx, y: height * y + Math.sin(a) * ry }; });
}

export function pointInPolygon(p, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

function cross(a, b) { return a.x * b.y - a.y * b.x; }

/** Swept segment collision prevents fast particles passing through a thin head edge. */
export function collide(p, old, polygon, surfaceVelocity = { x: 0, y: 0 }) {
  if (!polygon || polygon.length < 3) return false;
  const center = polygon.reduce((a, b) => ({ x: a.x + b.x / polygon.length, y: a.y + b.y / polygon.length }), { x: 0, y: 0 });
  const d = { x: p.x - old.x, y: p.y - old.y };
  let hit = null, earliest = Infinity;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i], b = polygon[(i + 1) % polygon.length];
    const e = { x: b.x - a.x, y: b.y - a.y }, den = cross(d, e);
    if (Math.abs(den) < 1e-8) continue;
    const delta = { x: a.x - old.x, y: a.y - old.y };
    const t = cross(delta, e) / den, u = cross(delta, d) / den;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1 && t < earliest) {
      earliest = t; hit = { x: old.x + d.x * t, y: old.y + d.y * t, nx: e.y, ny: -e.x };
    }
  }
  if (!hit && pointInPolygon(p, polygon)) {
    let distance = Infinity;
    for (let i = 0; i < polygon.length; i++) {
      const a = polygon[i], b = polygon[(i + 1) % polygon.length], dx = b.x - a.x, dy = b.y - a.y;
      const t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / Math.max(1e-6, dx * dx + dy * dy));
      const x = a.x + dx * t, y = a.y + dy * t, dist = (x - p.x) ** 2 + (y - p.y) ** 2;
      if (dist < distance) { distance = dist; hit = { x, y, nx: dy, ny: -dx }; }
    }
  }
  if (!hit) return false;
  const len = Math.hypot(hit.nx, hit.ny) || 1;
  hit.nx /= len; hit.ny /= len;
  if ((hit.x - center.x) * hit.nx + (hit.y - center.y) * hit.ny < 0) { hit.nx *= -1; hit.ny *= -1; }
  p.hitNormal = { x: hit.nx, y: hit.ny };
  p.x = hit.x + hit.nx * 2.5; p.y = hit.y + hit.ny * 2.5;
  const sx = clamp(surfaceVelocity.x, -250, 250) * .22, sy = clamp(surfaceVelocity.y, -250, 250) * .22;
  const dot = (p.vx - sx) * hit.nx + (p.vy - sy) * hit.ny;
  if (dot < 0) { p.vx -= 1.72 * dot * hit.nx; p.vy -= 1.72 * dot * hit.ny; }
  return true;
}

