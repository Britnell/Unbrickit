class TimerWidget extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.innerHTML = `
      <div x-show="isRunning" class="absolute bottom-2 right-2">
        <button @click="page='timer'" 
                class="px-2 py-1 bg-[#fff5] rounded-full flex items-center space-x-2 shadow-lg">
          <span class="text-lg">⏱️</span>
          <span x-text="displayTime" class="text-xs font-mono"></span>
        </button>
      </div>
    `;
  }
}

customElements.define('timer-widget', TimerWidget);
