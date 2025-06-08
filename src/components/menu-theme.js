class MenuTheme extends HTMLElement {
  constructor() {
    super();
  }
  connectedCallback() {
    this.innerHTML = `
<div class="grid grid-cols-2 gap-y-1 gap-x-2">
    <div class=" col-span-full">
      <button @click="menu = ''" class="px-2 py-1 hover:bg-[#fff5]">← 🎨 Theme </button>
    </div>

    <!-- Shuffle -->
    <div class="contents">
      <label for="shuffle-period-select" class="flex justify-between items-center"> Shuffle Period </label>
      <select id="shuffle-period-select" x-model="shufflePeriod"
        class="w-full px-2 py-1 border border-gray-600 rounded-md bg-transparent"
        x-init="$nextTick(() => { $el.value = shufflePeriod })">
        <template x-for="period in shufflePeriodOptions" :key="period">
          <option :value="period" x-text="period === '0' ? 'Off' : \`\${period} min\`"></option>
        </template>
      </select>
    </div>

    <!-- shuffle style -->
    <div class="contents" x-show="shufflePeriod !== '0'">
      <label for="shuffle-style-select" class="flex justify-between items-center"> Shuffle Style </label>
      <select id="shuffle-style-select" x-model="shuffleStyle"
        class="w-full px-2 py-1 border border-gray-600 rounded-md bg-transparent"
        x-init="$nextTick(() => { $el.value = shuffleStyle })">
        <template x-for="style in shuffleStyleOptions" :key="style">
          <option :value="style" x-text="style"></option>
        </template>
      </select>
    </div>

    <!-- Font -->
    <div class="contents" x-show="showMenuSection('font')">
      <label for="font-select" class="flex justify-between items-center"> Font </label>
      <select id="font-select" x-model="theme"
        class="w-full px-2 py-1 border border-gray-600 rounded-md bg-transparent"
        x-init="$nextTick(() => { $el.value = theme })">
        <template x-for="f in themes" :key="f">
          <option :value="f" x-text="f.charAt(0).toUpperCase() + f.slice(1)"></option>
        </template>
      </select>
    </div>

    <!-- Weight Slider -->
    <div class="contents" x-show="showMenuSection('font')">
      <label for="weight-slider" class="flex justify-between items-center">
        Weight
      </label>
      <span x-text="fontWeight" class="font-mono"></span>
      <input type="range" id="weight-slider" x-model="fontWeight" min="100" max="900" step="100"
        class="col-span-full" />
    </div>

    <!-- hue -->
    <div class="contents" x-show="showMenuSection('hue')">
      <label for="hue-slider" class="flex justify-between items-center">
        Hue
      </label>
      <span x-text="hue + '°'" class="font-mono"></span>
      <input type="range" id="hue-slider" x-model="hue" min="0" max="360" step="1" class=" col-span-full" />
    </div>


    <!-- Dark Mode Checkbox -->
    <div class=" col-span-full flex items-center" x-show="showMenuSection('color')">
      <input type="checkbox" id="darkmode-checkbox" x-model="darkMode" class="mr-2">
      <label for="darkmode-checkbox">Dark Mode</label>
    </div>

    <!-- Color Mode Dropdown -->
    <div class="contents" x-show="showMenuSection('color')">
      <label for="colormode-select" class="flex justify-between items-center"> Color Mode </label>
      <select id="colormode-select" x-model="colorMode"
        class="w-full px-2 py-1 border border-gray-600 rounded-md bg-transparent"
        x-init="$nextTick(() => { $el.value = colorMode })">
        <template x-for="cm in colorModes" :key="cm">
          <option :value="cm" x-text="cm.charAt(0).toUpperCase() + cm.slice(1)"></option>
        </template>
      </select>
    </div>

    <!-- Size Slider -->
    <div class="contents">
      <label for="size-slider" class="flex justify-between items-center">
        Size
      </label>
      <span x-text="fontSize + 'vw'" class="font-mono"></span>
      <input type="range" id="size-slider" x-model="fontSize" min="20" max="45" step="1" class="col-span-full" />
    </div>

  </div>`;
  }
}

customElements.define('menu-theme', MenuTheme);

export default MenuTheme;
