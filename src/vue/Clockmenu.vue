<script setup lang="ts">
import { ref } from 'vue';
import { useClockStore } from './clock';

const showMenu = ref(true);
const clock = useClockStore();
</script>

<template>
  <button @click="showMenu = !showMenu" class="">...</button>
  <div v-if="showMenu" class="">
    <div class="">
      <h3>Theme</h3>
      <select v-model="clock.theme" class="">
        <option v-for="theme in clock.themes" :key="theme" :value="theme">
          {{ theme }}
        </option>
      </select>
    </div>

    <div class="">
      <h3>Size: {{ clock.fontSize }}</h3>
      <input type="range" v-model.number="clock.fontSize" min="10" max="60" step="1" class="" />
    </div>

    <div class="">
      <h3>Weight: {{ clock.weight }}</h3>
      <input type="range" v-model.number="clock.weight" min="100" max="900" step="100" class="" />
    </div>

    <div class="">
      <h3>Color Mode</h3>
      <select v-model="clock.colorMode" class="">
        <option v-for="mode in clock.colorModes" :key="mode" :value="mode">
          {{ mode }}
        </option>
      </select>
    </div>

    <div class="">
      <h3>Hue: {{ clock.hue }}°</h3>
      <input type="range" v-model.number="clock.hue" min="0" max="360" step="1" class="" />
    </div>
  </div>
</template>
