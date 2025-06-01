import { createPinia } from 'pinia';
import type { App } from 'vue';
import '../styles/global.css';

const pinia = createPinia();

export default (app: App) => {
  app.use(pinia);
};
