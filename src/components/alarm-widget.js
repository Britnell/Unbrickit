class AlarmWidget extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.innerHTML = `
      <div x-show="isAlarmSet" >
        <button @click="page='alarm'" 
                class="px-2 py-1 bg-[#fff5] rounded-full flex items-center space-x-2 shadow-lg "
                >
          <span class="text-lg">⏰</span>
          <!-- <span x-text="alarmTime" class="text-xs font-mono"></span> -->
        </button>
      </div>
      `;
  }
}

customElements.define('alarm-widget', AlarmWidget);

export default AlarmWidget;
