class MyClock extends HTMLElement {
  constructor() {
    super();
  }
  connectedCallback() {
    this.innerHTML = `
    <div x-ref="clock" x-data="clock" class="absolute inset-0 grid place-items-center"
        :style="{color: colors.text, background: colors.bg}">
        <!-- clock -->
        <span x-show="fonts.includes(theme)" x-text="time.string"
          :style="{fontSize: \`\${fontSize}vw\`, fontWeight: fontWeight}" :class="\`font-\${theme}\`"
          class="select-none leading-none"
          ></span>
      </div>
    `;
  }
}

customElements.define('my-clock', MyClock);

export default MyClock;
