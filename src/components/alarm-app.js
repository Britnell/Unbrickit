class AlarmApp extends HTMLElement {
  constructor() {
    super();
  }
  connectedCallback() {
    this.innerHTML = `
  <div class="absolute inset-0 flex flex-col items-center justify-center"
    :style="{color: colors.text, background: colors.bg}">
    <button @click="page = 'clock'" class="absolute top-2 right-2 p-2 text-2xl hover:opacity-70">×</button>

    <!-- Alarm Set Display -->
    <div x-show="isAlarmSet && !isAlarmRinging" class="contents">
      <h2 class="text-2xl mb-4">
        Alarm Set
      </h2>
      <div class="text-8xl font-mono font-bold tracking-wider mb-4" x-text="alarmTimeString">
      </div>
    </div>

    <!-- Set Alarm -->
    <div x-show="!isAlarmSet && !isAlarmRinging" class="contents">
      <h2 class="text-xl mb-4">Set Alarm</h2>

      <div class="flex items-center justify-center space-x-4 mb-2">
        <!-- hours -->
        <div class="flex flex-col items-center">
          <input type="number" 
                 x-model="alarmHours"
                 class="text-4xl font-mono font-bold w-20 text-center bg-transparent border-none"
                 :style="{color: colors.text, borderColor: colors.text + '50'}" >
        </div>

        <div class="text-4xl font-bold">:</div>

        <!-- minutes -->
        <div class="flex flex-col items-center">
          <input type="number" 
                 x-model="alarmMinutes"
                 class="text-4xl font-mono font-bold w-20 text-center bg-transparent border-none"
                 :style="{color: colors.text, borderColor: colors.text + '50'}" >
        </div>
      </div>

      <span class="text-sm opacity-70">
        24-hour format
      </span>

      <!-- Alarm Type Dropdown -->
      <div class="my-4">
        <label for="alarmType" class="block text-sm opacity-70 mb-2">Alarm Type</label>
        <select x-model="alarmType" 
                id="alarmType"
                @change="saveAlarmState()"
                class="px-4 py-2 rounded-lg bg-transparent border"
                :style="{color: colors.text, borderColor: colors.text }">
          <template x-for="option in alarmOptions" :key="option">
            <option :value="option" x-text="option.charAt(0).toUpperCase() + option.slice(1)"></option>
          </template>
        </select>
      </div>

      
    </div>

    <!-- Toggle Alarm Button -->
    <div x-show="!isAlarmRinging" class="contents">
      <button @click="toggleAlarm()" class="mt-6 px-8 py-3 rounded-lg border"
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
