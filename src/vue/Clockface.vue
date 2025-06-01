<script setup lang="ts">
import { computed } from 'vue';
import { useClockStore } from './clock';

const clock = useClockStore();

const colors = computed(() => {
  const h = clock.hue;
  let bgColor, textColor;

  if (clock.colorMode === 'pastel') {
    bgColor = `hsl(${h}, 100%, 85%)`;
    textColor = `hsl(${(h + 360 - 25) % 360}, 60%, 35%)`;
  } else if (clock.colorMode === 'colourful') {
    bgColor = `hsl(${h}, 100%, 70%)`;
    textColor = `hsl(${(h + 360 - 55) % 360}, 60%, 35%)`;
  } else { // B&W
    bgColor = `hsl(${h}, 0%, 95%)`;
    textColor = `hsl(${h}, 0%, 10%)`;
  }

  return { bgColor, textColor };
});
</script>

<template>
  <div class="h-screen w-full flex items-center justify-center transition-colors duration-300" :style="{ backgroundColor: colors.bgColor }">
    <span 
      v-if="clock.fonts.includes(clock.theme)" 
      :class="[clock.theme ? `font-${clock.theme}` : '']"
      :style="{
        fontSize: `${clock.fontSize}vw`,
        fontWeight: clock.weight,
        lineHeight: 1,
        color: colors.textColor,
        transition: 'color 0.3s, background-color 0.3s'
      }"
    >
      {{ clock.time?.string }}
    </span>
    <div v-else class="text-4xl" :style="{ color: colors.textColor }">SVG theme not implemented</div>
  </div>
</template>

<style scoped>
.font-system {
  font-family: system-ui, sans-serif;
}
.font-transitional {
  font-family: Charter, 'Bitstream Charter', 'Sitka Text', Cambria, serif;
}
.font-old-style {
  font-family: 'Iowan Old Style', 'Palatino Linotype', 'URW Palladio L', P052, serif;
}
.font-humanist {
  font-family: Seravek, 'Gill Sans Nova', Ubuntu, Calibri, 'DejaVu Sans', source-sans-pro, sans-serif;
}
.font-geometric {
  font-family: Avenir, Montserrat, Corbel, 'URW Gothic', source-sans-pro, sans-serif;
}
.font-classical {
  font-family: Optima, Candara, 'Noto Sans', source-sans-pro, sans-serif;
}
.font-neo-grotesque {
  font-family: Inter, Roboto, 'Helvetica Neue', 'Arial Nova', 'Nimbus Sans', Arial, sans-serif;
}
.font-mono-serif {
  font-family: 'Nimbus Mono PS', 'Courier New', monospace;
}
.font-industrial {
  font-family: Bahnschrift, 'DIN Alternate', 'Franklin Gothic Medium', 'Nimbus Sans Narrow', sans-serif-condensed,
    sans-serif;
}
.font-rounded {
  font-family: ui-rounded, 'Hiragino Maru Gothic ProN', Quicksand, Comfortaa, Manjari, 'Arial Rounded MT',
    'Arial Rounded MT Bold', Calibri, source-sans-pro, sans-serif;
}
.font-serif {
  font-family: Rockwell, 'Rockwell Nova', 'Roboto Slab', 'DejaVu Serif', 'Sitka Small', serif;
}
.font-antique {
  font-family: Superclarendon, 'Bookman Old Style', 'URW Bookman', 'URW Bookman L', 'Georgia Pro', Georgia, serif;
}
.font-didone {
  font-family: Didot, 'Bodoni MT', 'Noto Serif Display', 'URW Palladio L', P052, Sylfaen, serif;
}
</style>
