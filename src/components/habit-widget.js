class HabitWidget extends HTMLElement {
  constructor() {
    super();
  }
  connectedCallback() {
    this.innerHTML = `
  <div>
      <div x-show="!openHabit" class=" absolute bottom-2 left-2">
        <button @click="openHabit = Object.values(habits)?.[0]" class="p-3 flex space-x-1 ">
          <template x-for="habit in Object.values(habits)">
            <span :style="{background: habit.color}" class=" size-5 rounded-full grid place-items-center">
              <span x-text="getFulfilledDaysCount(habit.id)" class="text-xs"></span>
            </span>
          </template>
        </button>
      </div>

      <div x-show="openHabit" class="absolute bottom-2 left-2 p-2 bg-[#fff5] rounded max-w-[calc(100vw-1rem)] overflow-auto"
        @click.outside="openHabit = null">
        <div class="flex gap-2 justify-center">
          <template x-for="habit in Object.values(habits)">
            <button @click="openHabit = habit" class="flex gap-1 items-center px-2 py-[0.1rem]"
                :class="openHabit?.id === habit.id ? ' bg-[#fff5]' : ' opacity-60'">
              <span :style="{background: habit.color}" class=" size-5 rounded-full grid place-items-center">
                <span x-text="getFulfilledDaysCount(habit.id)" class="text-xs"></span>
              </span> 
              <span x-text="habit.name"></span>
            </button>
          </template>
        </div>
        <div class="flex gap-2">
          <template x-for="day in habitWeek">
            <div class="flex flex-col items-center text-xs py-1 px-">
              <span x-text="day.date.getDate()" class=" text-gray-600"></span>
              <span x-text="day.day"></span>
              <button @click="toggleHabit(day.date)" class="p-1">
                <span class="size-5 rounded-full grid place-items-center " x-show="day?.habit?.value === 1"
                  :style="{background: openHabit?.color}">
                  1
                </span>
                <span class="size-5 rounded-full grid place-items-center bg-gray-300 "
                  x-show="!day?.habit?.value">0</span>
              </button>
            </div>
          </template>
        </div>
      </div>

  </div>
    `;
  }
}

customElements.define('habit-widget', HabitWidget);

export default HabitWidget;
