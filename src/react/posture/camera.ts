// refcounted shared camera: Posture + Seating reuse one getUserMedia stream
// and one <video> element instead of each decoding the camera separately
let stream: MediaStream | null = null;
let video: HTMLVideoElement | null = null;
let refCount = 0;

/** teardown regardless of refcount (used when the stream died on us) */
function hardReset() {
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
  if (video) {
    video.srcObject = null;
    video = null;
  }
  refCount = 0;
}

/** true if the OS killed the track or the video got paused (screen lock, background) */
export function isCameraAlive(v: HTMLVideoElement | null): boolean {
  if (!v || !stream) return false;
  if (stream.getTracks().every((t) => t.readyState === "ended")) return false;
  return true;
}

/**
 * Get the shared ready-to-play <video>. First caller opens the camera, last
 * release stops it. Call releaseCamera() in cleanup for every acquire.
 * If the previous stream died (OS ended it), it is discarded and reopened.
 */
export async function acquireCamera(): Promise<HTMLVideoElement> {
  if (stream && !isCameraAlive(video)) {
    console.warn("[camera] stream is dead — reopening");
    hardReset();
  }
  if (!stream) {
    stream = await navigator.mediaDevices.getUserMedia({ video: true });
    const v = document.createElement("video");
    v.playsInline = true;
    v.muted = true;
    v.srcObject = stream;
    video = v;
    try {
      await v.play();
    } catch (err) {
      // mobile browsers pause us on lock/background; a rejected play() here
      // means the element needs another play() later, not a fatal error
      console.warn("[camera] initial play() failed, will retry:", err);
    }
    // OS can pause the video when the screen locks; keep nudging it awake
    v.addEventListener("pause", () => {
      if (isCameraAlive(video)) void v.play().catch(() => {});
    });
    for (const t of stream.getTracks()) {
      t.addEventListener("ended", () => {
        console.warn("[camera] track ended:", t.label);
      });
    }
  }
  refCount++;
  return video!;
}

/** stop the camera when the last consumer releases it */
export function releaseCamera() {
  refCount = Math.max(0, refCount - 1);
  if (refCount === 0) hardReset();
}
