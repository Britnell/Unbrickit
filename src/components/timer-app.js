class TimerApp extends HTMLElement {
  constructor() {
    super();
  }
  connectedCallback() {
    this.innerHTML = `
  <div x-data="timer"
    class="absolute inset-0 flex flex-col items-center justify-center"
    :style="{color: colors.text, background: colors.bg}">
    <button @click="page = 'clock'" class="absolute top-2 right-2 p-2 text-2xl hover:opacity-70">×</button>


    <!-- Running Timer -->
    <div x-show="isRunning" class="contents">
      <h2 class="text-2xl mb-4">
        <span x-text="remainingTime > 0 ? 'Timer' : 'Times up!' "></span>
      </h2>
      <span class="text-8xl font-mono font-bold tracking-wider mb-4" x-text="displayTime">
      </span>

    </div>

    <!-- Set timer -->
    <div x-show="!isRunning" class="contents">
      <h2 class="text-xl mb-4">Set Timer</h2>

      <div class="flex items-center justify-center space-x-4">
        <!-- hr -->
        <div class="">
          <button @click="incrementHours()" class="w-12 h-12 rounded-full hover:bg-white/20 text-2xl">
            +
          </button>
          <div class="text-4xl font-mono font-bold my-2" x-text="hours.toString().padStart(2, '0')"></div>
          <button @click="decrementHours()" class="w-12 h-12 rounded-full hover:bg-white/20 text-2xl">
            −
          </button>
        </div>

        <div class="text-4xl font-bold">:</div>

        <!-- min -->
        <div class="">
          <button @click="incrementMinutes()" class="w-12 h-12 rounded-full hover:bg-white/20 text-2xl">
            +
          </button>
          <div class="text-4xl font-mono font-bold my-2" x-text="minutes.toString().padStart(2, '0')">
          </div>
          <button @click="decrementMinutes()" class="w-12 h-12 rounded-full hover:bg-white/20 text-2xl">
            −
          </button>
        </div>
      </div>

      <div>
        <span> hr : min</span>
      </div>
    </div>


    <!-- Start stop -->
    <button @click="toggleTimer()" class="mt-10 px-8 py-3 rounded-lg border"
      :style="{ 'border-color': colors.text }" x-text="isRunning ? 'Stop' : 'Start'">
    </button>

  </div>
    
    `;
  }
}

customElements.define('timer-app', TimerApp);

export default TimerApp;
