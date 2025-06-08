import './style.css';
// import component from 'alpinejs-component';
// import logo from './typescript.svg';
import Alpine from 'alpinejs';
import './data/clock.js';
import './data/theme.js';
import './menu-theme.js';
import './menu-habit.js';
import './menu-chime.js';
import './my-clock.js';
import './data/chime.js';
import './data/system.js';
import './data/habit.js';
import './template.js';
import './edit-row.js';

window.Alpine = Alpine;

// Alpine.plugin(component);

Alpine.start();
