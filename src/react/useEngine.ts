import { useCallback, useEffect, useMemo } from "react";
import { atom, useAtomValue, useSetAtom, type SetStateAction, type WritableAtom } from "jotai";

/**
 * Shared engine boilerplate for the camera-based engines (seating, posture):
 *
 * - isRunning state lives in the engine's UI snapshot atom (single writer: engine)
 * - start/stop flip it and persist intent in sessionStorage
 * - auto-restart after reload if it was running and camera permission persists
 */
export function useEngine<T extends { isRunning: boolean }>(
  uiAtom: WritableAtom<T, [SetStateAction<T>], void>,
  runningKey: string,
) {
  // derived atom: subscribe to isRunning only, not the whole ~6Hz UI snapshot
  const isRunningAtom = useMemo(
    () => atom((get) => get(uiAtom).isRunning),
    [uiAtom],
  );
  const isRunning = useAtomValue(isRunningAtom);
  const setUi = useSetAtom(uiAtom);

  const start = useCallback(() => {
    setUi((ui) => ({ ...ui, isRunning: true }));
    sessionStorage.setItem(runningKey, "1");
  }, [setUi, runningKey]);

  const stop = useCallback(() => {
    setUi((ui) => ({ ...ui, isRunning: false }));
    sessionStorage.removeItem(runningKey);
  }, [setUi, runningKey]);

  // restart after reload if the user had it running and camera permission persists
  useEffect(() => {
    if (!sessionStorage.getItem(runningKey)) return;
    navigator.permissions
      .query({ name: "camera" as PermissionName })
      .then((p) => {
        if (p.state === "granted") setUi((ui) => ({ ...ui, isRunning: true }));
      })
      .catch(() => {
        /* permissions API unsupported: don't auto-start */
      });
  }, [runningKey, setUi]);

  return { isRunning, start, stop, setUi };
}
