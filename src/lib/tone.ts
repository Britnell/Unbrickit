import { getRandom } from './helper';

const noteMap: Record<string, number> = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
};

const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export interface Note {
  note: string;
  duration?: number;
}

export function noteToFrequency(note: string): number {
  const match = note.toUpperCase().match(/^([A-G][#B]?)(\d+)$/);
  if (!match) return 0;
  const [, noteName, octaveStr] = match;
  const octave = parseInt(octaveStr);
  const midiNumber = (octave + 1) * 12 + noteMap[noteName];
  const frequency = 440 * Math.pow(2, (midiNumber - 69) / 12);
  return frequency;
}

export function playNotes(notes: Note[], staggerDelay = 0.1): void {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

  let cumulativeTime = 0;

  notes.forEach((note) => {
    const duration = note.duration || 2.0;
    const startTime = audioContext.currentTime + cumulativeTime;

    if (note.note === '') {
      cumulativeTime += duration + staggerDelay;
      return;
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    const real = new Float32Array([0, 1, 0.3, 0.1]);
    const imaginary = new Float32Array(real.length);

    const wave = audioContext.createPeriodicWave(real, imaginary);
    oscillator.setPeriodicWave(wave);

    oscillator.frequency.value = noteToFrequency(note.note);

    const attackTime = 0.2;
    const releaseTime = 0.2;

    const volume = 0.4;

    const sustainTime = Math.max(0, duration - attackTime - releaseTime);

    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(volume, startTime + attackTime);

    gainNode.gain.setValueAtTime(volume, startTime + attackTime);
    gainNode.gain.setValueAtTime(volume, startTime + attackTime + sustainTime);

    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration);

    cumulativeTime += duration + staggerDelay;
  });
}

export function playChime(): void {
  playNotes(
    [
      { note: 'C4', duration: 0.5 },
      { note: 'E4', duration: 0.5 },
      { note: 'G4', duration: 0.5 },
    ],
    0.2,
  );
}

export function playTimerBeep() {
  playNotes(
    [
      { note: 'G4', duration: 0.7 },
      { note: 'G4', duration: 0.7 },
      { note: 'G4', duration: 0.7 },
      { note: '', duration: 1.5 },
      { note: 'G#4', duration: 0.6 },
      { note: 'G#4', duration: 0.6 },
    ],
    0.2,
  );
}

const wrapNotes = (n: number, oct: number = 4) => {
  if (n < notes.length) return notes[n] + oct;
  return wrapNotes(n - notes.length, oct + 1);
};
export function randomChord(): void {
  const oct = Math.round(Math.random() * 1) + 3;
  const base = Math.floor(Math.random() * 12);

  const majmin = Math.random() < 0.5 ? 3 : 4;
  const third = base + majmin;

  const bFifth = Math.random() < 0.1 ? 1 : 0;
  const fifth = base + 7 - bFifth;

  const majSeventh = Math.random() < 0.2 ? 1 : 0;
  const seventh = base + 11 + majSeventh;

  const dur = getRandom(0.5, 0.9, 0.1);

  playNotes(
    [
      { note: wrapNotes(base, oct), duration: dur },
      {
        note: wrapNotes(third, oct),
        duration: dur,
      },
      { note: wrapNotes(fifth, oct), duration: dur },
      { note: wrapNotes(seventh, oct), duration: dur + 0.3 },
    ],
    -0.3,
  );
}
