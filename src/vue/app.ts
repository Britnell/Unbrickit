import { createPinia } from 'pinia';
import type { App } from 'vue';
import '../global.css';

const pinia = createPinia();

export default (app: App) => {
  app.use(pinia);
};
