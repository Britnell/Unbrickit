class AlarmApp extends HTMLElement {
  constructor() {
    super();
  }
  connectedCallback() {
    this.innerHTML = `
  <div class="absolute inset-0 flex flex-col items-center justify-center"
    :style="{color: colors.text, background: colors.bg}">
    <button @click="page = 'clock'" class="absolute top-2 right-2 p-2 text-2xl hover:opacity-70">×</button>

    <!-- Alarm Ringing -->
    <div x-show="isAlarmRinging" class="contents">
      <h2 class="text-2xl mb-4">
        🔔 ALARM!
      </h2>
      <div class="text-6xl font-mono font-bold tracking-wider mb-4" x-text="alarmTime">
      </div>
      <button @click="stopAlarm()" class="mt-6 px-8 py-3 rounded-lg border border-red-500 bg-red-500 text-white">
        Stop Alarm
      </button>
    </div>

    <!-- Alarm Set Display -->
    <div x-show="isAlarmSet && !isAlarmRinging" class="contents">
      <h2 class="text-2xl mb-4">
        Alarm Set
      </h2>
      <div class="text-8xl font-mono font-bold tracking-wider mb-4" x-text="alarmTime">
      </div>
      <div class="text-lg mb-6 opacity-70">
        Alarm will ring at <span x-text="alarmTime"></span>
      </div>
    </div>

    <!-- Set Alarm -->
    <div x-show="!isAlarmSet && !isAlarmRinging" class="contents">
      <h2 class="text-xl mb-4">Set Alarm</h2>

      <div class="flex items-center justify-center space-x-4">
        <!-- hours -->
        <div class="flex flex-col items-center">
          <button @click="incrementHours()" class="w-12 h-12 rounded-full hover:bg-white/20 text-2xl">
            +
          </button>
          <input type="number" 
                 min="0" 
                 max="23" 
                 :value="hours" 
                 @input="setHours($event.target.value)"
                 @blur="validateHours($event.target)"
                 class="text-4xl font-mono font-bold my-2 w-20 text-center bg-transparent border-b-2 border-white/30 focus:border-white/70 focus:outline-none"
                 :style="{color: colors.text, borderColor: colors.text + '50'}"
                 style="appearance: textfield; -moz-appearance: textfield; -webkit-appearance: none;">
          <button @click="decrementHours()" class="w-12 h-12 rounded-full hover:bg-white/20 text-2xl">
            −
          </button>
        </div>

        <div class="text-4xl font-bold">:</div>

        <!-- minutes -->
        <div class="flex flex-col items-center">
          <button @click="incrementMinutes()" class="w-12 h-12 rounded-full hover:bg-white/20 text-2xl">
            +
          </button>
          <input type="number" 
                 min="0" 
                 max="59" 
                 :value="minutes" 
                 @input="setMinutes($event.target.value)"
                 @blur="validateMinutes($event.target)"
                 class="text-4xl font-mono font-bold my-2 w-20 text-center bg-transparent border-b-2 border-white/30 focus:border-white/70 focus:outline-none"
                 :style="{color: colors.text, borderColor: colors.text + '50'}"
                 style="appearance: textfield; -moz-appearance: textfield; -webkit-appearance: none;">
          <button @click="decrementMinutes()" class="w-12 h-12 rounded-full hover:bg-white/20 text-2xl">
            −
          </button>
        </div>
      </div>

      <div class="text-sm opacity-70 mt-2">
        24-hour format
      </div>
    </div>

    <!-- Toggle Alarm Button -->
    <div x-show="!isAlarmRinging" class="contents">
      <button @click="toggleAlarm()" class="mt-10 px-8 py-3 rounded-lg border"
        :style="{ 'border-color': colors.text }" 
        :class="isAlarmSet ? 'bg-green-500 text-white border-green-500' : ''"
        x-text="isAlarmSet ? 'Turn Off Alarm' : 'Set Alarm'">
      </button>
    </div>

  </div>
    `;
  }
}

customElements.define('alarm-app', AlarmApp);

export default AlarmApp;
