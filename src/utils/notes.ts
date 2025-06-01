// Audio note utilities for chiming functionality

const noteMap: Record<string, number> = {
  'C': 0, 'C#': 1, 'DB': 1, 'D': 2, 'D#': 3, 'EB': 3, 'E': 4, 'F': 5,
  'F#': 6, 'GB': 6, 'G': 7, 'G#': 8, 'AB': 8, 'A': 9, 'A#': 10, 'BB': 10, 'B': 11
};

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

export function speakTime(hour: number, minutes: number, voice?: string): void {
  if (!('speechSynthesis' in window)) return;

  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const nextHour = hour12 === 12 ? 1 : hour12 + 1;
  let timeText = 'It is ';

  if (minutes === 0) {
    timeText += `${hour12} o'clock`;
  } else if (minutes === 15) {
    timeText += `quarter past ${hour12}`;
  } else if (minutes === 30) {
    timeText += `half past ${hour12}`;
  } else if (minutes === 45) {
    timeText += `quarter to ${nextHour}`;
  } else if (minutes < 40) {
    const mins = minutes === 1 ? 'minute' : 'minutes';
    timeText += `${minutes} ${mins} past ${hour12}`;
  } else {
    const minutesToNext = 60 - minutes;
    const mins = minutesToNext === 1 ? 'minute' : 'minutes';
    timeText += `${minutesToNext} ${mins} to ${nextHour}`;
  }

  const utterance = new SpeechSynthesisUtterance(timeText);
  utterance.rate = 0.8;
  utterance.pitch = 1;
  utterance.volume = 1;
  utterance.lang = 'en-GB';

  const voices = speechSynthesis.getVoices();
  const goodNews = voices.find((v) => v.name === 'Good News');

  if (voice) {
    const userVoice = voices.find((v) => v.name === voice);
    if (userVoice) utterance.voice = userVoice;
    else if (goodNews) utterance.voice = goodNews;
  } else if (goodNews) {
    utterance.voice = goodNews;
  }

  speechSynthesis.speak(utterance);
}
