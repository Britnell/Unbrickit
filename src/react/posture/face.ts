import { FaceLandmarker } from "@mediapipe/tasks-vision";
import { getVisionRuntime } from "./visionRuntime";

export async function createFaceLandmarker() {
  const vision = await getVisionRuntime();
  return FaceLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "/models/face_landmarker.task",
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    numFaces: 1,
    minFaceDetectionConfidence: 0.5,
    minFacePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
    outputFaceBlendshapes: false,
    outputFacialTransformationMatrixes: true, // gives head pose directly
  });
}

// drift-based slouch detection, adapted for face landmarks (frontal mode):
// short-term low-pass ("now") vs long-term low-pass ("baseline") of pitch and
// nose y. baseline adapts forever -> moving just becomes the new baseline.
// fused = pitch drift + 100 * noseY drift, degrees-like.
const FAST_TC = 2; // s
const SLOW_TC = 90; // s

export class FaceDriftMeter {
  private last: number | null = null;
  private fast: Record<string, number> = {};
  private slow: Record<string, number> = {};

  value(pose: { pitch: number }, noseY: number) {
    const now = performance.now();
    const dt = this.last === null ? 0 : (now - this.last) / 1000;
    this.last = now;

    const abs: Record<string, number> = { pitch: pose.pitch, noseY };
    const aFast = 1 - Math.exp(-dt / FAST_TC);
    const aSlow = 1 - Math.exp(-dt / SLOW_TC);

    const diffs: Record<string, number> = {};
    for (const k of Object.keys(abs)) {
      this.fast[k] =
        k in this.fast
          ? this.fast[k] + aFast * (abs[k] - this.fast[k])
          : abs[k];
      this.slow[k] =
        k in this.slow
          ? this.slow[k] + aSlow * (abs[k] - this.slow[k])
          : abs[k];
      diffs[k] = this.fast[k] - this.slow[k];
    }
    const fused = diffs.pitch + 100 * diffs.noseY;
    return { diffs, fused };
  }

  reset() {
    this.last = null;
    this.fast = {};
    this.slow = {};
  }
}

// head pose straight from the task's facialTransformationMatrixes
// (4x4 rotation matrix, row-major), standard euler extraction:
//   roll  = head tilt sideways, pitch = nod up/down, yaw = turn left/right
export function headPose(face: any) {
  const m = face.facialTransformationMatrixes?.[0]?.data;
  if (!m) return null;
  const [m00, m01, , , m10, , , , m20, m21, m22] = m;
  const sy = Math.sqrt(m00 * m00 + m01 * m01);
  return {
    pitch: (Math.atan2(m21, m22) * 180) / Math.PI,
    roll: (Math.atan2(m10, m00) * 180) / Math.PI,
    yaw: (Math.atan2(-m20, sy) * 180) / Math.PI,
  };
}
