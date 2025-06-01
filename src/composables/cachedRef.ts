import { ref, watch } from 'vue';

type CachedRefType = string | number;

export function cachedRef(key: string, initialValue: CachedRefType = '') {
  const storedValue = localStorage.getItem(key);

  let parsedValue: CachedRefType = initialValue;

  if (storedValue !== null) {
    if (typeof initialValue === 'number') {
      const x = Number(storedValue);
      if (!isNaN(x)) {
        parsedValue = x;
      }
    } else {
      parsedValue = storedValue;
    }
  }

  const value = ref<CachedRefType>(parsedValue);

  watch(
    value,
    (newValue) => {
      localStorage.setItem(key, newValue.toString());
    },
    { immediate: true },
  );

  return value;
}
