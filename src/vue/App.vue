<script setup lang="ts">
import { ref } from 'vue';
import { useClockStore } from './clock';
import Clockface from './Clockface.vue';
import Clockmenu from './Clockmenu.vue';

const clock = useClockStore();
const showMenu = ref(true);
</script>

<template>
  <div class="relative h-screen">
    <!-- Clock Display -->
    <Clockface />

    <!-- Menu -->
    <div class="absolute w-[calc(100%-2rem)] max-w-[60ch] top-4 right-4 overflow-auto" v-if="showMenu">
      <div class="bg-[#fff8] rounded-lg shadow-lg p-3">
        <Clockmenu />
      </div>
    </div>

    <!-- Menu Toggle Button -->
    <button
      @click="showMenu = !showMenu"
      class="absolute top-3 right-3 p-4 text-xl bg-transparent border-none transition-transform hover:scale-110"
      aria-label="Settings"
      :style="{ color: clock.colors.textColor }"
    >
      ...
    </button>
  </div>
</template>
