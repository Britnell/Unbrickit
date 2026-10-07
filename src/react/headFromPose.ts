// pitch estimation from PoseLandmarker (33-point) head landmarks, for use when
// the camera is side-on and the face mesh model can't run.
//
// Absolute pitch from pure 3D geometry, no baseline/calibration:
// the two ears + nose define the plane of the face; the plane normal is the
// direction the face points. Pitch = the normal's vertical tilt (nod).
// Computed fresh each frame.

import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

const DEG = 180 / Math.PI;
type V3 = { x: number; y: number; z: number };

const sub = (a: V3, b: V3): V3 => ({
  x: a.x - b.x,
  y: a.y - b.y,
  z: a.z - b.z,
});
const cross = (a: V3, b: V3): V3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});

const p3 = (l: NormalizedLandmark): V3 => ({ x: l.x, y: l.y, z: l.z });

/** head orientation in degrees from one frame's pose landmarks */
export function poseHeadAngles(lm: NormalizedLandmark[]) {
  const earL = p3(lm[7]);
  const earR = p3(lm[8]);
  const nose = p3(lm[0]);

  // face plane spanned by the ear line and earMid -> nose
  const earMid = {
    x: (earL.x + earR.x) / 2,
    y: (earL.y + earR.y) / 2,
    z: (earL.z + earR.z) / 2,
  };
  const n = cross(sub(earR, earL), sub(nose, earMid));
  const len = Math.hypot(n.x, n.y, n.z) || 1e-9;

  // MediaPipe coords: x right, y down, z away from camera.
  // normal of a forward-facing head points toward the camera (z negative-ish).
  return Math.asin(n.y / len) * DEG; // nod: down = positive
}
