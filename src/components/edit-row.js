// import Alpine from 'alpinejs';

class EditRow extends HTMLElement {
  constructor() {
    super();
  }
  connectedCallback() {
    this.style.display = 'contents';

    console.log(this);

    const name = this.getAttribute('name') ?? '';
    const color = this.getAttribute('color') ?? '#0077ff';
    this.innerHTML = `
<div class="flex items-center gap-2 ">
    <input name="habitcolor" type="color" class="p-0 size-8 border-none" value="${color}" />
    <input name="habitname" required value="${name}" class=" col-span-2 bg-[#fff5]" />
    <button type="button" class=" underline" @click="editHabit = ''">cancel</button>
    <button type="submit" class=" underline">Save</button>
</div>`;
  }
}

customElements.define('edit-row', EditRow);

export default EditRow;
