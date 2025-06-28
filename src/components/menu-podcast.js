class MenuRadio extends HTMLElement {
  constructor() {
    super();
  }
  connectedCallback() {
    this.innerHTML = `
<div class="p-4 space-y-2">
  <button @click="menu = ''" class="px-2 py-1 hover:bg-[#fff5]">← 🎙️ Podcast</button>

  <a href="https://www.bbc.co.uk/programmes/b006qnmr" target="_blank">
    <h3 class="text-lg font-semibold text-center">
      Desert Island Discs
    </h3>
  </a>

  <button @click="loadRandomEpisode()" :disabled="loading"
    class="w-full px-4 py-2  rounded bg-[#fff8] hover:bg-[#fff5] disabled:bg-none"
    :class="loading ? 'opacity-50 cursor-not-allowed' : ''">
    <span x-show="!loading">🎲 Load Random Episode</span>
    <span x-show="loading">Loading...</span>
  </button>

  <div x-show="episodeAudio" class="space-y-2">
    <div class="text-sm flex gap-4 flex-wrap justify-between">
      <strong>Current Episode:</strong>
      <a :href="episodeUrl" target="_blank" class="hover:underline">
        <span x-text="episodeTitle"></span>
      </a>
    </div>

    <div class="flex items-center justify-center gap-2">
      <button @click="seekBackward()" :disabled="!episodeAudio"
        class="flex items-center justify-center whitespace-nowrap bg-[#fff6] rounded-full px-3 h-10">
        « 15s
      </button>

      <button @click="togglePlayback()" :disabled="!episodeAudio"
        class="flex items-center justify-center whitespace-nowrap bg-[#fff6] rounded-full w-10 h-10">
        <span x-text="playingPodcast ? '||' : '►'"></span>
      </button>

      <button @click="seekForward()" :disabled="!episodeAudio"
        class="flex items-center justify-center whitespace-nowrap bg-[#fff6] rounded-full px-3 h-10">
        30s »
      </button>
    </div>
  </div>

  <p x-show="error" class=" bg-red-500/40 text-white" x-text="error"></p>


</div>
    `;
  }
}

customElements.define('menu-podcast', MenuRadio);

export default MenuRadio;
