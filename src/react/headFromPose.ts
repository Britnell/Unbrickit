// 2D posture angles from PoseLandmarker (33-point) landmarks, ported from
// ../posture-astro/src/scripts/posture.ts (midpoints -> angles).
// neck/back are absolute tilts vs axes (signed, + = forward/down).
// neckBody/neckHead are intrinsic joint angles (unsigned).

import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

const DEG = 180 / Math.PI;

export interface PoseAngles {
  neck: number; // ear->shoulder vs vertical, + = leaning forward
  back: number; // shoulder->hip vs vertical, + = leaning forward
  neckBody: number; // angle at shoulder between torso and neck
  neckHead: number; // angle at ear between neck and head
}

export function poseAngles(lm: NormalizedLandmark[]): PoseAngles {
  const mid = (a: number, b: number) => ({
    x: (lm[a].x + lm[b].x) / 2,
    y: (lm[a].y + lm[b].y) / 2,
  });
  const frontIsL = lm[7].z <= lm[8].z;
  const shoulder = mid(11, 12);
  const hip = mid(23, 24);
  const ear = mid(7, 8);
  const eye = frontIsL ? lm[2] : lm[5];

  const vsVert = (p1: { x: number; y: number }, p2: { x: number; y: number }) =>
    (Math.atan2(p2.x - p1.x, Math.abs(p2.y - p1.y)) * 180) / Math.PI;
  const angleBetween = (
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    p3: { x: number; y: number },
  ) => {
    const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
    const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };
    const dot = v1.x * v2.x + v1.y * v2.y;
    const m = Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y);
    return (Math.acos(Math.min(1, Math.max(-1, dot / m))) * DEG);
  };

  return {
    neck: vsVert(ear, shoulder),
    back: vsVert(shoulder, hip),
    neckBody: angleBetween(hip, shoulder, ear),
    neckHead: angleBetween(shoulder, ear, eye),
  };
}
