import './style.css';
import './fonts.css';
// import component from 'alpinejs-component';
// import logo from './typescript.svg';
import Alpine from 'alpinejs';

// alpine
import './data/app.js';
import './data/clock.js';
import './data/theme.js';
import './data/chime.js';
import './data/system.js';
import './data/habit.js';
import './data/timer.js';
import './data/alarm.js';
import './data/radio.js';
import './data/podcast.js';

// components
import './components/menu-theme.js';
import './components/menu-habit.js';
import './components/menu-chime.js';
import './components/menu-radio.js';
import './components/menu-podcast.js';
import './components/clock-face.js';
import './components/quick-widgets.js';
// import './components/template.js';
import './components/edit-row.js';
import './components/habit-widget.js';
import './components/timer-app.js';
import './components/alarm-app.js';

window.Alpine = Alpine;

// Alpine.plugin(component);

Alpine.start();
