// refcounted shared camera: Posture + Tracker reuse one getUserMedia stream
// and one <video> element instead of each decoding the camera separately
let stream: MediaStream | null = null;
let video: HTMLVideoElement | null = null;
let refCount = 0;

/**
 * Get the shared ready-to-play <video>. First caller opens the camera, last
 * release stops it. Call releaseCamera() in cleanup for every acquire.
 */
export async function acquireCamera(): Promise<HTMLVideoElement> {
  if (!stream) {
    stream = await navigator.mediaDevices.getUserMedia({ video: true });
    const v = document.createElement("video");
    v.playsInline = true;
    v.srcObject = stream;
    await v.play();
    video = v;
    refCount++;
    return v;
  }
  refCount++;
  return video!;
}

/** stop the camera when the last consumer releases it */
export function releaseCamera() {
  refCount = Math.max(0, refCount - 1);
  if (refCount === 0) {
    stream?.getTracks().forEach((t) => t.stop());
    stream = null;
    if (video) video.srcObject = null;
    video = null;
  }
}
