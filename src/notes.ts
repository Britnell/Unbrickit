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

  notes.forEach((note, index) => {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = noteToFrequency(note.note);
    oscillator.type = 'sine';

    const startTime = audioContext.currentTime + index * staggerDelay;
    const duration = note.duration || 2.0;

    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
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

  const dur = 0.8 + Math.random() * 1;

  playNotes(
    [
      { note: wrapNotes(base, oct), duration: dur },
      {
        note: wrapNotes(third, oct),
        duration: dur,
      },
      { note: wrapNotes(fifth, oct), duration: dur },
      { note: wrapNotes(seventh, oct), duration: dur },
    ],
    0.3,
  );
}
