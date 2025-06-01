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
