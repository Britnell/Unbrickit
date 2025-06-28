class AlarmWidget extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.innerHTML = `
<div x-show="page === 'clock'" class="absolute bottom-2 right-2 flex gap-2">

  <button x-show="playingRadio" @click="showMenu = true, menu='radio'"
    class="px-2 py-1 bg-[#fff5] rounded-full flex items-center space-x-2 shadow-lg ">
    <span class="text-lg">📻</span>
  </button>


  <button x-show="playingPodcast" @click="showMenu = true, menu='podcast'"
    class="px-2 py-1 bg-[#fff5] rounded-full flex items-center space-x-2 shadow-lg ">
    <span class="text-lg">🎙️</span>
  </button>

  <button x-show="isRunning" @click="page='timer'"
    class="px-2 py-1 bg-[#fff5] rounded-full flex items-center space-x-2 shadow-lg">
    <span class="text-lg">⏱️</span>
    <span x-text="displayTime" class="text-xs font-mono"></span>
  </button>

  <button x-show="isAlarmSet" @click="page='alarm'"
    class="px-2 py-1 bg-[#fff5] rounded-full flex items-center space-x-2 shadow-lg ">
    <span class="text-lg">⏰</span>
    <!-- <span x-text="alarmTime" class="text-xs font-mono"></span> -->
  </button>

</div>
      `;
  }
}

customElements.define('quick-widgets', AlarmWidget);

export default AlarmWidget;
