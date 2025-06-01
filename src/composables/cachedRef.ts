import { ref, watch } from 'vue';

export function cachedRef<T>(key: string, initialValue: T) {
  const storedValue = localStorage.getItem(key);

  let parsedValue: T = initialValue;

  if (storedValue !== null) {
    if (typeof initialValue === 'number') {
      const x = Number(storedValue);
      if (!isNaN(x)) {
        parsedValue = x as T;
      }
    } else if (typeof initialValue === 'boolean') {
      parsedValue = (storedValue === 'true') as T;
    } else {
      parsedValue = storedValue as T;
    }
  }

  const value = ref<T>(parsedValue);

  watch(
    value,
    (newValue) => {
      localStorage.setItem(key, String(newValue));
    },
    { immediate: true },
  );

  return value;
}
