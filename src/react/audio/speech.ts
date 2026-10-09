export function timeText(hour: number, minutes: number): string {
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const nextHour = hour12 === 12 ? 1 : hour12 + 1;
  let text = 'It is ';

  if (minutes === 0) {
    text += `${hour12} o'clock`;
  } else if (minutes === 15) {
    text += `quarter past ${hour12}`;
  } else if (minutes === 30) {
    text += `half past ${hour12}`;
  } else if (minutes === 45) {
    text += `quarter to ${nextHour}`;
  } else if (minutes < 40) {
    const mins = minutes === 1 ? 'minute' : 'minutes';
    text += `${minutes} ${mins} past ${hour12}`;
  } else {
    const minutesToNext = 60 - minutes;
    const mins = minutesToNext === 1 ? 'minute' : 'minutes';
    text += `${minutesToNext} ${mins} to ${nextHour}`;
  }
  return text;
}

export function speakTime(hour: number, minutes: number, voice?: string): void {
  if (!('speechSynthesis' in window)) return;
  const timeSpoken = timeText(hour, minutes);
  const utterance = new SpeechSynthesisUtterance(timeSpoken);
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

export function isHapticFeedbackAvailable(): boolean {
  return 'vibrate' in navigator;
}

export function buzzz(pattern: number | number[]): boolean {
  if (!isHapticFeedbackAvailable()) return false;
  try {
    navigator.vibrate(pattern);
    return true;
  } catch {
    return false;
  }
}

export function speak(text: string, voice?: string): void {
  if (!('speechSynthesis' in window)) return;

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.8;
  utterance.pitch = 1;
  utterance.volume = 1;
  utterance.lang = 'en-GB';

  const voices = speechSynthesis.getVoices();
  // const goodNews = voices.find((v) => v.name === 'Good News');

  if (voice) {
    const userVoice = voices.find((v) => v.name === voice);
    if (userVoice) utterance.voice = userVoice;
  }

  speechSynthesis.speak(utterance);
}
