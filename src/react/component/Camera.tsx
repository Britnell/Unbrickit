import { useEffect, useRef, useState } from "react";
import { useAtomValue } from "jotai";
import {
  subscribeFace,
  getFaceVideo,
  faceLoadingAtom,
  faceErrorAtom,
} from "../posture/faceStream";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { FACE_DRIFT_IDS } from "./Posture";

/**
 * Debug camera view: shows the shared webcam with the face-landmark overlay.
 * Not in the main menu — only reachable via the ⚙️ icon in the seating view.
 */
export default function CameraPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const landmarksRef = useRef<NormalizedLandmark[] | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const loading = useAtomValue(faceLoadingAtom);
  const faceError = useAtomValue(faceErrorAtom);

  useEffect(() => {
    // keep the latest face landmarks from the shared stream
    const unsub = subscribeFace(({ result }) => {
      const lm = result.faceLandmarks?.[0] ?? null;
      landmarksRef.current = lm;
      setFaceDetected(!!lm);
    });

    // render video + overlay every frame
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d") ?? null;
    let raf = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const video = getFaceVideo();
      if (!canvas || !ctx || !video || video.readyState < 2) return;
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const lm = landmarksRef.current;
      if (lm) {
        ctx.fillStyle = "rgba(0, 200, 255, 0.9)";
        const r = Math.max(2, canvas.width / 400);
        for (const i of FACE_DRIFT_IDS) {
          const p = lm[i];
          ctx.beginPath();
          ctx.arc(p.x * canvas.width, p.y * canvas.height, r, 0, 2 * Math.PI);
          ctx.fill();
        }
      }
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      unsub();
    };
  }, []);

  return (
    <div className="flex flex-col w-[min(480px,calc(100vw-6rem))]">
      {faceError && (
        <div className="mb-2 bg-red-500/70 px-3 py-2 rounded text-center">
          <div className="text-lg font-bold">Couldn't start camera</div>
          <div className="text-sm">{faceError}</div>
        </div>
      )}
      <div className="relative rounded overflow-hidden bg-black">
        <canvas ref={canvasRef} className="w-full" />
        {!faceError && loading && (
          <div className="absolute inset-0 grid place-items-center text-white text-lg">
            Starting camera…
          </div>
        )}
      </div>
      <div className="mt-2 text-sm text-center">
        Face detected: {faceDetected ? "yes" : "no"}
      </div>
    </div>
  );
}
