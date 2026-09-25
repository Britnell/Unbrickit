import { PoseLandmarker } from "@mediapipe/tasks-vision";
import { getVisionRuntime } from "./visionRuntime";

export const MODELS = {
  lite: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
  full: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task",
  heavy:
    "https://storage.googleapis.com/mediapipe-models/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task",
};

export async function createLandmarker(modelKey: keyof typeof MODELS = "lite") {
  const vision = await getVisionRuntime();
  return PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: MODELS[modelKey],
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    numPoses: 1,
    minPoseDetectionConfidence: 0.5,
    minPosePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
    outputSegmentationMasks: false,
  });
}
