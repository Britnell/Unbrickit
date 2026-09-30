import { useEffect, useState } from "react";
import type { FaceLandmarker } from "@mediapipe/tasks-vision";
import { createFaceLandmarker, headPose, FaceDriftMeter } from "./face";
import { acquireCamera, releaseCamera } from "./camera";

type HeadPose = { roll: number; pitch: number; yaw: number };

const SLOUCH_THRESHOLD = 10; // deg-like, above this = slouching
const SLOUCH_PERIOD = 3; // seconds of slouch before alerting

export default function PosturePage() {
  const [running, setRunning] = useState(false);
  const [pose, setPose] = useState<HeadPose | null>(null);
  const [fused, setFused] = useState(0);
  const [slouching, setSlouching] = useState(false);

  // face landmark camera loop -> roll/pitch/yaw -> drift-based slouch
  useEffect(() => {
    if (!running) {
      setPose(null);
      setFused(0);
      setSlouching(false);
      return;
    }
    let cancelled = false;
    let landmarker: FaceLandmarker | null = null;
    let ownsCamera = false;
    let raf = 0;
    let video: HTMLVideoElement;
    let lastVideoTime = -1;
    let frame = 0;
    const drift = new FaceDriftMeter();
    let slouchStart: number | null = null;
    let isSlouching = false;

    (async () => {
      try {
        landmarker = await createFaceLandmarker();
        if (cancelled) return;
        video = await acquireCamera();
        ownsCamera = true;
        if (cancelled) {
          releaseCamera();
          return;
        }
      } catch (err) {
        console.error("face camera/model failed:", err);
        setRunning(false);
        return;
      }
      const loop = () => {
        if (cancelled) return;
        // sample every 10th frame (~6Hz): plenty for drift detection
        if (frame++ % 10 === 0 && video.currentTime !== lastVideoTime && landmarker) {
          lastVideoTime = video.currentTime;
          const face = landmarker.detectForVideo(video, performance.now());
          const p = face.faceLandmarks?.[0] ? headPose(face) : null;
          setPose(p);
          if (p) {
            const noseY = face.faceLandmarks[0][1].y;
            const { fused } = drift.value(p, noseY);
            setFused(fused);
            const now = performance.now();
            if (fused <= SLOUCH_THRESHOLD) {
              slouchStart = null;
              if (isSlouching) {
                isSlouching = false;
                setSlouching(false);
              }
            } else {
              if (slouchStart === null) slouchStart = now;
              if (!isSlouching && now - slouchStart >= SLOUCH_PERIOD * 1000) {
                isSlouching = true;
                setSlouching(true);
              }
            }
          } else {
            drift.reset();
          }
        }
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      if (ownsCamera) releaseCamera();
      landmarker?.close();
    };
  }, [running]);

  const fmt = (v?: number) => (v === undefined ? "--" : v.toFixed(1));

  return (
    <div className="text-center py-8 flex flex-col gap-4">
      <button
        className="mx-auto px-4 py-2 rounded bg-sky-600 text-white"
        onClick={() => setRunning((r) => !r)}
      >
        {running ? "Stop" : "Start Camera"}
      </button>

      <div className="flex flex-col gap-1 tabular-nums">
        <span>
          roll: {fmt(pose?.roll)}° pitch: {fmt(pose?.pitch)}° yaw:{" "}
          {fmt(pose?.yaw)}°
        </span>
        <span className={slouching ? "text-red-500 font-bold" : "opacity-60"}>
          {slouching ? "SLOUCHING" : "ok"} (drift {fused.toFixed(1)}°)
        </span>
        {running && !pose && <span className="opacity-60">no face</span>}
      </div>
    </div>
  );
}
