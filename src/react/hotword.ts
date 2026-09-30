// Extracted from https://github.com/Ant-Brain/EfficientWord-Net-InBrowser-Hotword-Detection
// In-browser hotword (wake word) detection on a live mic stream.
// Requires: public/hotword/{model.onnx, alexa_ref.json, mycroft_ref.json, audio-processor.js}
import * as ort from "onnxruntime-web";
import FFT from "fft.js";

const BASE = import.meta.env.BASE_URL + "hotword/";

export type Hotword = "alexa" | "mycroft";

export interface HotwordDetectorOptions {
  hotword?: Hotword;
  threshold?: number; // 0..1, default 0.7
  relaxationTime?: number; // ms between triggers, default 2000
  onDetected?: (word: Hotword, confidence: number) => void;
  onConfidence?: (confidence: number) => void;
}

// ---------- mel filterbank feature extraction ----------
class AudioUtils {
  private nfft = 512;
  private nfilt = 64;
  private sampleRate = 16000;
  private fft = new FFT(this.nfft);
  private melFilters = this.createMelFilterbank();

  private hzToMel(hz: number) {
    return 2595 * Math.log10(1 + hz / 700);
  }
  private melToHz(mel: number) {
    return 700 * (Math.pow(10, mel / 2595) - 1);
  }
  private createMelFilterbank(): Float32Array[] {
    const lowMel = this.hzToMel(0);
    const highMel = this.hzToMel(this.sampleRate / 2);
    const melPoints = new Float32Array(this.nfilt + 2);
    for (let i = 0; i < this.nfilt + 2; i++)
      melPoints[i] = lowMel + (i * (highMel - lowMel)) / (this.nfilt + 1);
    const bins = melPoints.map(
      (m) => Math.floor(((this.nfft + 1) * this.melToHz(m)) / this.sampleRate)
    );
    const filters: Float32Array[] = [];
    for (let j = 0; j < this.nfilt; j++) {
      const fbank = new Float32Array(Math.floor(this.nfft / 2) + 1);
      for (let i = bins[j]; i < bins[j + 1]; i++)
        fbank[i] = (i - bins[j]) / (bins[j + 1] - bins[j]);
      for (let i = bins[j + 1]; i < bins[j + 2]; i++)
        fbank[i] = (bins[j + 2] - i) / (bins[j + 2] - bins[j + 1]);
      filters.push(fbank);
    }
    return filters;
  }

  logfbank(signal: Float32Array): Float32Array {
    const winLen = 400; // 0.025s @ 16k
    const winStep = 160; // 0.01s @ 16k
    const numFrames = 1 + Math.ceil((signal.length - winLen) / winStep);
    const spectrogram = new Float32Array(numFrames * this.nfilt);
    const frame = new Float32Array(this.nfft);
    const outFFT = this.fft.createComplexArray();
    for (let i = 0; i < numFrames; i++) {
      const start = i * winStep;
      frame.fill(0);
      for (let j = 0; j < winLen && start + j < signal.length; j++)
        frame[j] = signal[start + j];
      const complexInput = this.fft.toComplexArray(frame, null);
      this.fft.transform(outFFT, complexInput);
      const pspec = new Float32Array(Math.floor(this.nfft / 2) + 1);
      for (let j = 0; j < pspec.length; j++) {
        const re = outFFT[2 * j];
        const im = outFFT[2 * j + 1];
        pspec[j] = (1 / this.nfft) * (re * re + im * im);
        if (pspec[j] === 0) pspec[j] = 1e-30;
      }
      for (let j = 0; j < this.nfilt; j++) {
        let energy = 0;
        const filter = this.melFilters[j];
        for (let k = 0; k < pspec.length; k++) energy += pspec[k] * filter[k];
        if (energy === 0) energy = 1e-30;
        spectrogram[i * this.nfilt + j] = Math.log(energy);
      }
    }
    return spectrogram;
  }
}

// ---------- similarity ----------
function maxSimilarity(live: Float32Array, refs: number[][]): number {
  let max = 0;
  for (const ref of refs) {
    let dot = 0;
    for (let i = 0; i < ref.length; i++) dot += live[i] * ref[i];
    const score = (dot + 1) / 2;
    if (score > max) max = score;
  }
  return max;
}

// ---------- detector ----------
export class HotwordDetector {
  static wasmConfigured = false;
  private opts: Required<Pick<HotwordDetectorOptions, "hotword" | "threshold" | "relaxationTime">> &
    HotwordDetectorOptions;
  private session: ort.InferenceSession | null = null;
  private refs: number[][] = [];
  private audioUtils = new AudioUtils();
  private audioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private lastDetection = 0;
  private lastInference = 0;
  running = false;

  constructor(opts: HotwordDetectorOptions = {}) {
    this.opts = { hotword: "alexa", threshold: 0.7, relaxationTime: 2000, ...opts };
  }

  /** load ONNX model + reference embeddings */
  async init() {
    if (!HotwordDetector.wasmConfigured) {
      // ort runtime wasm/mjs; served from CDN (binary only — inference is still local)
      // local public/ copy fails because Vite can't dynamic-import from public/
      ort.env.wasm.wasmPaths =
        "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/dist/";
      HotwordDetector.wasmConfigured = true;
    }
    if (!this.session) {
      this.session = await ort.InferenceSession.create(BASE + "model.onnx", {
        executionProviders: ["wasm"],
        graphOptimizationLevel: "all",
      });
    }
    const res = await fetch(BASE + this.opts.hotword + "_ref.json");
    const data = await res.json();
    this.refs = data.embeddings;
  }

  /** start mic stream and detect */
  async start() {
    if (this.running) return;
    if (!this.session) await this.init();

    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.audioContext = new AudioContext({ sampleRate: 16000 });
    await this.audioContext.resume();
    const source = this.audioContext.createMediaStreamSource(this.stream);

    // ring buffer of 1.5s @ 16kHz + ScriptProcessorNode capture (no worklet file needed)
    const bufferSize = 24000;
    const ring = new Float32Array(bufferSize);
    let ptr = 0;
    const node = this.audioContext.createScriptProcessor(4096, 1, 1);
    node.onaudioprocess = (e) => {
      const data = e.inputBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        ring[ptr] = data[i];
        ptr = (ptr + 1) % bufferSize;
      }
      const ordered = new Float32Array(bufferSize);
      for (let i = 0; i < bufferSize; i++)
        ordered[i] = ring[(ptr + i) % bufferSize];
      this.handleBuffer(ordered);
    };
    source.connect(node);
    node.connect(this.audioContext.destination); // required for ScriptProcessor; output is silent
    this.running = true;
  }

  stop() {
    this.running = false;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.audioContext?.close();
    this.audioContext = null;
  }

  private async handleBuffer(buffer: Float32Array) {
    if (!this.session || !this.running) return;
    const now = Date.now();
    if (now - this.lastInference < 300) return; // ~3 inferences/sec
    this.lastInference = now;

    const spectrogram = this.audioUtils.logfbank(buffer);
    const tensor = new ort.Tensor("float32", spectrogram, [1, 1, 149, 64]);
    try {
      const output = await this.session.run({ input: tensor });
      const embedding = output[Object.keys(output)[0]].data as Float32Array;
      const confidence = maxSimilarity(embedding, this.refs);
      this.opts.onConfidence?.(confidence);
      if (
        confidence > this.opts.threshold &&
        now - this.lastDetection > this.opts.relaxationTime
      ) {
        this.lastDetection = now;
        this.opts.onDetected?.(this.opts.hotword, confidence);
      }
    } catch (err) {
      console.error("hotword inference failed", err);
    }
  }
}
