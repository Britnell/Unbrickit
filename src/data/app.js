import Alpine from 'alpinejs';

const pages = ['clock', 'timer', 'alarm'];

Alpine.data('app', () => ({
  page: pages[0],
  menu: '',
  showMenu: false,
}));
