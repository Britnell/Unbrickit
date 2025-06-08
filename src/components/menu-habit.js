class HabitMenu extends HTMLElement {
  constructor() {
    super();
  }
  connectedCallback() {
    this.innerHTML = `

  <div class="col-span-full">
    <button @click="menu = ''" class="px-2 py-1 hover:bg-[#fff5]">←📊 habit </button>
  </div>

  <form @submit.prevent="saveHabit($event,editHabit)">
    <ul>
      <template x-for="[id,habit] in Object.entries(habits)" :key="id">
        <li>
          <div x-show="editHabit !== id" class="flex items-center gap-2 ">
            <span :style="{background: habit.color}" class="size-4 rounded-full"></span>
            <span x-text="habit.name" class="grow"></span>
            <button type="button" @click="editHabit = id" class=" underline">Edit</button>
          </div>
          <template x-if="editHabit === id">
            <div class="flex items-center gap-2 ">
              <input name="habitcolor" type="color" class="p-0 size-8 border-none" :value="habit.color" />
              <input name="habitname" required :value="habit.name" class=" col-span-2 bg-[#fff5]" />
              <button type="button" class=" underline" @click="editHabit = ''">cancel</button>
              <button type="submit" class=" underline">Save</button>
            </div>
          </template>
        </li>
      </template>
      <template x-if="editHabit === 'new'">
        <li>
          <div class="flex items-center gap-2 ">
            <input name="habitcolor" type="color" class="p-0 size-8 border-none" value="#0077ff" />
            <input name="habitname" required class=" col-span-2 bg-[#fff5]" />
            <button type="button" class=" underline" @click="editHabit = ''">cancel</button>
            <button type="submit" class=" underline">Save</button>
          </div>
        </li>
      </template>
      <li>
        <button type="button" class="underline" @click="editHabit = 'new'">add new</button>
      </li>
    </ul>

  </form>

  <div class="mb-4">
    <label class="flex items-center gap-2">
      <input type="checkbox" x-model="showHabitWidget" class="rounded">
      <span>Show Habit Widget</span>
    </label>
  </div>
  

    `;
  }
}

customElements.define('menu-habit', HabitMenu);

export default HabitMenu;
