class ClockFace extends HTMLElement {
  constructor() {
    super();
  }
  connectedCallback() {
    this.innerHTML = `
    <div x-ref="clock" x-data="clock" class="absolute inset-0 flex items-center justify-center overflow-hidden"
        :style="{color: colors.text, background: colors.bg}">
        <!-- clock -->
        <span x-show="fonts.includes(theme)" x-text="time.string"
          :style="{fontSize: \`\${fontSize}vw\`, fontWeight: fontWeight}" :class="\`font-\${theme}\`"
          class="select-none leading-none "
          ></span>
      </div>
    `;
  }
}

customElements.define('clock-face', ClockFace);

export default ClockFace;
