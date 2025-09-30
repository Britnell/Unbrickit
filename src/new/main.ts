import '../style.css';
import '../fonts.css';

import way from './framework';
import './clock';
import './theme';
import './chime';

const pages = ['clock', 'timer', 'alarm'];

const menuItems = [
  { type: 'placeholder', key: '' },
  { type: 'menu', key: 'theme', label: '🎨 theme' },
  { type: 'menu', key: 'chime', label: '🔔 chime' },
  //   { type: 'menu', key: 'habit', label: '📊 habit' },
  //   { type: 'menu', key: 'radio', label: '📻 radio' },
  //   { type: 'menu', key: 'podcast', label: '🎙️ podcast' },
  //   { type: 'page', key: 'timer', label: '⏱️ timer' },
  //   { type: 'page', key: 'alarm', label: '⏰ alarm' },
];

way.store('app', () => {
  const page = way.signal(pages[0]);
  const showMenu = way.signal(true);
  const menu = way.signal('');

  const openMenu = (it: (typeof menuItems)[0]) => {
    if (it.type === 'menu') {
      menu.value = it.key;
    } else {
      page.value = it.key;
      showMenu.value = false;
    }
  };
  return {
    page,
    pages,
    showMenu,
    menu,
    menuItems,
    openMenu,
  };
});

way.component('menu-theme', () => ({}));
way.component('menu-chime', () => ({}));
way.component('menu-item', (props) => props);

way.render(document.body, window.pageprops);
