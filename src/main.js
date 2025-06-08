import './style.css';
// import component from 'alpinejs-component';
// import logo from './typescript.svg';
import Alpine from 'alpinejs';
import './data/clock.js';
import './data/theme.js';
import './components/menu-theme.js';
import './components/menu-habit.js';
import './components/menu-chime.js';
import './components/my-clock.js';
import './data/chime.js';
import './data/system.js';
import './data/habit.js';
import './components/template.js';
import './components/edit-row.js';

window.Alpine = Alpine;

// Alpine.plugin(component);

Alpine.start();
