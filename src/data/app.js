import Alpine from 'alpinejs';

const pages = ['clock', 'timer', 'alarm'];

const menuItems = [
  { type: 'menu', key: 'habit', label: '📊 habit' },
  { type: 'placeholder' },
  { type: 'menu', key: 'radio', label: '📻 radio' },
  { type: 'menu', key: 'podcast', label: '🎙️ podcast' },
  { type: 'page', key: 'timer', label: '⏱️ timer' },
  { type: 'page', key: 'alarm', label: '⏰ alarm' },
  { type: 'menu', key: 'theme', label: '🎨 theme' },
  { type: 'menu', key: 'chime', label: '🔔 chime' },
];

Alpine.data('app', () => ({
  page: pages[0],
  menu: '',
  showMenu: false,
  menuItems,
}));
