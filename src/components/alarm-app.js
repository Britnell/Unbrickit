class AlarmApp extends HTMLElement {
  constructor() {
    super();
  }
  connectedCallback() {
    this.innerHTML = `
  <div class="absolute inset-0 flex flex-col items-center justify-center"
    :style="{color: colors.text, background: colors.bg}">
    <div x-show="!isAlarmRinging" class=" max-w-[400px] contents">
      <button @click="page = 'clock'" class="absolute top-2 right-2 p-2 text-2xl hover:opacity-70">×</button>

      <!-- Alarm Set Display -->
      <div x-show="isAlarmSet" class="contents">
        <h2 class="text-2xl mb-4">
          Alarm Set
        </h2>
        <div class="text-8xl font-mono font-bold tracking-wider mb-4" x-text="alarmTimeString">
        </div>
      </div>

      <!-- Set Alarm -->
      <div x-show="!isAlarmSet" class="contents">
        <h2 class="text-xl mb-4">Set Alarm</h2>

        <div class="flex items-center justify-center gap-4 mb-2">
        
          <!-- hours -->
          <input type="number" 
              x-model="alarmHours"
              class="!w-20 text-4xl font-mono font-bold text-center bg-transparent border-none"
              :style="{color: colors.text, borderColor: colors.text + '50'}" >

          <div class="text-4xl font-bold">:</div>

          <!-- minutes -->
          <input type="number" 
              x-model="alarmMinutes"
              class="!w-20 text-4xl font-mono font-bold text-center bg-transparent border-none"
              :style="{color: colors.text, borderColor: colors.text + '50'}" >
        </div>

        <span class="text-sm opacity-70">
          24-hour format
        </span>
      </div>

      <!-- Alarm Type Dropdown -->
      <div class="my-4">
        <label for="alarmType" class="block text-sm opacity-70 mb-2">Alarm Type</label>
        <select x-model="alarmType" 
                id="alarmType"
                @change="saveAlarmState()"
                class="px-4 py-2 rounded-lg bg-transparent border"
                :style="{color: colors.text, borderColor: colors.text }" 
                x-init="$nextTick(() => { $el.value = alarmType })">
                >
          <template x-for="option in alarmOptions" :key="option">
            <option :value="option" x-text="option.charAt(0).toUpperCase() + option.slice(1)"></option>
          </template>
        </select>
      </div>

      <!-- Toggle Alarm Button -->
      <div class="contents">
        <button @click="toggleAlarm()" class="mt-6 px-8 py-3 rounded-lg border"
          :style="{ 'border-color': colors.text }" 
          x-text="isAlarmSet ? 'Turn Off' : 'Turn On'">
        </button>
      </div>
  
  </div>

    <div x-show="isAlarmRinging" class=" max-w-[400px] contents">
      <h2>Time's up!</h2>
      <button @click="stopAlarm()" class="text-2xl bg-[#fff5] rounded p-2">Stop</button>
    </div>
</div>
    `;
  }
}

customElements.define('alarm-app', AlarmApp);

export default AlarmApp;
