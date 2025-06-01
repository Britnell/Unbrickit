<script setup lang="ts">
import { useClockStore } from './clock';

const clock = useClockStore();
</script>

<template>
  <div class="x">
    {{ clock.time?.string }}
  </div>
</template>
