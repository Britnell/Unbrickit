// Fullscreen and Wake Lock utilities

export async function toggleFullscreen(): Promise<boolean> {
  if (!document.fullscreenElement) {
    await document.documentElement.requestFullscreen();
    return true;
  } else {
    await document.exitFullscreen();
    return false;
  }
}

export async function toggleWakeLock(currentWakeLock: WakeLockSentinel | null): Promise<WakeLockSentinel | null> {
  if (currentWakeLock) {
    currentWakeLock.release();
    return null;
  } else {
    try {
      const wakeLock = await navigator.wakeLock.request();
      return wakeLock;
    } catch {
      return null;
    }
  }
}
