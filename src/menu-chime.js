class ChimeMenu extends HTMLElement {
  constructor() {
    super();
  }
  connectedCallback() {
    this.innerHTML = `
    <div class=" grid grid-cols-2 gap-y-1 gap-x-2">
              <div class="col-span-full">
                <button @click="menu = ''" class="px-2 py-1 hover:bg-[#fff5]">← ⏰ Chime</button>
              </div>


              <!-- Interval -->
              <div class="contents">
                <label for="chime-interval" class="flex justify-between items-center"> Interval </label>
                <select id="chime-interval" x-model="chimeInterval"
                  class="w-full px-2 py-1 border border-gray-600 rounded-md bg-transparent"
                  x-init="$nextTick(() => { $el.value = chimeInterval })">
                  <template x-for="interval in chimeIntervalOptions" :key="interval">
                    <option :value="interval" x-text="interval === '0' ? 'Off' : \`\${interval} min\`"></option>
                  </template>
                </select>
              </div>

              <!-- Type -->
              <div class="contents">
                <label for="chime-type" class="flex justify-between items-center"> Type </label>
                <select id="chime-type" x-model="chimeType"
                  class="w-full px-2 py-1 border border-gray-600 rounded-md bg-transparent"
                  x-init="$nextTick(() => { $el.value = chimeType })">
                  <template x-for="t in chimeTypes" :key="t">
                    <option :value="t" x-text="t"></option>
                  </template>
                </select>
              </div>

              <!-- voices -->
              <div class="contents" x-show="chimeType === 'speak'">
                <label for="voice" class="flex justify-between items-center"> Voice </label>
                <select id="voice" x-model="voice" class="" x-init="$nextTick(() => { $el.value = voice })">
                  <template x-for="v in voices" :key="v.name">
                    <option :value="v.name" x-text="v.name"></option>
                  </template>
                </select>
              </div>
            </div>
            `;
  }
}

customElements.define('menu-chime', ChimeMenu);

export default ChimeMenu;
