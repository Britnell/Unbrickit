<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useClockStore } from './clock';
import { toggleFullscreen, toggleWakeLock } from '../utils/helper';

const clock = useClockStore();
const showMenu = ref(false);
const menuRef = ref<HTMLElement | null>(null);
const availableVoices = ref<SpeechSynthesisVoice[]>([]);
const isFullscreen = ref(false);
const wakeLock = ref<WakeLockSentinel | null>(null);

const loadVoices = () => {
  const voices = speechSynthesis.getVoices();
  if (voices.length) {
    availableVoices.value = voices;
  } else {
    const onVoicesChanged = () => {
      availableVoices.value = speechSynthesis.getVoices();
      speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
    };
    speechSynthesis.addEventListener('voiceschanged', onVoicesChanged);
  }
};

const handleClickOutside = (event: MouseEvent) => {
  const inside = menuRef.value?.contains(event.target as Node);
  if (!inside) {
    showMenu.value = false;
  }

  // if (!menuRef.value?.contains(event.target as Node)) {
  // }
};

const handleToggleFullscreen = async () => {
  isFullscreen.value = await toggleFullscreen();
};

const handleToggleWakeLock = async () => {
  wakeLock.value = await toggleWakeLock(wakeLock.value);
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
  loadVoices();
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<template>
  <div ref="menuRef" class="" @keydown.escape="showMenu = false">
    <!-- Menu Toggle Button -->
    <button
      @click="showMenu = !showMenu"
      :aria-expanded="showMenu"
      aria-haspopup="true"
      class="absolute top-3 right-3 p-4 text-xl bg-transparent border-none transition-transform z-10"
      :style="{ color: clock.colors.textColor }"
      aria-label="Settings menu"
    >
      ...
    </button>

    <!-- Menu Popup -->
    <div
      v-if="showMenu"
      class="absolute w-[calc(100%-2rem)] max-w-[60ch] top-4 right-4 overflow-auto"
      role="menu"
      aria-orientation="vertical"
      aria-labelledby="menu-button"
      tabindex="-1"
    >
      <div class="bg-[#fff8] rounded-lg shadow-lg p-3">
        <div class="text-xs text-gray-600 grid grid-cols-2 gap-4">
          <!-- Font Settings -->
          <div v-show="clock.shufflePeriod === '0'" class="space-y-2">
            <h2 class="font-bold block">Font</h2>

            <!-- Theme Selector -->
            <div>
              <label for="theme-select" class="block">Theme:</label>
              <select
                id="theme-select"
                v-model="clock.theme"
                class="w-full px-2 py-1 border border-gray-600 rounded-md bg-transparent"
              >
                <option v-for="theme in clock.themes" :key="theme" :value="theme">
                  {{ theme.charAt(0).toUpperCase() + theme.slice(1) }}
                </option>
              </select>
            </div>

            <!-- Weight Slider -->
            <div>
              <label for="weight-slider" class="flex justify-between items-center">
                Weight: <span class="font-mono">{{ clock.weight }}</span>
              </label>
              <input
                type="range"
                id="weight-slider"
                v-model.number="clock.weight"
                min="100"
                max="900"
                step="100"
                class="w-full"
              />
            </div>

            <!-- Size Slider -->
            <div>
              <label for="size-slider" class="flex justify-between items-center">
                Size: <span class="font-mono">{{ clock.fontSize }}vw</span>
              </label>
              <input
                type="range"
                id="size-slider"
                v-model.number="clock.fontSize"
                min="20"
                max="45"
                step="1"
                class="w-full"
              />
            </div>
          </div>

          <!-- Color Settings -->
          <div v-show="clock.shufflePeriod === '0'" class="space-y-2">
            <h2 class="font-bold block">Color</h2>
            <!-- Color Mode -->
            <div>
              <label for="color-mode" class="block">Color Mode</label>
              <select
                id="color-mode"
                v-model="clock.colorMode"
                class="w-full px-2 py-1 border border-gray-600 rounded-md bg-transparent"
              >
                <option v-for="mode in clock.colorModes" :key="mode" :value="mode">
                  {{ mode }}
                </option>
              </select>
            </div>

            <!-- Hue Slider -->
            <div>
              <label for="hue-slider" class="flex justify-between items-center">
                Hue: <span class="font-mono">{{ clock.hue }}°</span>
              </label>
              <input
                type="range"
                id="hue-slider"
                v-model.number="clock.hue"
                min="0"
                max="360"
                step="1"
                class="w-full"
              />

              <!-- Dark Mode Toggle -->
              <div class="flex gap-2 items-center mt-2">
                <input type="checkbox" id="dark-mode" v-model="clock.darkMode" class="rounded border-gray-600" />
                <label for="dark-mode">Invert colors</label>
              </div>
            </div>
          </div>

          <!-- Chime Section -->
          <div class="space-y-2">
            <h2 class="font-bold block">Periodic</h2>
            <!-- Shuffle -->
            <div class="flex flex-col gap-1">
              <label for="shuffle-select">Shuffle mode:</label>
              <select
                id="shuffle-select"
                v-model="clock.shufflePeriod"
                class="w-full px-2 py-1 border border-gray-600 rounded-md bg-transparent"
              >
                <option value="0">off</option>
                <option v-for="period in clock.shufflePeriodOptions.slice(1)" :key="period" :value="period">
                  {{ period }} min
                </option>
              </select>
            </div>

            <!-- Chime -->
            <div class="flex flex-col gap-1">
              <label for="chime-interval">Chime interval:</label>
              <select
                id="chime-interval"
                v-model="clock.chimeInterval"
                class="w-full px-2 py-1 border border-gray-600 rounded-md bg-transparent"
              >
                <option value="0">off</option>
                <option v-for="interval in clock.intervalOptions.slice(1)" :key="interval" :value="interval">
                  {{ interval }} min
                </option>
              </select>
            </div>

            <!-- Chime Type -->
            <div v-show="clock.chimeInterval !== '0'" class="flex flex-col gap-1">
              <label for="chime-type">Chime type:</label>
              <select
                id="chime-type"
                v-model="clock.chimeType"
                class="w-full px-2 py-1 border border-gray-600 rounded-md bg-transparent"
              >
                <option v-for="ch in clock.chimeOptions" :key="ch" :value="ch">
                  {{ ch.charAt(0).toUpperCase() + ch.slice(1) }}
                </option>
              </select>
            </div>

            <!-- Voice Selection -->
            <div v-show="clock.chimeInterval !== '0' && clock.chimeType === 'speak'" class="flex flex-col gap-1">
              <label for="voice-select">Voice:</label>
              <select
                id="voice-select"
                v-model="clock.voice"
                class="w-full px-2 py-1 border border-gray-600 rounded-md bg-transparent text-xs"
              >
                <option v-for="voice in availableVoices" :key="voice.name" :value="voice.name">
                  {{ voice.name }} ({{ voice.lang }})
                </option>
              </select>
            </div>
          </div>

          <!-- App Section -->
          <div class="space-y-2">
            <h2 class="font-bold block">App</h2>
            <div class="space-y-2">
              <button
                class="w-full px-2 py-1 border border-gray-600 rounded-md text-left"
                @click="handleToggleFullscreen"
              >
                {{ isFullscreen ? 'Exit Fullscreen' : 'Enable Fullscreen' }}
              </button>
              <button
                class="w-full px-2 py-1 border border-gray-600 rounded-md text-left"
                @click="handleToggleWakeLock"
              >
                {{ wakeLock ? 'Release screen lock' : 'Keep screen unlocked' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
