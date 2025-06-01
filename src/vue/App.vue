<script setup lang="ts">
import { useClockStore } from './clock';
import Clockface from './Clockface.vue';
import Clockmenu from './Clockmenu.vue';

const clock = useClockStore();
</script>

<template>
  <div class="relative h-screen">
    <Clockface />
    <Clockmenu />
  </div>
</template>
