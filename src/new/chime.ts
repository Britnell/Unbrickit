import way from './framework';

const chimeTypes = ['jazzy', 'speak', 'chime', 'vibrate'];
const chimeIntervalOptions = '0,1,5,15,20,30,60'.split(',');

way.data('chime', () => {
  const chimeType = way.signal(chimeTypes[0]);
  const lastChime = way.signal<number | null>(null);
  const chimeInterval = way.signal('');

  const onChime = (m: number) => {
    if (lastChime.value == null) {
      lastChime.value = m;
      return;
    }
    if (lastChime.value === m) return;

    const int = parseInt(chimeInterval.value);
    if (isNaN(int)) return;

    if (m % int === 0) {
      lastChime.value = m;
      console.log('chime', chimeType.value);
    }
    //
  };
  return {
    chimeType,
    chimeTypes,
    chimeIntervalOptions,
    chimeInterval,
    onChime,
  };
});
