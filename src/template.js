import Alpine from 'alpinejs';

class TemplateComp extends HTMLElement {
  constructor() {
    super();
  }
  connectedCallback() {
    this.style.display = 'contents';

    const tempId = this.getAttribute('template');
    const temp = document.getElementById(tempId);
    if (!temp) {
      this.innerHTML = `<span>Template ${tempId} not found</span>`;
      return;
    }

    const slot = this.innerHTML;

    let html = temp.innerHTML;
    html = html.replace('$SLOT', slot);
    this.innerHTML = html;

    Alpine.initTree(this);
  }
}

customElements.define('x-template', TemplateComp);

export default TemplateComp;
