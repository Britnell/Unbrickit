<script setup lang="ts">
import { useClockStore } from './clock';

const clock = useClockStore();
</script>

<template>
  <div class="text-xs text-gray-600 grid grid-cols-2 gap-4">
    <div class="contents">
      <!-- Font Settings -->
      <div class="space-y-2">
        <h2 class="font-bold block">Font</h2>

        <!-- Theme Selector -->
        <div class="">
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
        <div class="">
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
        <div class="">
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
      <div class="space-y-2">
        <h2 class="font-bold block">Color</h2>

        <!-- Color Mode -->
        <div class="">
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
        <div class="">
          <label for="hue-slider" class="flex justify-between items-center">
            Hue: <span class="font-mono">{{ clock.hue }}°</span>
          </label>
          <input type="range" id="hue-slider" v-model.number="clock.hue" min="0" max="360" step="1" class="w-full" />

          <!-- Dark Mode Toggle -->
          <div class="flex gap-2 items-center mt-2">
            <input type="checkbox" id="dark-mode" v-model="clock.darkMode" class="rounded border-gray-600" />
            <label for="dark-mode">Invert colors</label>
          </div>
        </div>
      </div>
    </div>

    <!-- Chime Section (Placeholder) -->
    <div class="space-y-2">
      <h2 class="font-bold block">Periodic</h2>

      <!-- Shuffle   -->
      <div class="flex flex-col gap-1">
        <label for="shuffle-select" class="">Shuffle mode:</label>
        <select id="shuffle-select" class="w-full px-2 py-1 border border-gray-600 rounded-md bg-transparent" disabled>
          <option>off</option>
        </select>
      </div>

      <!-- chime -->
      <div>
        <label for="interval" class="block">Chime</label>
        <select id="interval" class="w-full px-2 py-1 border border-gray-600 rounded-md bg-transparent" disabled>
          <option>off</option>
        </select>
      </div>
    </div>

    <!-- App Section (Placeholder) -->
    <div class="space-y-2">
      <h2 class="font-bold block">App</h2>
      <div class="space-y-2">
        <button class="w-full px-2 py-1 border border-gray-600 rounded-md text-left" disabled>Fullscreen</button>
        <button class="w-full px-2 py-1 border border-gray-600 rounded-md text-left" disabled>Keep Screen On</button>
      </div>
    </div>
  </div>
</template>
