<script setup lang="ts">
import { useClockStore } from './clock';
import Clockface from './Clockface.vue';

const clock = useClockStore();
</script>

<template>
  <div class="">
    <Clockface />
  </div>
</template>
