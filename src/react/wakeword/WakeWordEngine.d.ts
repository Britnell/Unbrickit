// Minimal declaration shim for the vendored JS engine.
export declare const MODEL_FILE_MAP: Record<string, string>;
export declare class WakeWordEngine {
  constructor(opts: {
    keywords?: string[];
    baseAssetUrl?: string;
    ortWasmPath?: string;
    detectionThreshold?: number;
    cooldownMs?: number;
    executionProviders?: string[];
    [k: string]: unknown;
  });
  load(): Promise<void>;
  start(opts?: { deviceId?: string; gain?: number }): Promise<void>;
  stop(): void;
  setGain(v: number): void;
  runWav(buf: ArrayBuffer): Promise<number>;
  setActiveKeywords(names: string[]): void;
  on(event: string, handler: (payload: any) => void): () => void;
  off(event: string, handler: (payload: any) => void): void;
}
