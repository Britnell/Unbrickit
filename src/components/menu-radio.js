class MenuRadio extends HTMLElement {
  constructor() {
    super();
  }
  connectedCallback() {
    this.innerHTML = `
<div>
  <button @click="menu = ''">← 📻 Radio</button>
  
  <div class="grid grid-cols-2 gap-2">
      <label for="radio-select" class="col-span-full">Select Radio Station:</label>
      <select id="radio-select" x-model="selectedStation" class="col-span-full">
        <template x-for="name in Object.keys(stations)" :key="name">
          <option :value="name" x-text="name"></option>
        </template>
      </select>

      <div>
        <span x-show="!loading && !playing">Ready</span>
        <span x-show="loading">Loading stream...</span>
        <span x-show="playing && !loading" x-text="\`🔴 \${playingStation} live\`"></span>
      </div>

      <button @click="toggleRadio()" class="button" :disabled="loading" >
        <span x-show="playing">Stop</span>
        <span x-show="!playing">Play</span>
      </button>
      
      <p x-show="error" x-text="error"></p>
      
  </div>
  
</div>`;
  }
}

customElements.define('menu-radio', MenuRadio);

export default MenuRadio;
